//
//  DeviceModels.swift
//  Visor
//

import AppKit
import SceneKit

/// Every model is built from SceneKit primitives, so the app ships no 3D
/// assets and no licences to credit. They are close, not exact: swap a
/// `node(for:)` case for a loaded USDZ if a real model turns up.
enum DeviceModels {
    /// Seconds for one slow turn once the model has settled.
    private static let turn: TimeInterval = 14
    /// Seconds for the fast first turn it arrives with.
    private static let spinIn: TimeInterval = 1.4

    /// Shows every model once in a 2-pt window off screen. A scene's first
    /// frame pays for shader compilation and the studio's reflection map
    /// (about 230 ms), which otherwise lands as the notch opens. A real view
    /// keeps that cost to ~10 MB; `SCNRenderer.snapshot` did the same job
    /// but held ~32 MB of GPU memory for the life of the app (measured).
    @MainActor static func prewarm() {
        Task { @MainActor in
            // Out of the way of launch, which has its own windows to draw.
            try? await Task.sleep(for: .seconds(3))
            let window = NSWindow(contentRect: NSRect(x: -10_000, y: -10_000, width: 2, height: 2),
                                  styleMask: .borderless, backing: .buffered, defer: false)
            window.isReleasedWhenClosed = false
            window.ignoresMouseEvents = true
            window.sharingType = .none
            window.orderFrontRegardless()
            for kind in DeviceKind.allCases {
                let view = SCNView(frame: NSRect(x: 0, y: 0, width: 2, height: 2))
                view.antialiasingMode = .multisampling4X
                view.scene = scene(for: kind)
                window.contentView?.addSubview(view)
                try? await Task.sleep(for: .milliseconds(400))
                view.removeFromSuperview()
            }
            window.orderOut(nil)
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
        let grow = SCNAction.scale(to: CGFloat(kind.scale), duration: 0.7)
        // Ease-out-back: a few percent past full size, then settles, like a thing set down.
        grow.timingFunction = { t in 1 + 2.2 * pow(t - 1, 3) + 1.2 * pow(t - 1, 2) }
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
        let white = material(NSColor(white: 0.97, alpha: 1), roughness: 0.22, clearCoat: 0.8)
        let tip = material(NSColor(white: 0.86, alpha: 1), roughness: 0.75)
        let mesh = material(NSColor(white: 0.12, alpha: 1), roughness: 0.8)
        let grille = meshGrille(NSColor(white: 0.25, alpha: 1))
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
                             stem: Stem(length: 0.34, flatten: 1, taper: 0.85, cap: grille, strip: tip))
            liftOut(bud, to: SCNVector3(0.4 * side, 0.3, 0), from: shell.position.y, order: side < 0 ? 0 : 1)
            root.addChildNode(bud)
        }
        return wrapped(root)
    }

    // MARK: OnePlus Buds 3

    private static func oneplusBuds() -> SCNNode {
        // Mirror-polished steel blue: the buds read as chrome, the case as matte.
        let chrome = material(NSColor(red: 0.58, green: 0.7, blue: 0.88, alpha: 1), metalness: 1, roughness: 0.08)
        let tip = material(NSColor(red: 0.42, green: 0.58, blue: 0.78, alpha: 1), roughness: 0.7)
        let matte = material(NSColor(red: 0.47, green: 0.64, blue: 0.84, alpha: 1), roughness: 0.42, clearCoat: 0.25)
        let root = SCNNode()

        let shell = earCase(size: SCNVector3(0.7, 0.46, 0.36), chamfer: 0.12, body: matte, seam: -0.15)
        // Unlit: polished lettering disappeared into the matte blue in renders.
        let lettering = unlit(DeviceTextures.oneplusLogo)
        lettering.transparencyMode = .aOne
        let logo = SCNNode(geometry: SCNPlane(width: 0.4, height: 0.06))
        logo.geometry?.firstMaterial = lettering
        // On the lid, so it lifts with it.
        let lid = shell.childNode(withName: "lid", recursively: true)
        logo.position = SCNVector3(0, 0, 0.181)
        lid?.addChildNode(logo)
        shell.position.y = -0.44
        root.addChildNode(shell)

        for side: CGFloat in [-1, 1] {
            let bud = earbud(side: side, shell: chrome, tip: tip,
                             stem: Stem(length: 0.44, flatten: 0.7, taper: 0.8, cap: meshGrille(NSColor(white: 0.55, alpha: 1)), strip: nil))
            // Staggered like the product shot, one bud a little lower.
            liftOut(bud, to: SCNVector3(0.42 * side, side < 0 ? 0.36 : 0.26, 0), from: shell.position.y, order: side < 0 ? 0 : 1)
            root.addChildNode(bud)
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
        // Brushed gunmetal band along the top front edge.
        let trim = SCNNode(geometry: SCNBox(width: 2.5, height: 0.012, length: 0.02, chamferRadius: 0.005))
        trim.geometry?.firstMaterial = material(NSColor(white: 0.35, alpha: 1), metalness: 1, roughness: 0.32)
        trim.position = SCNVector3(0, 0.128, 0.212)
        root.addChildNode(trim)

        // Powers on as it arrives: the status light sweeps open, then settles dim.
        let status = SCNNode(geometry: SCNCapsule(capRadius: 0.006, height: 0.06))
        status.geometry?.firstMaterial = unlit(NSColor(white: 1, alpha: 0.9))
        status.eulerAngles.z = .pi / 2
        status.position = SCNVector3(0, -0.07, 0.224)
        status.scale = SCNVector3(1, 0.05, 1)
        status.opacity = 0
        let sweep = SCNAction.customAction(duration: 0.45) { node, elapsed in
            let t = Float(elapsed / 0.45)
            node.scale.y = CGFloat(0.05 + 0.95 * (1 - pow(1 - t, 3)))
        }
        status.runAction(.sequence([
            .wait(duration: 0.5), .fadeIn(duration: 0.1), sweep, .wait(duration: 0.6), .fadeOpacity(to: 0.55, duration: 0.8),
        ]))
        root.addChildNode(status)

        // The bass driver's first note: a tiny vertical pulse of the whole bar.
        let swell = SCNAction.scale(to: 1.018, duration: 0.07)
        swell.timingMode = .easeOut
        let settle = SCNAction.scale(to: 1, duration: 0.3)
        settle.timingMode = .easeInEaseOut
        root.runAction(.sequence([.wait(duration: 0.75), swell, settle]))

        for offset: CGFloat in [-1.1, 1.1] {
            let foot = SCNNode(geometry: SCNBox(width: 0.18, height: 0.03, length: 0.3, chamferRadius: 0.01))
            foot.geometry?.firstMaterial = material(NSColor(white: 0.04, alpha: 1), roughness: 0.95)
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

    /// Rises out of the opened case, one bud after the other, then floats.
    private static func liftOut(_ bud: SCNNode, to place: SCNVector3, from caseY: CGFloat, order: Int) {
        bud.position = SCNVector3(place.x * 0.35, caseY, 0)
        bud.scale = SCNVector3(0.6, 0.6, 0.6)
        bud.opacity = 0
        let rise = SCNAction.move(to: place, duration: 0.75)
        rise.timingFunction = { t in 1 + 2.2 * pow(t - 1, 3) + 1.2 * pow(t - 1, 2) }
        let grow = SCNAction.scale(to: 1, duration: 0.5)
        grow.timingMode = .easeOut
        let float = SCNAction.moveBy(x: 0, y: 0.035, z: 0, duration: 1.2)
        float.timingMode = .easeInEaseOut
        bud.runAction(.sequence([
            .wait(duration: 0.55 + Double(order) * 0.2),
            .group([rise, grow, .fadeIn(duration: 0.2)]),
            .wait(duration: Double(order) * 0.6),
            .repeatForever(.sequence([float, float.reversed()])),
        ]))
    }

    /// A two-part case split at `seam` (height above centre). The lid hangs
    /// on a hinge at the back and swings open as the case arrives.
    private static func earCase(size: SCNVector3, chamfer: CGFloat, body: SCNMaterial, seam: CGFloat) -> SCNNode {
        let (width, height, depth) = (size.x, size.y, size.z)
        let shell = SCNNode()
        let baseHeight = height / 2 + seam
        let lidHeight = height / 2 - seam

        // Chamfering each half rounds the edges at the seam too, which reads as the real parting line.
        let base = SCNNode(geometry: SCNBox(width: width, height: baseHeight, length: depth,
                                            chamferRadius: min(chamfer, baseHeight / 2)))
        base.geometry?.firstMaterial = body
        base.position.y = -height / 2 + baseHeight / 2
        shell.addChildNode(base)

        let hinge = SCNNode()
        hinge.position = SCNVector3(0, seam, -depth / 2)
        let lid = SCNNode(geometry: SCNBox(width: width, height: lidHeight, length: depth,
                                           chamferRadius: min(chamfer, lidHeight / 2)))
        lid.name = "lid"
        lid.geometry?.firstMaterial = body
        lid.position = SCNVector3(0, lidHeight / 2 + 0.004, depth / 2)
        hinge.addChildNode(lid)
        shell.addChildNode(hinge)

        // The dark bud wells, seen once the lid is up.
        let well = SCNNode(geometry: SCNPlane(width: width * 0.78, height: depth * 0.62))
        well.geometry?.firstMaterial = material(NSColor(white: 0.06, alpha: 1), roughness: 0.9)
        well.eulerAngles.x = -.pi / 2
        well.position.y = seam + 0.002
        shell.addChildNode(well)

        let open = SCNAction.rotateTo(x: -1.75, y: 0, z: 0, duration: 0.55)
        // Snaps past the detent, then eases back onto it like a magnet-held lid.
        open.timingFunction = { t in 1 + 2.6 * pow(t - 1, 3) + 1.6 * pow(t - 1, 2) }
        hinge.runAction(.sequence([.wait(duration: 0.3), open]))

        let led = SCNNode(geometry: SCNSphere(radius: 0.016))
        led.geometry?.firstMaterial = unlit(NSColor(red: 0.45, green: 1, blue: 0.55, alpha: 1))
        // Mid-height on the base's flat front, so it stays put as the lid lifts.
        led.position = SCNVector3(0, -height / 2 + baseHeight / 2, depth / 2 + 0.003)
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

    private static func material(_ color: Any, metalness: CGFloat = 0, roughness: CGFloat,
                                 clearCoat: CGFloat = 0) -> SCNMaterial {
        let material = SCNMaterial()
        material.lightingModel = .physicallyBased
        material.diffuse.contents = color
        material.metalness.contents = metalness
        material.roughness.contents = roughness
        // A lacquer layer over the base colour: how glossy plastic actually catches light.
        material.clearCoat.contents = clearCoat
        material.clearCoatRoughness.contents = 0.05
        return material
    }

    /// The perforated mic mesh at a stem's foot.
    private static func meshGrille(_ tint: NSColor) -> SCNMaterial {
        let grille = material(DeviceTextures.perforation, metalness: 0.6, roughness: 0.5)
        grille.multiply.contents = tint
        grille.diffuse.wrapS = .repeat
        grille.diffuse.wrapT = .repeat
        grille.diffuse.contentsTransform = SCNMatrix4MakeScale(6, 6, 1)
        return grille
    }

    private static func unlit(_ contents: Any) -> SCNMaterial {
        let material = SCNMaterial()
        material.lightingModel = .constant
        material.diffuse.contents = contents
        return material
    }
}
