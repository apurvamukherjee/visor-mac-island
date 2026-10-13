//
//  DeviceModels.swift
//  Visor
//

import AppKit
import Metal
import SceneKit

/// Every model is built from SceneKit primitives, so the app ships no 3D
/// assets and no licences to credit. They are close, not exact: swap a
/// `node(for:)` case for a loaded USDZ if a real model turns up.
enum DeviceModels {
    /// Seconds for one slow turn once the model has settled.
    private static let turn: TimeInterval = 14
    /// Seconds for the fast first turn it arrives with.
    private static let spinIn: TimeInterval = 1.4

    /// Draws every model once off screen. The first frame of a scene pays
    /// for shader compilation and the studio's reflection map (about 230 ms
    /// measured); paid at launch, the notch's own first frame costs ~13 ms
    /// and the model is there the moment the notch opens.
    static func prewarm() {
        DispatchQueue.global(qos: .utility).async {
            let renderer = SCNRenderer(device: MTLCreateSystemDefaultDevice(), options: nil)
            for kind in DeviceKind.allCases {
                let scene = scene(for: kind)
                renderer.scene = scene
                renderer.pointOfView = scene.rootNode.childNode(withName: "camera", recursively: false)
                _ = renderer.snapshot(atTime: 0, with: CGSize(width: 64, height: 36), antialiasingMode: .multisampling4X)
            }
        }
    }

    static func scene(for kind: DeviceKind) -> SCNScene {
        let scene = SCNScene()
        scene.lightingEnvironment.contents = DeviceTextures.studio
        scene.lightingEnvironment.intensity = 2.8

        let model = node(for: kind)
        let (low, high) = model.boundingBox
        let footprint = CGFloat(max(high.x - low.x, high.z - low.z)) * CGFloat(kind.scale)

        // Arrives small and spinning fast, then eases into the slow turn.
        // The ease ends at exactly the turntable's speed, so there is no
        // hitch where one action hands over to the next.
        model.scale = SCNVector3(kind.scale * 0.55, kind.scale * 0.55, kind.scale * 0.55)
        model.eulerAngles.y = -.pi / 5
        let grow = SCNAction.scale(to: CGFloat(kind.scale), duration: 0.6)
        grow.timingMode = .easeOut
        let arrive = SCNAction.rotateBy(x: 0, y: 2 * .pi, z: 0, duration: spinIn)
        let endSpeed = Float(spinIn / turn)
        arrive.timingFunction = { t in (1 - endSpeed) * (1 - pow(1 - t, 3)) + endSpeed * t }
        let spin = SCNAction.repeatForever(.rotateBy(x: 0, y: 2 * .pi, z: 0, duration: turn))
        model.runAction(.group([grow, .sequence([arrive, spin])]))
        scene.rootNode.addChildNode(model)

        // A soft contact shadow that stays put while the model turns above it.
        let shadow = SCNNode(geometry: SCNPlane(width: footprint * 1.1, height: footprint * 0.45))
        shadow.geometry?.firstMaterial = unlit(DeviceTextures.contactShadow)
        shadow.geometry?.firstMaterial?.writesToDepthBuffer = false
        shadow.geometry?.firstMaterial?.transparencyMode = .aOne
        shadow.eulerAngles.x = -.pi / 2
        shadow.position.y = low.y * CGFloat(kind.scale) - 0.04
        shadow.opacity = 0
        shadow.runAction(.fadeOpacity(to: 0.55, duration: 0.6))
        scene.rootNode.addChildNode(shadow)

        let camera = SCNNode()
        camera.name = "camera"
        camera.camera = SCNCamera()
        camera.camera?.fieldOfView = 28
        camera.position = SCNVector3(0, 0.55, 4)
        camera.look(at: SCNVector3(0, -0.05, 0))
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
        let white = material(NSColor(white: 0.97, alpha: 1), roughness: 0.16)
        let tip = material(NSColor(white: 0.86, alpha: 1), roughness: 0.75)
        let mesh = material(NSColor(white: 0.12, alpha: 1), roughness: 0.8)
        let root = SCNNode()

        let shell = earCase(size: SCNVector3(0.62, 0.46, 0.24), chamfer: 0.11, body: white, seam: 0.1)
        // The lanyard loop on the right edge, the USB-C port and speaker holes underneath.
        let loop = SCNNode(geometry: SCNTorus(ringRadius: 0.035, pipeRadius: 0.009))
        loop.geometry?.firstMaterial = material(NSColor(white: 0.8, alpha: 1), metalness: 1, roughness: 0.2)
        loop.eulerAngles.z = .pi / 2
        loop.position = SCNVector3(0.31, -0.12, 0)
        shell.addChildNode(loop)
        let port = SCNNode(geometry: SCNCapsule(capRadius: 0.012, height: 0.08))
        port.geometry?.firstMaterial = mesh
        port.eulerAngles.z = .pi / 2
        port.position = SCNVector3(0, -0.229, 0)
        shell.addChildNode(port)
        for offset: CGFloat in [-0.13, -0.1, 0.1, 0.13] {
            let hole = SCNNode(geometry: SCNSphere(radius: 0.008))
            hole.geometry?.firstMaterial = mesh
            hole.position = SCNVector3(offset, -0.229, 0)
            shell.addChildNode(hole)
        }
        shell.position.y = -0.42
        root.addChildNode(shell)

        for side: CGFloat in [-1, 1] {
            let bud = earbud(side: side, shell: white, tip: tip,
                             stem: Stem(length: 0.34, flatten: 1, taper: 0.85, cap: mesh, strip: tip))
            bud.position = SCNVector3(0.4 * side, 0.3, 0)
            root.addChildNode(bud)
            hover(bud, phase: side < 0 ? 0 : 0.6)
        }
        return wrapped(root)
    }

