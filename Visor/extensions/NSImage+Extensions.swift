

import SwiftUI
import AppKit
import CoreImage.CIFilterBuiltins

extension NSImage {
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
