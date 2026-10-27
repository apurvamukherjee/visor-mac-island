use crate::{
    error::{Error, Result},
    media::read_stream,
};
use std::{
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{ipc::Response, WebviewWindow};
use windows::{
    core::{Interface, HSTRING, PCWSTR},
    Storage::{FileProperties::ThumbnailMode, StorageFile, StorageFolder},
    Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
};

const THUMB_SIZE: u32 = 128;

fn existing(path: &str) -> Result<&Path> {
    let p = Path::new(path);
    if p.is_absolute() && p.exists() {
        Ok(p)
    } else {
        Err(Error(format!("{path} is not there anymore")))
    }
}

/// What Explorer would show for the file: a preview for images and PDFs, the app icon otherwise.
#[tauri::command]
pub async fn thumbnail(path: String) -> Result<Response> {
    let p = existing(&path)?;
    let path = HSTRING::from(p.as_os_str());
    let thumb = if p.is_dir() {
        StorageFolder::GetFolderFromPathAsync(&path)?
            .join()?
            .GetThumbnailAsyncOverloadDefaultOptions(ThumbnailMode::SingleItem, THUMB_SIZE)?
    } else {
        StorageFile::GetFileFromPathAsync(&path)?
            .join()?
            .GetThumbnailAsyncOverloadDefaultOptions(ThumbnailMode::SingleItem, THUMB_SIZE)?
    };
    Ok(Response::new(read_stream(&thumb.join()?.cast()?)?))
}

/// Opens a shelf file in its app, or a web link (a meeting, a release page) in the browser.
/// Only files and http(s): this is the one command that can launch things.
#[tauri::command]
pub fn open(target: String) -> Result<()> {
    let web = target.starts_with("https://") || target.starts_with("http://");
    if !web {
        existing(&target)?;
    }
    let target = HSTRING::from(target);
    let done = unsafe {
        ShellExecuteW(
            None,
            &HSTRING::from("open"),
            &target,
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    // ShellExecute reports success as any value above 32.
    if done.0 as usize > 32 {
        Ok(())
    } else {
        Err(Error(format!(
            "Windows couldn't open it (code {})",
            done.0 as usize
        )))
    }
}

#[tauri::command]
pub fn reveal(path: String) -> Result<()> {
    let p = existing(&path)?;
    // Explorer parses its own command line, so the path is quoted by hand.
    Command::new("explorer")
        .raw_arg(format!("/select,\"{}\"", p.display()))
        .spawn()?;
    Ok(())
}

/// Drags shelf files out to Explorer, a mail, a chat.
#[tauri::command]
pub async fn start_drag(window: WebviewWindow, paths: Vec<String>) -> Result<()> {
    let files = paths
        .iter()
        .map(|p| existing(p).map(PathBuf::from))
        .collect::<Result<Vec<_>>>()?;
    let target = window.clone();
    // OLE drag runs its own loop on the window's thread, so it starts there, not on this one.
    window.run_on_main_thread(move || {
        let icon = drag::Image::Raw(include_bytes!("../icons/32x32.png").to_vec());
        let started = drag::start_drag(
            &target,
            drag::DragItem::Files(files),
            icon,
            |_, _| {},
            drag::Options::default(),
        );
        if let Err(e) = started {
            eprintln!("visor: dragging files out failed: {e}");
        }
    })?;
    Ok(())
}
