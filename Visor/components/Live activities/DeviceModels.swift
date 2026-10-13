//
//  DeviceModels.swift
//  Visor
//

import AppKit
import SceneKit
import SwiftUI

/// The audio devices Visor shows a model for. Anything else that connects
/// is left alone: an unknown speaker has no model to turn.
enum DeviceKind: CaseIterable {
    case airpods, oneplusBuds, jblBar

    init?(deviceName: String) {
        let name = deviceName.lowercased()
        if name.contains("airpods") {
            self = .airpods
        } else if name.contains("oneplus buds") {
            self = .oneplusBuds
        } else if name.contains("jbl cinema") || name.contains("jbl bar") {
            self = .jblBar
        } else {
            return nil
        }
    }

    var glow: Color {
        switch self {
        case .airpods: Color(white: 0.9)
        case .oneplusBuds: Color(red: 0.25, green: 0.5, blue: 1)
        case .jblBar: Color(red: 1, green: 0.45, blue: 0.1)
        }
    }

    var hasBattery: Bool { self != .jblBar }

    /// How far the model sits from the camera's frame: the soundbar is a
    /// metre wide where the earbuds are a thumb tall.
    fileprivate var scale: Float {
        switch self {
        case .airpods, .oneplusBuds: 1.35
        case .jblBar: 0.95
        }
    }
}

/// Battery levels as macOS reports them, 0–100. AirPods give left, right and
/// case; most other headsets give one level for the pair.
struct DeviceBattery: Equatable {
    var left: Int?
    var right: Int?
    var caseLevel: Int?
    var main: Int?

    var isEmpty: Bool { left == nil && right == nil && caseLevel == nil && main == nil }

    /// Reads `system_profiler SPBluetoothDataType -json` output for the
    /// connected device called `name`.
    static func parse(_ json: Data, name: String) -> DeviceBattery? {
        guard let root = try? JSONSerialization.jsonObject(with: json) as? [String: Any],
              let controller = (root["SPBluetoothDataType"] as? [[String: Any]])?.first,
              let connected = controller["device_connected"] as? [[String: [String: Any]]],
              let info = connected.lazy.compactMap({ $0[name] }).first
        else { return nil }
        func level(_ key: String) -> Int? {
            (info[key] as? String).flatMap { Int($0.replacingOccurrences(of: "%", with: "")) }
        }
        let battery = DeviceBattery(
            left: level("device_batteryLevelLeft"), right: level("device_batteryLevelRight"),
            caseLevel: level("device_batteryLevelCase"), main: level("device_batteryLevelMain")
        )
        return battery.isEmpty ? nil : battery
    }
}

/// Every model is built from SceneKit primitives, so the app ships no 3D
/// assets and no licences to credit. They are close, not exact: swap a
/// `node(for:)` case for a loaded USDZ if a real model turns up.
enum DeviceModels {
    static func scene(for kind: DeviceKind) -> SCNScene {
        let scene = SCNScene()
        scene.lightingEnvironment.contents = studio
        scene.lightingEnvironment.intensity = 2.8

        let model = node(for: kind)
        model.scale = SCNVector3(kind.scale, kind.scale, kind.scale)
        model.eulerAngles.y = -.pi / 5
        // A turntable: the turn is linear so the speed never seems to breathe.
        model.runAction(.repeatForever(.rotateBy(x: 0, y: 2 * .pi, z: 0, duration: 14)))
        scene.rootNode.addChildNode(model)

        let camera = SCNNode()
        camera.camera = SCNCamera()
        camera.camera?.fieldOfView = 28
        camera.position = SCNVector3(0, 0.55, 4)
        camera.look(at: SCNVector3(0, 0, 0))
        scene.rootNode.addChildNode(camera)
        return scene
    }

    private static func node(for kind: DeviceKind) -> SCNNode {
        switch kind {
        case .airpods: airpods()
        case .oneplusBuds: oneplusBuds()
        case .jblBar: jblBar()
        }
    }

    // MARK: AirPods

    // The buds are the subject; the case sits small beneath them.
    private static func airpods() -> SCNNode {
        let white = material(NSColor(white: 0.97, alpha: 1), roughness: 0.18)
        let tip = material(NSColor(white: 0.86, alpha: 1), roughness: 0.75)
        let root = SCNNode()
        let shell = earCase(size: SCNVector3(0.62, 0.46, 0.24), chamfer: 0.11, body: white, seam: 0.1)
        shell.position.y = -0.42
        root.addChildNode(shell)
        for side: CGFloat in [-1, 1] {
            let bud = earbud(side: side, shell: white, tip: tip, stemLength: 0.34, stemFlatten: 1)
            bud.position = SCNVector3(0.4 * side, 0.3, 0)
            root.addChildNode(bud)
        }
        return wrapped(root)
    }

