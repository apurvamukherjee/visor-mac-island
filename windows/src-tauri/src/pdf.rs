//! A PDF of JPEG pages. JPEG goes into a PDF as-is (DCTDecode), so this needs no PDF library.

pub struct Page {
    pub width: u32,
    pub height: u32,
    pub jpeg: Vec<u8>,
}

/// Screen pixels to PDF points, so a page prints at the size it looks on screen.
const POINTS_PER_PIXEL: f64 = 72.0 / 96.0;

pub fn write(pages: &[Page]) -> Vec<u8> {
    let mut out = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n".to_vec();
    let mut offsets = Vec::new();
    let mut object = |out: &mut Vec<u8>, head: String, stream: Option<&[u8]>| {
        offsets.push(out.len());
        out.extend_from_slice(format!("{} 0 obj\n{head}\n", offsets.len()).as_bytes());
        if let Some(bytes) = stream {
            out.extend_from_slice(b"stream\n");
            out.extend_from_slice(bytes);
            out.extend_from_slice(b"\nendstream\n");
        }
        out.extend_from_slice(b"endobj\n");
    };

    // Objects 1 and 2, then three per page: the page, its drawing, its image.
    let kids: Vec<String> = (0..pages.len())
        .map(|i| format!("{} 0 R", 3 + 3 * i))
        .collect();
    object(&mut out, "<< /Type /Catalog /Pages 2 0 R >>".into(), None);
    object(
        &mut out,
        format!(
            "<< /Type /Pages /Kids [{}] /Count {} >>",
            kids.join(" "),
            pages.len()
        ),
        None,
    );
    for (i, page) in pages.iter().enumerate() {
        let n = 3 + 3 * i;
        let (w, h) = (
            page.width as f64 * POINTS_PER_PIXEL,
            page.height as f64 * POINTS_PER_PIXEL,
        );
        let draw = format!("q {w:.2} 0 0 {h:.2} 0 0 cm /Im0 Do Q");
        object(
            &mut out,
            format!(
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {w:.2} {h:.2}] /Resources << /XObject << /Im0 {} 0 R >> >> /Contents {} 0 R >>",
                n + 2,
                n + 1
            ),
            None,
        );
        object(
            &mut out,
            format!("<< /Length {} >>", draw.len()),
            Some(draw.as_bytes()),
        );
        object(
            &mut out,
            format!(
                "<< /Type /XObject /Subtype /Image /Width {} /Height {} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {} >>",
                page.width,
                page.height,
                page.jpeg.len()
            ),
            Some(&page.jpeg),
        );
    }

    let xref = out.len();
    out.extend_from_slice(
        format!("xref\n0 {}\n0000000000 65535 f \n", offsets.len() + 1).as_bytes(),
    );
    for offset in &offsets {
        out.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    out.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
            offsets.len() + 1
        )
        .as_bytes(),
    );
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_xref_entry_points_at_its_object() {
        let page = |w| Page {
            width: w,
            height: 50,
            jpeg: vec![0xff, 0xd8, 0xff, 0xd9],
        };
        let pdf = write(&[page(100), page(200)]);
        // Offsets are in bytes, and the header and JPEGs aren't UTF-8, so compare bytes.
        let at = |i: usize, text: &str| pdf[i..].starts_with(text.as_bytes());
        assert!(at(0, "%PDF-1.4"));
        assert!(pdf.ends_with(b"%%EOF\n"));

        let tail = String::from_utf8_lossy(&pdf[pdf.len() - 40..]).into_owned();
        let xref: usize = tail
            .rsplit("startxref\n")
            .next()
            .unwrap()
            .lines()
            .next()
            .unwrap()
            .parse()
            .unwrap();
        assert!(at(xref, "xref\n0 9\n"));
        let table = String::from_utf8_lossy(&pdf[xref..]).into_owned();
        for (i, entry) in table.lines().skip(3).take(8).enumerate() {
            let offset: usize = entry[..10].parse().unwrap();
            assert!(at(offset, &format!("{} 0 obj", i + 1)), "object {}", i + 1);
        }
    }
}
