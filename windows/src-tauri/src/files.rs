use crate::{
    error::{Error, Result},
    media::read_stream,
};
use std::{
    cell::RefCell,
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{ipc::Response, WebviewWindow};
use windows::{
    core::{factory, AgileReference, Interface, HSTRING, PCWSTR},
    ApplicationModel::DataTransfer::{DataRequestedEventArgs, DataTransferManager},
    Foundation::TypedEventHandler,
    Storage::{FileProperties::ThumbnailMode, IStorageItem, StorageFile, StorageFolder},
    Win32::UI::{
        Shell::{IDataTransferManagerInterop, ShellExecuteW},
        WindowsAndMessaging::SW_SHOWNORMAL,
    },
};
use windows_collections::IIterable;

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

thread_local! {
    /// The handler from the last share, removed before the next so they don't pile up.
    /// The manager belongs to the window's thread, hence thread-local rather than shared.
    static SHARING: RefCell<Option<(DataTransferManager, i64)>> = const { RefCell::new(None) };
}

/// The Windows share sheet (Nearby Share, Mail, Teams…), Visor's AirDrop circle on Windows.
#[tauri::command]
pub async fn share(window: WebviewWindow, paths: Vec<String>) -> Result<()> {
    // The files reach the window's thread through agile references, the COM way to share them.
    let mut files = Vec::new();
    for path in &paths {
        let p = existing(path)?;
        let at = HSTRING::from(p.as_os_str());
        // The shelf holds folders too, and a folder has to be opened as one to be shared.
        let item: IStorageItem = if p.is_dir() {
            StorageFolder::GetFolderFromPathAsync(&at)?.join()?.cast()?
        } else {
            StorageFile::GetFileFromPathAsync(&at)?.join()?.cast()?
        };
        files.push(AgileReference::new(&item)?);
    }
    let target = window.clone();
    let (done, result) = std::sync::mpsc::channel();
    // The share sheet asks for its data on the window's own thread.
    window.run_on_main_thread(move || {
        let shown = (|| -> Result<()> {
            let hwnd = target.hwnd()?;
            let interop = factory::<DataTransferManager, IDataTransferManagerInterop>()?;
            let manager: DataTransferManager = unsafe { interop.GetForWindow(hwnd)? };
            if let Some((old, token)) = SHARING.take() {
                old.RemoveDataRequested(token)?;
            }
            let count = files.len();
            let token = manager.DataRequested(&TypedEventHandler::new(
                move |_, args: windows_core::Ref<DataRequestedEventArgs>| {
                    let request = args.ok()?.Request()?;
                    let data = request.Data()?;
                    data.Properties()?.SetTitle(&HSTRING::from(format!(
                        "{count} item{}",
                        if count == 1 { "" } else { "s" }
                    )))?;
                    let items = files
                        .iter()
                        .map(|f| f.resolve().map(Some))
                        .collect::<windows::core::Result<Vec<_>>>()?;
                    data.SetStorageItemsReadOnly(&IIterable::<IStorageItem>::from(items))
                },
            ))?;
            SHARING.set(Some((manager, token)));
            unsafe { interop.ShowShareUIForWindow(hwnd)? };
            Ok(())
        })();
        if let Err(e) = done.send(shown) {
            eprintln!("visor: share result lost: {e}");
        }
    })?;
    result.recv().map_err(|e| Error(e.to_string()))?
}
