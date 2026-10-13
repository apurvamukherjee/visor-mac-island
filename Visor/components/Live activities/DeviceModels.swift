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
        if name.contains("airpods") { self = .airpods }
        else if name.contains("oneplus buds") { self = .oneplusBuds }
        else if name.contains("jbl cinema") || name.contains("jbl bar") { self = .jblBar }
        else { return nil }
    }

    var glow: Color {
        switch self {
        case .airpods: Color(white: 0.9)
        case .oneplusBuds: Color(red: 0.25, green: 0.5, blue: 1)
        case .jblBar: Color(red: 1, green: 0.45, blue: 0.1)
        }
    }

    /// How far the model sits from the camera's frame: the soundbar is a
    /// metre wide where the earbuds are a thumb tall.
    fileprivate var scale: Float {
        switch self {
        case .airpods, .oneplusBuds: 1.45
        case .jblBar: 0.95
        }
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

    private static func airpods() -> SCNNode {
        let white = material(NSColor(white: 0.97, alpha: 1), roughness: 0.28)
        let root = SCNNode()
        root.addChildNode(earCase(width: 0.78, height: 0.56, depth: 0.3, chamfer: 0.14, body: white, seam: 0.1))
        for side: Float in [-1, 1] {
            let bud = earbud(head: white, stem: white, grille: NSColor(white: 0.12, alpha: 1))
            bud.position = SCNVector3(0.2 * side, 0.62, 0)
            bud.eulerAngles.z = CGFloat(side) * -0.18
            root.addChildNode(bud)
        }
        root.position.y = -0.35
        return wrapped(root)
    }

    // MARK: OnePlus Buds 3

    private static func oneplusBuds() -> SCNNode {
        let blue = material(NSColor(red: 0.12, green: 0.38, blue: 0.95, alpha: 1), metalness: 0.95, roughness: 0.2)
        let silver = material(NSColor(white: 0.85, alpha: 1), metalness: 1, roughness: 0.15)
        let root = SCNNode()
        // Wider and flatter than the AirPods case, with a ring on the lid.
        let body = earCase(width: 0.86, height: 0.5, depth: 0.42, chamfer: 0.2, body: blue, seam: 0.08)
        let ring = SCNNode(geometry: SCNTorus(ringRadius: 0.1, pipeRadius: 0.012))
        ring.geometry?.firstMaterial = silver
        ring.position = SCNVector3(0, 0.02, 0.215)
        ring.eulerAngles.x = .pi / 2
        body.addChildNode(ring)
        root.addChildNode(body)
        for side: Float in [-1, 1] {
            let bud = earbud(head: blue, stem: blue, grille: NSColor(white: 0.1, alpha: 1))
            let band = SCNNode(geometry: SCNTorus(ringRadius: 0.052, pipeRadius: 0.01))
            band.geometry?.firstMaterial = silver
            band.position = SCNVector3(0, -0.2, 0)
            bud.addChildNode(band)
            bud.position = SCNVector3(0.22 * side, 0.6, 0)
            bud.eulerAngles.z = CGFloat(side) * -0.22
            root.addChildNode(bud)
        }
        root.position.y = -0.33
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

        for x: Float in [-1.1, 1.1] {
            let foot = SCNNode(geometry: SCNBox(width: 0.18, height: 0.03, length: 0.3, chamferRadius: 0.01))
            foot.geometry?.firstMaterial = material(NSColor(white: 0.04, alpha: 1), roughness: 0.8)
            foot.position = SCNVector3(x, -0.165, 0)
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

    private static func earCase(width: CGFloat, height: CGFloat, depth: CGFloat, chamfer: CGFloat,
                                body: SCNMaterial, seam: CGFloat) -> SCNNode {
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
        led.position = SCNVector3(0, seam - 0.07, depth / 2 + 0.003)
        shell.addChildNode(led)
        return shell
    }

    private static func earbud(head: SCNMaterial, stem: SCNMaterial, grille: NSColor) -> SCNNode {
        let bud = SCNNode()
        let top = SCNNode(geometry: SCNSphere(radius: 0.13))
        top.geometry?.firstMaterial = head
        top.scale = SCNVector3(1, 0.95, 1.15)
        bud.addChildNode(top)

        let shaft = SCNNode(geometry: SCNCapsule(capRadius: 0.042, height: 0.36))
        shaft.geometry?.firstMaterial = stem
        shaft.position = SCNVector3(0, -0.17, -0.02)
        bud.addChildNode(shaft)

        let mesh = SCNNode(geometry: SCNSphere(radius: 0.04))
        mesh.geometry?.firstMaterial = material(grille, roughness: 0.7)
        mesh.position = SCNVector3(0, 0.0, 0.11)
        bud.addChildNode(mesh)
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
