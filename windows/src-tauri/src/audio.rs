use crate::{error::Result, state};
use std::{ffi::c_void, thread, time::Duration};
use tauri::AppHandle;
use windows::{
    core::PWSTR,
    Win32::{
        Devices::FunctionDiscovery::PKEY_Device_FriendlyName,
        Media::Audio::{
            eConsole, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator, MMDeviceEnumerator,
            DEVICE_STATE_ACTIVE,
        },
        System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED, STGM_READ},
    },
};

const VOLUME_POLL: Duration = Duration::from_millis(50);
const OUTPUTS_EVERY: u32 = 20;

/// Joins this thread to COM. The result is ignored on purpose: S_FALSE (already joined) and
/// RPC_E_CHANGED_MODE (an STA thread, like Tauri's main thread) both leave COM usable.
pub fn com() {
    let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
}

fn enumerator() -> Result<IMMDeviceEnumerator> {
    Ok(unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? })
}

pub fn endpoint_volume() -> Result<IAudioEndpointVolume> {
    Ok(unsafe { enumerator()?.GetDefaultAudioEndpoint(eRender, eConsole)?.Activate(CLSCTX_ALL, None)? })
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
            let name = unsafe { device.OpenPropertyStore(STGM_READ)?.GetValue(&PKEY_Device_FriendlyName)? };
            Ok(state::Output { default: id == default, id, name: name.to_string() })
        })
        .collect()
}

/// Volume every 50 ms so the HUD keeps up with a held key; the output list once a second.
// ponytail: polled; IAudioEndpointVolumeCallback and IMMNotificationClient if the poll ever shows in CPU.
pub fn watch(app: AppHandle) {
    com();
    let mut tick = 0u32;
    let mut volume: Option<IAudioEndpointVolume> = None;
    loop {
        if tick % OUTPUTS_EVERY == 0 {
            // The default device can change under us, so the endpoint is fetched again with the list.
            volume = endpoint_volume().map_err(|e| eprintln!("visor: no output volume: {e}")).ok();
            match enumerator().and_then(|en| outputs(&en)) {
                Ok(list) => state::update(&app, |s| s.outputs = list),
                Err(e) => eprintln!("visor: listing outputs failed: {e}"),
            }
        }
        if let Some(v) = &volume {
            if let (Ok(level), Ok(muted)) = unsafe { (v.GetMasterVolumeLevelScalar(), v.GetMute()) } {
                state::update(&app, |s| {
                    s.volume = (level * 100.0).round() / 100.0;
                    s.muted = muted.as_bool();
                });
            }
        }
        tick = tick.wrapping_add(1);
        thread::sleep(VOLUME_POLL);
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
        fn GetProcessingPeriod(&self, id: PCWSTR, default: i32, period: *mut i64, min: *mut i64) -> HRESULT;
        fn SetProcessingPeriod(&self, id: PCWSTR, period: *mut i64) -> HRESULT;
        fn GetShareMode(&self, id: PCWSTR, mode: *mut c_void) -> HRESULT;
        fn SetShareMode(&self, id: PCWSTR, mode: *mut c_void) -> HRESULT;
        fn GetPropertyValue(&self, id: PCWSTR, key: *const c_void, value: *mut c_void) -> HRESULT;
        fn SetPropertyValue(&self, id: PCWSTR, key: *const c_void, value: *const c_void) -> HRESULT;
        fn SetDefaultEndpoint(&self, id: PCWSTR, role: ERole) -> HRESULT;
        fn SetEndpointVisibility(&self, id: PCWSTR, visible: i32) -> HRESULT;
    }

    const POLICY_CONFIG_CLIENT: GUID = GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

    pub fn set_default(id: &str) -> Result<()> {
        let policy: IPolicyConfig = unsafe { CoCreateInstance(&POLICY_CONFIG_CLIENT, None, CLSCTX_ALL)? };
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
