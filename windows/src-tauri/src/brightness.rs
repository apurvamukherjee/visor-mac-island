use crate::{audio::com, error::Result, state};
use std::{thread, time::Duration};
use tauri::AppHandle;
use windows::{
    core::{w, BSTR, PCWSTR},
    Win32::System::{
        Com::{CoCreateInstance, CLSCTX_INPROC_SERVER},
        Variant::{VariantClear, VariantToUInt32, VARIANT},
        Wmi::{
            IWbemClassObject, IWbemLocator, IWbemServices, WbemLocator, WBEM_FLAG_FORWARD_ONLY,
            WBEM_FLAG_RETURN_IMMEDIATELY, WBEM_INFINITE,
        },
    },
};

const RETRY: Duration = Duration::from_secs(30);
/// How long one wait for a brightness event lasts before it simply waits again.
const EVENT_WAIT_MS: i32 = 30_000;

/// A laptop's built-in panel, as the brightness keys change it. Windows still shows its own
/// brightness flyout too: those keys are handled in firmware, so there is nothing to intercept.
pub fn watch(app: AppHandle) {
    com();
    let mut failing = false;
    loop {
        // External monitors have no WMI brightness, and a laptop panel's can drop out across
        // sleep or a closed lid, so it's tried again now and then on a fresh connection.
        if let Err(e) = follow(&app, &mut failing) {
            if !failing {
                eprintln!("visor: no brightness to watch, retrying: {e}");
            }
            failing = true;
            state::update(&app, |s| s.brightness = None);
        }
        thread::sleep(RETRY);
    }
}

/// Reads the level once, then waits on WMI's brightness events instead of asking over and
/// over: a WMI query several times a second shows up as CPU in WMI's own service.
fn follow(app: &AppHandle, failing: &mut bool) -> Result<()> {
    let services = connect()?;
    let level = read(&services)?;
    state::update(app, |s| s.brightness = level);
    *failing = false;
    let events = unsafe {
        services.ExecNotificationQuery(
            &BSTR::from("WQL"),
            &BSTR::from("SELECT Brightness FROM WmiMonitorBrightnessEvent"),
            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
            None,
        )?
    };
    loop {
        let mut row = [None];
        let mut returned = 0;
        // A wait that times out is a success with nothing in it.
        unsafe { events.Next(EVENT_WAIT_MS, &mut row, &mut returned).ok()? };
        let [Some(event)] = row else { continue };
        let level = percent(&event, w!("Brightness"))?;
        state::update(app, |s| s.brightness = Some(level));
    }
}

fn connect() -> Result<IWbemServices> {
    unsafe {
        let locator: IWbemLocator = CoCreateInstance(&WbemLocator, None, CLSCTX_INPROC_SERVER)?;
        let empty = BSTR::new();
        Ok(locator.ConnectServer(
            &BSTR::from("ROOT\\WMI"),
            &empty,
            &empty,
            &empty,
            0,
            &empty,
            None,
        )?)
    }
}

fn read(services: &IWbemServices) -> Result<Option<f32>> {
    unsafe {
        let rows = services.ExecQuery(
            &BSTR::from("WQL"),
            &BSTR::from("SELECT CurrentBrightness FROM WmiMonitorBrightness"),
            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
            None,
        )?;
        let mut row = [None];
        let mut returned = 0;
        rows.Next(WBEM_INFINITE, &mut row, &mut returned).ok()?;
        let [Some(object)] = row else { return Ok(None) };
        Ok(Some(percent(&object, w!("CurrentBrightness"))?))
    }
}

fn percent(object: &IWbemClassObject, name: PCWSTR) -> Result<f32> {
    unsafe {
        let mut value = VARIANT::default();
        object.Get(name, 0, &mut value, None, None)?;
        let level = VariantToUInt32(&value);
        VariantClear(&mut value)?;
        Ok(level? as f32 / 100.0)
    }
}
