use crate::error::Result;
use std::{
    fs,
    os::windows::{io::IntoRawHandle, process::CommandExt},
    path::PathBuf,
    process::Command,
};
use windows::Win32::{
    Foundation::HANDLE,
    System::Console::{SetStdHandle, STD_ERROR_HANDLE},
};

/// %LOCALAPPDATA%\Visor\visor.log, with the previous run's kept beside it as visor.old.log.
fn path() -> Result<PathBuf> {
    let dir =
        PathBuf::from(std::env::var_os("LOCALAPPDATA").ok_or("no LOCALAPPDATA")?).join("Visor");
    fs::create_dir_all(&dir)?;
    Ok(dir.join("visor.log"))
}

/// Points stderr at the log file. Rust looks the handle up on every write, so every eprintln!
/// and panic message from here on lands in the file.
// Debug builds keep their console.
#[cfg_attr(debug_assertions, allow(dead_code))]
pub fn to_file() -> Result<()> {
    let log = path()?;
    if log.exists() {
        fs::rename(&log, log.with_extension("old.log"))?;
    }
    let handle = fs::File::create(&log)?.into_raw_handle();
    unsafe { SetStdHandle(STD_ERROR_HANDLE, HANDLE(handle))? };
    let started = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    eprintln!("visor: started, unix time {started}");
    Ok(())
}

/// The page's failures, so the log has both halves of a bug report.
#[tauri::command]
pub fn log(message: String) {
    eprintln!("visor (page): {message}");
}

#[tauri::command]
pub fn show_log() -> Result<()> {
    let log = path()?;
    // Explorer parses its own command line, so the path is quoted by hand.
    Command::new("explorer")
        .raw_arg(format!("/select,\"{}\"", log.display()))
        .spawn()?;
    Ok(())
}