    // MARK: OnePlus Buds 3

    private static func oneplusBuds() -> SCNNode {
        // Mirror-polished steel blue: the buds read as chrome, the case as matte.
        let chrome = material(NSColor(red: 0.58, green: 0.7, blue: 0.88, alpha: 1), metalness: 1, roughness: 0.06)
        let tip = material(NSColor(red: 0.42, green: 0.58, blue: 0.78, alpha: 1), roughness: 0.7)
        let matte = material(NSColor(red: 0.47, green: 0.64, blue: 0.84, alpha: 1), roughness: 0.42)
        let root = SCNNode()

        let shell = earCase(size: SCNVector3(0.7, 0.46, 0.36), chamfer: 0.12, body: matte, seam: -0.15)
        // Unlit: polished lettering disappeared into the matte blue in renders.
        let lettering = unlit(DeviceTextures.oneplusLogo)
        lettering.transparencyMode = .aOne
        let logo = SCNNode(geometry: SCNPlane(width: 0.4, height: 0.06))
        logo.geometry?.firstMaterial = lettering
        logo.position = SCNVector3(0, 0.04, 0.181)
        shell.addChildNode(logo)
        shell.position.y = -0.44
        root.addChildNode(shell)

        for side: CGFloat in [-1, 1] {
            let bud = earbud(side: side, shell: chrome, tip: tip,
                             stem: Stem(length: 0.44, flatten: 0.7, taper: 0.8, cap: chrome, strip: nil))
            // Staggered like the product shot, one bud a little lower.
            bud.position = SCNVector3(0.42 * side, side < 0 ? 0.36 : 0.26, 0)
            root.addChildNode(bud)
            hover(bud, phase: side < 0 ? 0 : 0.6)
        }
        return wrapped(root)
    }

    // MARK: JBL Cinema SB510