    // MARK: OnePlus Buds 3

    private static func oneplusBuds() -> SCNNode {
        // Mirror-polished steel blue: the buds read as chrome, the case as matte.
        let chrome = material(NSColor(red: 0.58, green: 0.7, blue: 0.88, alpha: 1), metalness: 1, roughness: 0.07)
        let tip = material(NSColor(red: 0.42, green: 0.58, blue: 0.78, alpha: 1), roughness: 0.7)
        let matte = material(NSColor(red: 0.47, green: 0.64, blue: 0.84, alpha: 1), roughness: 0.42)
        let root = SCNNode()
        let shell = earCase(size: SCNVector3(0.7, 0.46, 0.36), chamfer: 0.12, body: matte, seam: -0.15)
        let logo = SCNNode(geometry: SCNPlane(width: 0.4, height: 0.06))
        logo.geometry?.firstMaterial = unlit(oneplusLogo)
        logo.geometry?.firstMaterial?.transparencyMode = .aOne
        logo.position = SCNVector3(0, 0.04, 0.181)
        shell.addChildNode(logo)
        shell.position.y = -0.44
        root.addChildNode(shell)
        for side: CGFloat in [-1, 1] {
            let bud = earbud(side: side, shell: chrome, tip: tip, stemLength: 0.44, stemFlatten: 0.7)
            // Staggered like the product shot, one bud a little lower.
            bud.position = SCNVector3(0.42 * side, side < 0 ? 0.36 : 0.26, 0)
            root.addChildNode(bud)
        }
        return wrapped(root)
    }

    // MARK: JBL Cinema SB510

    private static func jblBar() -> SCNNode {
        let shell = material(NSColor(white: 0.1, alpha: 1), roughness: 0.55)
        let root = SCNNode()

        let body = SCNNode(geometry: SCNBox(width: 2.6, height: 0.3, length: 0.44, chamferRadius: 0.05))
        body.geometry?.firstMaterial = shell
        root.addChildNode(body)

        let grille = SCNNode(geometry: SCNPlane(width: 2.5, height: 0.22))
        let grilleMaterial = SCNMaterial()
        grilleMaterial.diffuse.contents = perforation
        grilleMaterial.diffuse.wrapS = .repeat
        grilleMaterial.diffuse.wrapT = .repeat
        grilleMaterial.diffuse.contentsTransform = SCNMatrix4MakeScale(34, 3, 1)
        grilleMaterial.roughness.contents = 0.9
        grilleMaterial.lightingModel = .physicallyBased
        grille.geometry?.firstMaterial = grilleMaterial
        grille.position = SCNVector3(0, 0, 0.2215)
        root.addChildNode(grille)

        let badge = SCNNode(geometry: SCNPlane(width: 0.2, height: 0.075))
        badge.geometry?.firstMaterial = unlit(jblBadge)
        badge.position = SCNVector3(-1.0, 0, 0.224)
        root.addChildNode(badge)

        for offset: Float in [-1.1, 1.1] {
            let foot = SCNNode(geometry: SCNBox(width: 0.18, height: 0.03, length: 0.3, chamferRadius: 0.01))
            foot.geometry?.firstMaterial = material(NSColor(white: 0.04, alpha: 1), roughness: 0.8)
            foot.position = SCNVector3(offset, -0.165, 0)
            root.addChildNode(foot)
        }
        return wrapped(root)
    }

    // MARK: Shared parts

    /// Lets the root keep its own turning while the model inside it can be
    /// offset to the visual centre.
    private static func wrapped(_ node: SCNNode) -> SCNNode {
        let holder = SCNNode()
        holder.addChildNode(node)
        return holder
    }

    private static func earCase(size: SCNVector3, chamfer: CGFloat, body: SCNMaterial, seam: CGFloat) -> SCNNode {
        let (width, height, depth) = (size.x, size.y, size.z)
        let shell = SCNNode(geometry: SCNBox(width: width, height: height, length: depth, chamferRadius: chamfer))
        shell.geometry?.firstMaterial = body

        let outline = NSBezierPath(roundedRect: NSRect(x: -(width + 0.004) / 2, y: -(depth + 0.004) / 2,
                                                      width: width + 0.004, height: depth + 0.004),
                                   xRadius: chamfer, yRadius: chamfer)
        outline.flatness = 0.002
        let line = SCNNode(geometry: SCNShape(path: outline, extrusionDepth: 0.012))
        line.eulerAngles.x = -.pi / 2
        line.geometry?.firstMaterial = material(NSColor(white: 0.08, alpha: 1), roughness: 0.6)
        line.position.y = seam
        shell.addChildNode(line)

        let led = SCNNode(geometry: SCNSphere(radius: 0.016))
        led.geometry?.firstMaterial = unlit(NSColor(red: 0.45, green: 1, blue: 0.55, alpha: 1))
        // Below a high seam, above a low one: either way on the flat front.
        led.position = SCNVector3(0, seam > 0 ? seam - 0.07 : seam + 0.06, depth / 2 + 0.003)
        shell.addChildNode(led)
        return shell
    }

