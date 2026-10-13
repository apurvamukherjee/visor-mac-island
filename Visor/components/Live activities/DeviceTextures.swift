import AppKit

/// Textures drawn in code for the device models, so nothing ships as an image.
enum DeviceTextures {
    /// A dim room with two soft boxes: it is what the glossy parts reflect,
    /// and without it physically based materials render flat grey.
    static let studio: NSImage = {
        let size = NSSize(width: 512, height: 256)
        return NSImage(size: size, flipped: false) { rect in
            NSGradient(colors: [NSColor(white: 0.3, alpha: 1), NSColor(white: 0.6, alpha: 1)])?
                .draw(in: rect, angle: 90)
            NSColor(white: 1, alpha: 0.95).setFill()
            NSBezierPath(roundedRect: NSRect(x: 60, y: 150, width: 120, height: 70), xRadius: 18, yRadius: 18).fill()
            // A thin band for the chrome to catch as it turns.
            NSColor(white: 1, alpha: 0.9).setFill()
            NSRect(x: 0, y: 128, width: 512, height: 6).fill()
            NSColor(white: 0.8, alpha: 0.8).setFill()
            NSBezierPath(roundedRect: NSRect(x: 330, y: 120, width: 90, height: 100), xRadius: 18, yRadius: 18).fill()
            return true
        }
    }()

    /// A dark oval fading to nothing, drawn flat under the model.
    static let contactShadow: NSImage = {
        NSImage(size: NSSize(width: 256, height: 128), flipped: false) { rect in
            NSGradient(colors: [NSColor(white: 0, alpha: 0.9), NSColor(white: 0, alpha: 0)])?
                .draw(in: NSBezierPath(ovalIn: rect), relativeCenterPosition: .zero)
            return true
        }
    }()

    static let perforation: NSImage = {
        NSImage(size: NSSize(width: 8, height: 8), flipped: false) { rect in
            NSColor(white: 0.16, alpha: 1).setFill()
            rect.fill()
            NSColor(white: 0.04, alpha: 1).setFill()
            NSBezierPath(ovalIn: NSRect(x: 2, y: 2, width: 4, height: 4)).fill()
            return true
        }
    }()

    static let oneplusLogo: NSImage = {
        NSImage(size: NSSize(width: 400, height: 60), flipped: false) { rect in
            let text = NSAttributedString(string: "ONEPLUS", attributes: [
                .font: NSFont.systemFont(ofSize: 44, weight: .semibold),
                .foregroundColor: NSColor(white: 0.92, alpha: 1),
                .kern: 6,
            ])
            let size = text.size()
            text.draw(at: NSPoint(x: (rect.width - size.width) / 2, y: (rect.height - size.height) / 2))
            return true
        }
    }()

    static let jblBadge: NSImage = {
        NSImage(size: NSSize(width: 160, height: 60), flipped: false) { rect in
            NSColor(red: 1, green: 0.4, blue: 0.05, alpha: 1).setFill()
            NSBezierPath(roundedRect: rect, xRadius: 10, yRadius: 10).fill()
            let text = NSAttributedString(string: "JBL", attributes: [
                .font: NSFont.systemFont(ofSize: 40, weight: .heavy),
                .foregroundColor: NSColor.white,
            ])
            let size = text.size()
            text.draw(at: NSPoint(x: (rect.width - size.width) / 2, y: (rect.height - size.height) / 2))
            return true
        }
    }()
}
