import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DeviceKind } from './devices';

// DeviceModels.swift: built from primitives, so no 3D assets or licences ship. Close, not exact.
const TURN_S = 14;
const SPIN_IN_S = 1.4;
const GROW_S = 0.7;
const W = 150;
const H = 84;

const glow: Record<DeviceKind, string> = { airpods: '#e6e6e6', oneplusBuds: '#4080ff', jblBar: '#ff731a' };
const scale: Record<DeviceKind, number> = { airpods: 1.35, oneplusBuds: 1.35, jblBar: 0.62 };

const material = (color: string, metalness = 0, roughness = 0.4, clearcoat = 0) =>
  new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat });

function earbud(side: number, shell: THREE.Material, tip: THREE.Material, stem: number) {
  const bud = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16), shell);
  head.scale.set(1, 1.05, 0.9);
  const tipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 12), tip);
  tipMesh.position.set(-0.09 * side, 0.02, 0.06);
  const stemMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, stem, 8, 16), shell);
  stemMesh.position.y = -stem / 2 - 0.06;
  bud.add(head, tipMesh, stemMesh);
  bud.rotation.z = 0.18 * side;
  return bud;
}

function buds(shellColor: string, caseColor: string, metal: boolean, stem: number) {
  const root = new THREE.Group();
  const shell = metal ? material(shellColor, 1, 0.15) : material(shellColor, 0, 0.22, 0.8);
  const tip = material('#dbdbdb', 0, 0.75);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.46, 0.26, 6, 0.11), material(caseColor, 0, metal ? 0.6 : 0.22, metal ? 0 : 0.8));
  box.position.y = -0.42;
  // The seam where the lid closes.
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.625, 0.006, 0.265), material('#9a9a9a', 0, 0.6));
  seam.position.y = -0.32;
  root.add(box, seam);
  for (const side of [-1, 1]) {
    const bud = earbud(side, shell, tip, stem);
    bud.position.set(0.4 * side, 0.3, 0);
    root.add(bud);
  }
  return root;
}

function jblBar() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.26, 0.34, 6, 0.1), material('#1c1c1e', 0.2, 0.5));
  const grille = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.2, 0.02, 2, 0.008), material('#2c2c2e', 0, 0.9));
  grille.position.z = 0.17;
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.01), material('#ff6a00', 0, 0.4));
  logo.position.set(0, 0, 0.185);
  root.add(body, grille, logo);
  return root;
}

const model = (kind: DeviceKind) =>
  kind === 'airpods' ? buds('#f7f7f7', '#f7f7f7', false, 0.34) : kind === 'oneplusBuds' ? buds('#5a7fb8', '#2e3440', true, 0.22) : jblBar();

/** Angle at `t` seconds: one fast turn that slows into the 14-second turntable, with no hitch between. */
function angle(t: number) {
  const slow = (2 * Math.PI) / TURN_S;
  if (t >= SPIN_IN_S) return 2 * Math.PI + slow * (t - SPIN_IN_S);
  const fast = slow + (3 * (2 * Math.PI - slow * SPIN_IN_S)) / SPIN_IN_S;
  return slow * t + ((fast - slow) * SPIN_IN_S * (1 - (1 - t / SPIN_IN_S) ** 3)) / 3;
}

/** Ease-out-back: a few percent past full size, then settles, like a thing set down. */
const grow = (t: number) => {
  const x = Math.min(1, t / GROW_S) - 1;
  return 1 + 2.7 * x ** 3 + 1.7 * x ** 2;
};

export function Device({ kind }: { kind: DeviceKind }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  // A WebGL scene is an outside system: it's built when the activity shows and torn down with it.
  useEffect(() => {
    if (!canvas.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H, false);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 20);
    camera.position.set(0, 0.25, 4.2);
    camera.lookAt(0, -0.05, 0);
    const object = model(kind);
    scene.add(object);

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = still ? SPIN_IN_S : (now - started) / 1000;
      object.scale.setScalar(scale[kind] * (still ? 1 : 0.55 + 0.45 * grow(t)));
      object.rotation.y = -Math.PI / 5 + angle(t);
      renderer.render(scene, camera);
      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        for (const m of [o.material].flat()) m.dispose();
      });
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [kind]);

  return <canvas ref={canvas} className="device-model" style={{ '--glow': glow[kind] } as React.CSSProperties} width={W} height={H} />;
}
