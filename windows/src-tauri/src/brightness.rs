use crate::{audio::com, error::Result, state};
use std::{thread, time::Duration};
use tauri::AppHandle;
use windows::{
    core::{w, BSTR},
    Win32::System::{
        Com::{CoCreateInstance, CLSCTX_INPROC_SERVER},
        Variant::{VariantClear, VariantToUInt32, VARIANT},
        Wmi::{
            IWbemLocator, IWbemServices, WbemLocator, WBEM_FLAG_FORWARD_ONLY,
            WBEM_FLAG_RETURN_IMMEDIATELY, WBEM_INFINITE,
        },
    },
};

const POLL: Duration = Duration::from_millis(300);

/// A laptop's built-in panel, as the brightness keys change it. Windows still shows its own
/// brightness flyout too: those keys are handled in firmware, so there is nothing to intercept.
// ponytail: polled; WmiMonitorBrightnessEvent if the 300 ms poll ever shows in CPU.
pub fn watch(app: AppHandle) {
    com();
    let services = match connect() {
        Ok(s) => s,
        Err(e) => return eprintln!("visor: no WMI, so no brightness HUD: {e}"),
    };
    loop {
        match read(&services) {
            Ok(level) => state::update(&app, |s| s.brightness = level),
            // External monitors have no WMI brightness; there is nothing to watch.
            Err(e) => return eprintln!("visor: no brightness to watch: {e}"),
        }
        thread::sleep(POLL);
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
        let mut value = VARIANT::default();
        object.Get(w!("CurrentBrightness"), 0, &mut value, None, None)?;
        let level = VariantToUInt32(&value);
        VariantClear(&mut value)?;
        Ok(Some(level? as f32 / 100.0))
    }
}
