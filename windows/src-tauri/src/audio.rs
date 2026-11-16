use crate::{error::Result, state};
use std::{
    ffi::c_void,
    sync::mpsc::{self, RecvTimeoutError, Sender},
    time::Duration,
};
use tauri::AppHandle;
use windows::{
    core::{implement, Interface, PCWSTR, PWSTR},
    Win32::{
        Devices::FunctionDiscovery::PKEY_Device_FriendlyName,
        Foundation::PROPERTYKEY,
        Media::Audio::{
            eConsole, eRender, EDataFlow, ERole,
            Endpoints::{
                IAudioEndpointVolume, IAudioEndpointVolumeCallback,
                IAudioEndpointVolumeCallback_Impl,
            },
            IMMDeviceEnumerator, IMMNotificationClient, IMMNotificationClient_Impl,
            MMDeviceEnumerator, AUDIO_VOLUME_NOTIFICATION_DATA, DEVICE_STATE, DEVICE_STATE_ACTIVE,
        },
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED,
            STGM_READ,
        },
    },
};

/// With no event for this long, everything is read again: an audio service that restarted
/// takes its callbacks with it and says nothing.
const REFRESH: Duration = Duration::from_secs(5);

/// Joins this thread to COM. The result is ignored on purpose: S_FALSE (already joined) and
/// RPC_E_CHANGED_MODE (an STA thread, like Tauri's main thread) both leave COM usable.
pub fn com() {
    let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
}

fn enumerator() -> Result<IMMDeviceEnumerator> {
    Ok(unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? })
}

pub fn endpoint_volume() -> Result<IAudioEndpointVolume> {
    Ok(unsafe {
        enumerator()?
            .GetDefaultAudioEndpoint(eRender, eConsole)?
            .Activate(CLSCTX_ALL, None)?
    })
}

fn take(text: PWSTR) -> Result<String> {
    let s = unsafe { text.to_string() };
    unsafe { CoTaskMemFree(Some(text.0 as *const c_void)) };
    Ok(s?)
}

fn outputs(en: &IMMDeviceEnumerator) -> Result<Vec<state::Output>> {
    let default = take(unsafe { en.GetDefaultAudioEndpoint(eRender, eConsole)?.GetId()? })?;
    let devices = unsafe { en.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)? };
    (0..unsafe { devices.GetCount()? })
        .map(|i| {
            let device = unsafe { devices.Item(i)? };
            let id = take(unsafe { device.GetId()? })?;
            let name = unsafe {
                device
                    .OpenPropertyStore(STGM_READ)?
                    .GetValue(&PKEY_Device_FriendlyName)?
            };
            Ok(state::Output {
                default: id == default,
                id,
                name: name.to_string(),
            })
        })
        .collect()
}

/// What Windows tells the watcher: the level moved, or the set of outputs did.
#[derive(Clone, Copy, PartialEq)]
enum Wake {
    Volume,
    Outputs,
}

/// Both of Windows' audio callbacks, which only pass the news on: they run on its threads
/// and must not block.
#[implement(IAudioEndpointVolumeCallback, IMMNotificationClient)]
struct Events(Sender<Wake>);

impl Events_Impl {
    fn wake(&self, wake: Wake) -> windows::core::Result<()> {
        if self.0.send(wake).is_err() {
            eprintln!("visor: an audio change had no watcher to go to");
        }
        Ok(())
    }
}

#[allow(non_snake_case)]
impl IAudioEndpointVolumeCallback_Impl for Events_Impl {
    fn OnNotify(&self, _: *mut AUDIO_VOLUME_NOTIFICATION_DATA) -> windows::core::Result<()> {
        self.wake(Wake::Volume)
    }
}

#[allow(non_snake_case)]
impl IMMNotificationClient_Impl for Events_Impl {
    fn OnDeviceStateChanged(&self, _: &PCWSTR, _: DEVICE_STATE) -> windows::core::Result<()> {
        self.wake(Wake::Outputs)
    }
    fn OnDeviceAdded(&self, _: &PCWSTR) -> windows::core::Result<()> {
        self.wake(Wake::Outputs)
    }
    fn OnDeviceRemoved(&self, _: &PCWSTR) -> windows::core::Result<()> {
        self.wake(Wake::Outputs)
    }
    fn OnDefaultDeviceChanged(
        &self,
        _: EDataFlow,
        _: ERole,
        _: &PCWSTR,
    ) -> windows::core::Result<()> {
        self.wake(Wake::Outputs)
    }
    /// Drivers change properties all the time; a renamed output is picked up by the refresh.
    fn OnPropertyValueChanged(&self, _: &PCWSTR, _: &PROPERTYKEY) -> windows::core::Result<()> {
        Ok(())
    }
}

