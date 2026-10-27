use crate::error::{Error, Result};
use windows::{core::HSTRING, Foundation::Uri, Web::Http::HttpClient};

/// Calendar feeds don't send CORS headers, so the page can't fetch them itself.
/// Windows' own HTTP client also follows the system proxy and certificates.
#[tauri::command]
pub async fn fetch_text(url: String) -> Result<String> {
    // Calendar apps hand out webcal:// links for the same https feed.
    let url = match url.strip_prefix("webcal://") {
        Some(rest) => format!("https://{rest}"),
        None => url,
    };
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err(Error(format!("{url} is not a web link")));
    }
    let uri = Uri::CreateUri(&HSTRING::from(url))?;
    Ok(HttpClient::new()?.GetStringAsync(&uri)?.join()?.to_string())
}
