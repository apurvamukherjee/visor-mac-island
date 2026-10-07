// Exports the real macOS icons used on the site from the apps installed on this Mac.
// Run on a Mac: `swift scripts/mac-icons.swift`. Output goes to src/icons/apps/ as PNG; convert with cwebp (see NOTICE.md there).
import AppKit

let core = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources"
let sources: [String: String] = [
    "finder": "/System/Library/CoreServices/Finder.app",
    "safari": "/Applications/Safari.app",
    "messages": "/System/Applications/Messages.app",
    "notes": "/System/Applications/Notes.app",
    "quicktime": "/System/Applications/QuickTime Player.app",
    "terminal": "/System/Applications/Utilities/Terminal.app",
    "settings": "/System/Applications/System Settings.app",
    "appstore": "/System/Applications/App Store.app",
    "apps": "/System/Applications/Apps.app",
    "calendar": "/System/Applications/Calendar.app",
    "clock": "/System/Applications/Clock.app",
    "facetime": "/System/Applications/FaceTime.app",
    "maps": "/System/Applications/Maps.app",
    "music": "/System/Applications/Music.app",
    "photos": "/System/Applications/Photos.app",
    "preview": "/System/Applications/Preview.app",
    "weather": "/System/Applications/Weather.app",
    "xcode": "/Applications/Xcode.app",
    "chrome": "/Applications/Google Chrome.app",
    "whatsapp": "/Applications/WhatsApp.app",
    "discord": "/Applications/Discord.app",
    "downloads": "\(core)/DownloadsFolder.icns",
    "trash": "\(core)/TrashIcon.icns",
    "folder": "\(core)/GenericFolderIcon.icns",
    "file": "\(core)/GenericDocumentIcon.icns",
]

let size = 256
let out = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "src/icons/apps")
try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

for (name, path) in sources.sorted(by: { $0.key < $1.key }) {
    guard FileManager.default.fileExists(atPath: path) else {
        FileHandle.standardError.write("missing: \(path)\n".data(using: .utf8)!)
        exit(1)
    }
    let image = path.hasSuffix(".icns") ? NSImage(contentsOfFile: path)! : NSWorkspace.shared.icon(forFile: URL(fileURLWithPath: path).resolvingSymlinksInPath().path)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    image.draw(in: NSRect(x: 0, y: 0, width: size, height: size))
    NSGraphicsContext.restoreGraphicsState()
    try rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent("\(name).png"))
    print("\(name).png")
}
