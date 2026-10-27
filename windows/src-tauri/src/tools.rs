use crate::{
    error::{Error, Result},
    media::read_stream,
    pdf,
};
use std::{
    fs,
    path::{Path, PathBuf},
};
use windows::{
    core::{Interface, GUID, HSTRING},
    Data::Pdf::{PdfDocument, PdfPageRenderOptions},
    Graphics::Imaging::{
        BitmapAlphaMode, BitmapDecoder, BitmapEncoder, BitmapPixelFormat, SoftwareBitmap,
    },
    Storage::{FileAccessMode, StorageFile, Streams::InMemoryRandomAccessStream},
};

/// PDF pages render at twice their on-screen size, sharp enough to read when zoomed.
const PDF_SCALE: f64 = 2.0;

/// Converted files land beside each other in %TEMP%\Visor, as the Mac app keeps them in its temp folder.
fn output(stem: &str, ext: &str) -> Result<PathBuf> {
    let dir = std::env::temp_dir().join("Visor");
    fs::create_dir_all(&dir)?;
    let mut path = dir.join(format!("{stem}.{ext}"));
    let mut n = 2;
    while path.exists() {
        path = dir.join(format!("{stem} {n}.{ext}"));
        n += 1;
    }
    Ok(path)
}

fn stem(path: &Path) -> String {
    path.file_stem()
        .map_or_else(|| "Visor".into(), |s| s.to_string_lossy().into_owned())
}

fn file(path: &Path) -> Result<StorageFile> {
    if !path.is_absolute() || !path.exists() {
        return Err(Error(format!("{} is not there anymore", path.display())));
    }
    Ok(StorageFile::GetFileFromPathAsync(&HSTRING::from(path.as_os_str()))?.join()?)
}

fn decode(path: &Path, alpha: BitmapAlphaMode) -> Result<SoftwareBitmap> {
    let stream = file(path)?.OpenAsync(FileAccessMode::Read)?.join()?;
    let decoder = BitmapDecoder::CreateAsync(&stream)?.join()?;
    Ok(decoder
        .GetSoftwareBitmapConvertedAsync(BitmapPixelFormat::Bgra8, alpha)?
        .join()?)
}

fn encode(bitmap: &SoftwareBitmap, encoder: GUID) -> Result<Vec<u8>> {
    let stream = InMemoryRandomAccessStream::new()?;
    let writer = BitmapEncoder::CreateAsync(encoder, &stream)?.join()?;
    writer.SetSoftwareBitmap(bitmap)?;
    writer.FlushAsync()?.join()?;
    read_stream(&stream.cast()?)
}

#[derive(serde::Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Png,
    Jpeg,
    Bmp,
    Tiff,
    Gif,
}

/// The Mac shelf's Convert menu. HEIC isn't offered: Windows only decodes it with a Store extension.
#[tauri::command]
pub async fn convert_image(path: String, format: Format) -> Result<String> {
    let (id, ext) = match format {
        Format::Png => (BitmapEncoder::PngEncoderId()?, "png"),
        Format::Jpeg => (BitmapEncoder::JpegEncoderId()?, "jpg"),
        Format::Bmp => (BitmapEncoder::BmpEncoderId()?, "bmp"),
        Format::Tiff => (BitmapEncoder::TiffEncoderId()?, "tiff"),
        Format::Gif => (BitmapEncoder::GifEncoderId()?, "gif"),
    };
    // JPEG and BMP have no transparency to keep.
    let alpha = if matches!(format, Format::Jpeg | Format::Bmp) {
        BitmapAlphaMode::Ignore
    } else {
        BitmapAlphaMode::Premultiplied
    };
    let source = Path::new(&path);
    let out = output(&stem(source), ext)?;
    fs::write(&out, encode(&decode(source, alpha)?, id)?)?;
    Ok(out.to_string_lossy().into_owned())
}

/// One PDF from the selected images, a page each, in shelf order.
#[tauri::command]
pub async fn images_to_pdf(paths: Vec<String>) -> Result<String> {
    let first = paths.first().ok_or("no images to combine")?;
    let pages = paths
        .iter()
        .map(|p| {
            let bitmap = decode(Path::new(p), BitmapAlphaMode::Ignore)?;
            Ok(pdf::Page {
                width: bitmap.PixelWidth()? as u32,
                height: bitmap.PixelHeight()? as u32,
                jpeg: encode(&bitmap, BitmapEncoder::JpegEncoderId()?)?,
            })
        })
        .collect::<Result<Vec<_>>>()?;
    let out = output(&stem(Path::new(first)), "pdf")?;
    fs::write(&out, pdf::write(&pages))?;
    Ok(out.to_string_lossy().into_owned())
}

/// Each page of a PDF as a PNG.
#[tauri::command]
pub async fn pdf_to_images(path: String) -> Result<Vec<String>> {
    let source = Path::new(&path);
    let doc = PdfDocument::LoadFromFileAsync(&file(source)?)?.join()?;
    let name = stem(source);
    (0..doc.PageCount()?)
        .map(|i| {
            let page = doc.GetPage(i)?;
            let options = PdfPageRenderOptions::new()?;
            options.SetDestinationWidth((page.Size()?.Width as f64 * PDF_SCALE) as u32)?;
            let stream = InMemoryRandomAccessStream::new()?;
            page.RenderWithOptionsToStreamAsync(&stream, &options)?
                .join()?;
            let out = output(&format!("{name} page {}", i + 1), "png")?;
            fs::write(&out, read_stream(&stream.cast()?)?)?;
            Ok(out.to_string_lossy().into_owned())
        })
        .collect()
}
