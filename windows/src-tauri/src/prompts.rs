use tauri::WebviewWindow;
use webview2_com::{
    Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_PERMISSION_KIND, COREWEBVIEW2_PERMISSION_KIND_CAMERA,
        COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION, COREWEBVIEW2_PERMISSION_STATE_ALLOW,
    },
    PermissionRequestedEventHandler,
};

/// The island asks for the camera (the mirror) and location (the weather) only after the user
/// turns those on, and its window can't take focus, so WebView2's own prompt may never show.
/// Those two are allowed here; Windows' privacy settings still have the last word.
pub fn allow(window: &WebviewWindow) -> tauri::Result<()> {
    window.with_webview(|webview| {
        let handler = PermissionRequestedEventHandler::create(Box::new(|_, args| {
            let Some(args) = args else { return Ok(()) };
            let mut kind = COREWEBVIEW2_PERMISSION_KIND::default();
            unsafe { args.PermissionKind(&mut kind)? };
            if kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
                || kind == COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION
            {
                unsafe { args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)? };
            }
            Ok(())
        }));
        let mut token = 0;
        let added = unsafe { webview.controller().CoreWebView2() }
            .and_then(|core| unsafe { core.add_PermissionRequested(&handler, &mut token) });
        if let Err(e) = added {
            eprintln!("visor: camera and location prompts stay WebView2's: {e}");
        }
    })
}
