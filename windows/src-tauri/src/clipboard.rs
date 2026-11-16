use crate::error::{Error, Result};
use windows::Win32::{
    Foundation::{GlobalFree, HANDLE},
    System::{
        DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData},
        Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE},
    },
};

/// CF_UNICODETEXT, without pulling in the Ole feature for one constant.
const CF_UNICODETEXT: u32 = 13;

/// Win32's clipboard rather than WinRT's: it works from any thread and needs no focused window,
/// and the island never takes focus.
pub fn set_text(text: &str) -> Result<()> {
    let wide: Vec<u16> = text.encode_utf16().chain(Some(0)).collect();
    unsafe {
        OpenClipboard(None).map_err(|e| Error(format!("The clipboard is busy: {e}")))?;
        let result = (|| {
            EmptyClipboard()?;
            let memory = GlobalAlloc(GMEM_MOVEABLE, wide.len() * 2)?;
            let target = GlobalLock(memory).cast::<u16>();
            if target.is_null() {
                let _ = GlobalFree(Some(memory));
                return Err(windows::core::Error::from_thread());
            }
            std::ptr::copy_nonoverlapping(wide.as_ptr(), target, wide.len());
            let _ = GlobalUnlock(memory);
            // Once set, the clipboard owns the memory; it's freed here only if that fails.
            if let Err(e) = SetClipboardData(CF_UNICODETEXT, Some(HANDLE(memory.0))) {
                let _ = GlobalFree(Some(memory));
                return Err(e);
            }
            Ok(())
        })();
        let _ = CloseClipboard();
        result.map_err(Error::from)
    }
}
