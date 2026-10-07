
import SwiftUI
import Defaults

extension Color {
    static var effectiveAccent: Color {
        if let nsColor = NSColor.customAccent {
            return Color(nsColor: nsColor)
        }
        return .accentColor
    }
    
    /// Returns a darker version of the accent color suitable for backgrounds
    static var effectiveAccentBackground: Color {
        if let nsColor = NSColor.customAccent {
            return Color(nsColor: nsColor.withSystemEffect(.disabled))
        }
        return Color.effectiveAccent.opacity(0.25)
    }
}

extension NSColor {
    // Visor: views read the accent on every render (the music slider 10x a
    // second), and each read unarchived the stored colour again.
    private static var cachedCustomAccent: (data: Data, color: NSColor)?

    fileprivate static var customAccent: NSColor? {
        guard Defaults[.useCustomAccentColor], let data = Defaults[.customAccentColorData] else { return nil }
        if let cached = cachedCustomAccent, cached.data == data { return cached.color }
        guard let color = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSColor.self, from: data) else { return nil }
        cachedCustomAccent = (data, color)
        return color
    }
}

extension Color {
    /// Fill behind round controls in the open notch. On the black island the
    /// controls sit on black discs; on Liquid Glass those discs would punch
    /// holes in the glass, so they become a light wash instead (and not glass
    /// of their own: glass can't sample glass, so stacking it looks muddy).
    static func notchControlFill(glass: Bool) -> Color {
        if #available(macOS 26, *), glass { return .white.opacity(0.12) }
        return .black
    }
}