/// Follows the volume and the output list from Windows' own notifications, so the thread
/// sleeps until one of them changes.
pub fn watch(app: AppHandle) {
    com();
    let (send, wakes) = mpsc::channel();
    let on_volume: IAudioEndpointVolumeCallback = Events(send).into();
    let on_outputs: IMMNotificationClient = match on_volume.cast() {
        Ok(client) => client,
        Err(e) => return eprintln!("visor: no audio notifications: {e}"),
    };
    let mut devices: Option<IMMDeviceEnumerator> = None;
    let mut volume: Option<IAudioEndpointVolume> = None;
    let mut wake = Wake::Outputs;
    loop {
        let mut list = None;
        if wake == Wake::Outputs {
            if devices.is_none() {
                devices = enumerator()
                    .and_then(|en| {
                        unsafe { en.RegisterEndpointNotificationCallback(&on_outputs)? };
                        Ok(en)
                    })
                    .map_err(|e| eprintln!("visor: watching outputs failed: {e}"))
                    .ok();
            }
            // The default device can change under us, so the endpoint is fetched again with the list.
            if let Some(old) = volume.take() {
                if let Err(e) = unsafe { old.UnregisterControlChangeNotify(&on_volume) } {
                    eprintln!("visor: letting go of the last output failed: {e}");
                }
            }
            volume = endpoint_volume()
                .and_then(|v| {
                    unsafe { v.RegisterControlChangeNotify(&on_volume)? };
                    Ok(v)
                })
                .map_err(|e| eprintln!("visor: no output volume: {e}"))
                .ok();
            list = devices.as_ref().and_then(|en| {
                outputs(en)
                    .map_err(|e| eprintln!("visor: listing outputs failed: {e}"))
                    .ok()
            });
            // A list that can't be read means the enumerator is dead; the next refresh makes another.
            if list.is_none() {
                devices = None;
            }
        }
        let level = volume.as_ref().and_then(|v| unsafe {
            Some((v.GetMasterVolumeLevelScalar().ok()?, v.GetMute().ok()?))
        });
        // One update for both, so a new output's volume arrives with the switch itself and the
        // islands can tell it from a volume change.
        state::update(&app, |s| {
            if let Some(list) = list {
                s.outputs = list;
            }
            if let Some((level, muted)) = level {
                s.volume = (level * 100.0).round() / 100.0;
                s.muted = muted.as_bool();
            }
        });
        wake = match wakes.recv_timeout(REFRESH) {
            Ok(first) => {
                // Plugging a device in sends a burst; one refresh answers all of it.
                if wakes.try_iter().any(|w| w == Wake::Outputs) {
                    Wake::Outputs
                } else {
                    first
                }
            }
            Err(RecvTimeoutError::Timeout) => Wake::Outputs,
            Err(RecvTimeoutError::Disconnected) => {
                return eprintln!("visor: audio notifications stopped")
            }
        };
    }
}

#[tauri::command]
pub fn set_volume(level: f32) -> Result<()> {
    com();
    let v = endpoint_volume()?;
    unsafe {
        v.SetMasterVolumeLevelScalar(level.clamp(0.0, 1.0), std::ptr::null())?;
        v.SetMute(false, std::ptr::null())?;
    }
    Ok(())
}

/// Windows has no public API to change the default output. This is the interface its own
/// Sound settings use; every audio-switcher app relies on it.
#[allow(non_snake_case)]
mod policy {
    use crate::error::Result;
    use std::ffi::c_void;
    use windows::{
        core::{GUID, HRESULT, HSTRING, PCWSTR},
        Win32::{
            Media::Audio::{eCommunications, eConsole, eMultimedia, ERole},
            System::Com::{CoCreateInstance, CLSCTX_ALL},
        },
    };

    #[windows::core::interface("f8679f50-850a-41cf-9c72-430f290290c8")]
    pub unsafe trait IPolicyConfig: windows::core::IUnknown {
        fn GetMixFormat(&self, id: PCWSTR, format: *mut *mut c_void) -> HRESULT;
        fn GetDeviceFormat(&self, id: PCWSTR, default: i32, format: *mut *mut c_void) -> HRESULT;
        fn ResetDeviceFormat(&self, id: PCWSTR) -> HRESULT;
        fn SetDeviceFormat(&self, id: PCWSTR, endpoint: *mut c_void, mix: *mut c_void) -> HRESULT;
        fn GetProcessingPeriod(
            &self,
            id: PCWSTR,
            default: i32,
            period: *mut i64,
            min: *mut i64,
        ) -> HRESULT;
        fn SetProcessingPeriod(&self, id: PCWSTR, period: *mut i64) -> HRESULT;
        fn GetShareMode(&self, id: PCWSTR, mode: *mut c_void) -> HRESULT;
        fn SetShareMode(&self, id: PCWSTR, mode: *mut c_void) -> HRESULT;
        fn GetPropertyValue(&self, id: PCWSTR, key: *const c_void, value: *mut c_void) -> HRESULT;
        fn SetPropertyValue(&self, id: PCWSTR, key: *const c_void, value: *const c_void)
            -> HRESULT;
        fn SetDefaultEndpoint(&self, id: PCWSTR, role: ERole) -> HRESULT;
        fn SetEndpointVisibility(&self, id: PCWSTR, visible: i32) -> HRESULT;
    }

    const POLICY_CONFIG_CLIENT: GUID = GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

    pub fn set_default(id: &str) -> Result<()> {
        let policy: IPolicyConfig =
            unsafe { CoCreateInstance(&POLICY_CONFIG_CLIENT, None, CLSCTX_ALL)? };
        let id = HSTRING::from(id);
        for role in [eConsole, eMultimedia, eCommunications] {
            unsafe { policy.SetDefaultEndpoint(PCWSTR(id.as_ptr()), role).ok()? };
        }
        Ok(())
    }
}

#[tauri::command]
pub fn set_output(id: String) -> Result<()> {
    com();
    policy::set_default(&id)
}