    /// A stemmed earbud seen side-on: the stem drops from a rounded head
    /// whose silicone tip points toward the other bud (`side` is -1 left, 1 right).
    private static func earbud(side: CGFloat, shell: SCNMaterial, tip: SCNMaterial,
                               stemLength: CGFloat, stemFlatten: CGFloat) -> SCNNode {
        let bud = SCNNode()
        let inward = -side

        let stem = SCNNode(geometry: SCNCapsule(capRadius: 0.055, height: stemLength))
        stem.geometry?.firstMaterial = shell
        stem.scale = SCNVector3(1, 1, stemFlatten)
        stem.position.y = -stemLength / 2 + 0.06
        bud.addChildNode(stem)

        let head = SCNNode(geometry: SCNSphere(radius: 0.12))
        head.geometry?.firstMaterial = shell
        head.scale = SCNVector3(1.2, 0.92, 1)
        head.position = SCNVector3(0.05 * inward, 0.07, 0)
        bud.addChildNode(head)

        let nozzle = SCNNode(geometry: SCNCylinder(radius: 0.045, height: 0.08))
        nozzle.geometry?.firstMaterial = shell
        nozzle.eulerAngles.z = .pi / 2
        nozzle.position = SCNVector3(0.18 * inward, 0.06, 0.01)
        bud.addChildNode(nozzle)

        let ear = SCNNode(geometry: SCNSphere(radius: 0.085))
        ear.geometry?.firstMaterial = tip
        ear.scale = SCNVector3(0.62, 1, 1)
        ear.position = SCNVector3(0.23 * inward, 0.06, 0.01)
        bud.addChildNode(ear)

        let slot = SCNNode(geometry: SCNCapsule(capRadius: 0.012, height: 0.1))
        slot.geometry?.firstMaterial = material(NSColor(white: 0.05, alpha: 1), roughness: 0.8)
        slot.eulerAngles.z = .pi / 2
        slot.position = SCNVector3(0.06 * inward, 0.172, 0)
        bud.addChildNode(slot)

        bud.eulerAngles.z = 0.12 * side
        return bud
    }

    private static func material(_ color: NSColor, metalness: CGFloat = 0, roughness: CGFloat) -> SCNMaterial {
        let material = SCNMaterial()
        material.lightingModel = .physicallyBased
        material.diffuse.contents = color
        material.metalness.contents = metalness
        material.roughness.contents = roughness
        return material
    }

    private static func unlit(_ contents: Any) -> SCNMaterial {
        let material = SCNMaterial()
        material.lightingModel = .constant
        material.diffuse.contents = contents
        return material
    }

    // MARK: Generated textures

    /// A dim room with two soft boxes: it is what the glossy parts reflect,
    /// and without it physically based materials render flat grey.
    private static let studio: NSImage = {
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

    private static let perforation: NSImage = {
        NSImage(size: NSSize(width: 8, height: 8), flipped: false) { rect in
            NSColor(white: 0.16, alpha: 1).setFill()
            rect.fill()
            NSColor(white: 0.04, alpha: 1).setFill()
            NSBezierPath(ovalIn: NSRect(x: 2, y: 2, width: 4, height: 4)).fill()
            return true
        }
    }()

    private static let oneplusLogo: NSImage = {
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

    private static let jblBadge: NSImage = {
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

/// The turntable in SwiftUI. It only exists while the notch shows the device,
/// so the scene renders for a few seconds and is torn down with the view.
struct DeviceModelView: NSViewRepresentable {
    let kind: DeviceKind

    func makeNSView(context: Context) -> SCNView {
        let view = SCNView()
        view.backgroundColor = .clear
        view.antialiasingMode = .multisampling4X
        view.preferredFramesPerSecond = 30
        view.scene = DeviceModels.scene(for: kind)
        view.isPlaying = true
        return view
    }

    func updateNSView(_ view: SCNView, context: Context) {}
}
