import SwiftUI
import AppKit
import CoreImage.CIFilterBuiltins
import ImageIO

extension NSImage {
    /// Decodes image data at no more than `maxPixelSize` on its longer side.
    /// NSImage(data:) keeps the full bitmap once drawn, and cover art is often
    /// 1000-3000 px for a view a few hundred pixels wide.
    static func downsampled(from data: Data, maxPixelSize: Int) -> NSImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary),
              let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                  kCGImageSourceCreateThumbnailFromImageAlways: true,
                  kCGImageSourceCreateThumbnailWithTransform: true,
                  kCGImageSourceShouldCacheImmediately: true,
                  kCGImageSourceThumbnailMaxPixelSize: maxPixelSize,
              ] as CFDictionary)
        else { return nil }
        return NSImage(cgImage: image, size: NSSize(width: image.width, height: image.height))
    }

    // Visor: one hop back to main for every exit, instead of one per failure.
    func averageColor(completion: @escaping (NSColor?) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            let color = self.computeAverageColor()
            DispatchQueue.main.async {
                completion(color)
            }
        }
    }

    // Averaged in gamma-encoded sRGB, which is what the old per-pixel loop summed.
    private static let averagingContext = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

    private func computeAverageColor() -> NSColor? {
        guard let cgImage = self.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
        let input = CIImage(cgImage: cgImage)
        let filter = CIFilter.areaAverage()
        filter.inputImage = input
        filter.extent = input.extent
        guard let output = filter.outputImage else { return nil }

        var pixel = [UInt8](repeating: 0, count: 4)
        Self.averagingContext.render(output, toBitmap: &pixel, rowBytes: 4,
                                     bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                                     format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB))
        let averageRed = CGFloat(pixel[0]) / 255.0
        let averageGreen = CGFloat(pixel[1]) / 255.0
        let averageBlue = CGFloat(pixel[2]) / 255.0

        let minBrightness: CGFloat = 0.5

        // If it's near black, just return a gray color with the minimum brightness
        if averageRed < 0.03 && averageGreen < 0.03 && averageBlue < 0.03 {
            return NSColor(white: minBrightness, alpha: 1.0)
        }

        let color = NSColor(red: averageRed, green: averageGreen, blue: averageBlue, alpha: 1.0)
        var hue: CGFloat = 0
        var saturation: CGFloat = 0
        var brightness: CGFloat = 0
        var alpha: CGFloat = 0
        color.getHue(&hue, saturation: &saturation, brightness: &brightness, alpha: &alpha)

        guard brightness < minBrightness else { return color }
        // Increase brightness while maintaining hue and reducing saturation
        return NSColor(hue: hue, saturation: saturation * (brightness / minBrightness), brightness: minBrightness, alpha: alpha)
    }
}

extension NSImage {
    /// What `vividPalette` gives for a cover with no colour to speak of.
    static let neutralPalette = [NSColor(white: 0.95, alpha: 1), NSColor(white: 0.7, alpha: 1)]

    /// The cover's two most vivid colours, brightened enough to read as light
    /// on a dark screen. An average would not do: most covers average to mud.
    func vividPalette() -> [NSColor] {
        let side = 16
        guard let cgImage = cgImage(forProposedRect: nil, context: nil, hints: nil),
              let context = CGContext(
                  data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
                  space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
              )
        else { return Self.neutralPalette }
        context.interpolationQuality = .medium
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: side, height: side))
        guard let data = context.data else { return Self.neutralPalette }
        let pixels = UnsafeBufferPointer(start: data.assumingMemoryBound(to: UInt8.self), count: side * side * 4)

        struct Swatch {
            var hue: CGFloat = 0
            var saturation: CGFloat = 0
            var brightness: CGFloat = 0
            var vividness: CGFloat { saturation * brightness }
        }
        let swatches = stride(from: 0, to: pixels.count, by: 4).map { offset -> Swatch in
            var swatch = Swatch()
            NSColor(
                srgbRed: CGFloat(pixels[offset]) / 255, green: CGFloat(pixels[offset + 1]) / 255,
                blue: CGFloat(pixels[offset + 2]) / 255, alpha: 1
            ).getHue(&swatch.hue, saturation: &swatch.saturation, brightness: &swatch.brightness, alpha: nil)
            return swatch
        }
        guard let first = swatches.max(by: { $0.vividness < $1.vividness }), first.vividness > 0.12 else {
            return Self.neutralPalette
        }
        // Hue is a circle, so 0.95 and 0.05 are neighbours.
        func hueGap(_ swatch: Swatch) -> CGFloat {
            let gap = abs(swatch.hue - first.hue)
            return min(gap, 1 - gap)
        }
        let second = swatches
            .filter { hueGap($0) > 0.08 && $0.vividness > first.vividness * 0.35 }
            .max { $0.vividness < $1.vividness }
            // A one-colour cover still gets a second stop, a short step round the wheel.
            ?? Swatch(hue: (first.hue + 0.08).truncatingRemainder(dividingBy: 1), saturation: first.saturation, brightness: first.brightness)

        return [first, second].map {
            NSColor(hue: $0.hue, saturation: max($0.saturation, 0.55), brightness: max($0.brightness, 0.9), alpha: 1)
        }
    }
}

extension Color {
    func ensureMinimumBrightness(factor: CGFloat) -> Color {
        guard factor >= 0 && factor <= 1 else {
            return self // Return original color if factor is out of bounds
        }

        let nsColor = NSColor(self)

        // Convert to RGB color space
        guard let rgbColor = nsColor.usingColorSpace(.sRGB) else {
            return self // Return original color if conversion fails
        }

        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0

        rgbColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)

        // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
        let perceivedBrightness = (0.2126 * red + 0.7152 * green + 0.0722 * blue)

        let scale = factor / perceivedBrightness
        red = min(red * scale, 1.0)
        green = min(green * scale, 1.0)
        blue = min(blue * scale, 1.0)

        return Color(red: Double(red), green: Double(green), blue: Double(blue), opacity: Double(alpha))
    }
}