    private static func jblBar() -> SCNNode {
        let shell = material(NSColor(white: 0.1, alpha: 1), roughness: 0.55)
        let root = SCNNode()

        let body = SCNNode(geometry: SCNBox(width: 2.6, height: 0.3, length: 0.44, chamferRadius: 0.07))
        body.geometry?.firstMaterial = shell
        root.addChildNode(body)

        let grille = SCNNode(geometry: SCNPlane(width: 2.44, height: 0.2))
        let grilleMaterial = SCNMaterial()
        grilleMaterial.lightingModel = .physicallyBased
        grilleMaterial.diffuse.contents = DeviceTextures.perforation
        grilleMaterial.diffuse.wrapS = .repeat
        grilleMaterial.diffuse.wrapT = .repeat
        grilleMaterial.diffuse.contentsTransform = SCNMatrix4MakeScale(40, 3.3, 1)
        grilleMaterial.roughness.contents = 0.9
        grille.geometry?.firstMaterial = grilleMaterial
        grille.position = SCNVector3(0, -0.005, 0.2215)
        root.addChildNode(grille)

        let badge = SCNNode(geometry: SCNPlane(width: 0.2, height: 0.075))
        badge.geometry?.firstMaterial = unlit(DeviceTextures.jblBadge)
        badge.position = SCNVector3(-1.0, -0.005, 0.224)
        root.addChildNode(badge)

        // Power, input and volume on top, and a white status light behind the grille.
        let key = material(NSColor(white: 0.16, alpha: 1), roughness: 0.35)
        for offset: CGFloat in [-0.18, -0.06, 0.06, 0.18] {
            let button = SCNNode(geometry: SCNCylinder(radius: 0.028, height: 0.012))
            button.geometry?.firstMaterial = key
            button.position = SCNVector3(offset, 0.152, 0.02)
            root.addChildNode(button)
        }
        let status = SCNNode(geometry: SCNCapsule(capRadius: 0.006, height: 0.06))
        status.geometry?.firstMaterial = unlit(NSColor(white: 1, alpha: 0.9))
        status.eulerAngles.z = .pi / 2
        status.position = SCNVector3(0, -0.07, 0.224)
        root.addChildNode(status)

        for offset: CGFloat in [-1.1, 1.1] {
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

    /// A slow float, so the buds read as lifted out of the case.
    private static func hover(_ node: SCNNode, phase: TimeInterval) {
        let rise = SCNAction.moveBy(x: 0, y: 0.035, z: 0, duration: 1.2)
        rise.timingMode = .easeInEaseOut
        node.runAction(.sequence([.wait(duration: phase), .repeatForever(.sequence([rise, rise.reversed()]))]))
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
        // Breathes like a case that has just been opened.
        let dim = SCNAction.fadeOpacity(to: 0.35, duration: 1)
        dim.timingMode = .easeInEaseOut
        let lit = SCNAction.fadeOpacity(to: 1, duration: 1)
        lit.timingMode = .easeInEaseOut
        led.runAction(.repeatForever(.sequence([dim, lit])))
        shell.addChildNode(led)
        return shell
    }

    private struct Stem {
        let length: CGFloat
        /// Front-to-back squash: 1 is round, lower is a flat blade.
        let flatten: CGFloat
        /// Bottom radius as a share of the top: stems narrow toward the mic.
        let taper: CGFloat
        /// The stem's foot, dark for a microphone mesh.
        let cap: SCNMaterial
        /// A touch strip down the front, if the bud has one.
        let strip: SCNMaterial?
    }

    /// A stemmed earbud seen side-on: the stem drops from a rounded head
    /// whose silicone tip points toward the other bud (`side` is -1 left, 1 right).
    private static func earbud(side: CGFloat, shell: SCNMaterial, tip: SCNMaterial, stem: Stem) -> SCNNode {
        let bud = SCNNode()
        let inward = -side
        let top: CGFloat = 0.055
        let bottom = top * stem.taper

        let blade = SCNNode()
        blade.scale = SCNVector3(1, 1, stem.flatten)
        let shaft = SCNNode(geometry: SCNCone(topRadius: top, bottomRadius: bottom, height: stem.length))
        shaft.geometry?.firstMaterial = shell
        shaft.position.y = -stem.length / 2 + 0.06
        blade.addChildNode(shaft)
        let foot = SCNNode(geometry: SCNSphere(radius: bottom))
        foot.geometry?.firstMaterial = stem.cap
        foot.position.y = -stem.length + 0.06
        blade.addChildNode(foot)
        if let strip = stem.strip {
            let press = SCNNode(geometry: SCNCapsule(capRadius: 0.012, height: stem.length * 0.35))
            press.geometry?.firstMaterial = strip
            press.position = SCNVector3(0, -stem.length * 0.35, (top + bottom) / 2 - 0.004)
            blade.addChildNode(press)
        }
        bud.addChildNode(blade)

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

        let dark = material(NSColor(white: 0.05, alpha: 1), roughness: 0.8)
        let slot = SCNNode(geometry: SCNCapsule(capRadius: 0.012, height: 0.1))
        slot.geometry?.firstMaterial = dark
        slot.eulerAngles.z = .pi / 2
        slot.position = SCNVector3(0.06 * inward, 0.172, 0)
        bud.addChildNode(slot)

        // The in-ear sensor on the face of the head.
        let sensor = SCNNode(geometry: SCNSphere(radius: 0.018))
        sensor.geometry?.firstMaterial = dark
        sensor.position = SCNVector3(0.08 * inward, 0.04, 0.105)
        bud.addChildNode(sensor)

        bud.eulerAngles.z = 0.12 * side
        return bud
    }

    private static func material(_ color: Any, metalness: CGFloat = 0, roughness: CGFloat) -> SCNMaterial {
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
}
