import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createLogoTexture } from '@/game/render/textures';
import type { VehicleId } from '@/game/config';

type Vec = readonly [number, number, number];

export interface BikeModel {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  deliveryLid: THREE.Object3D;
}

export interface PedestrianModel {
  group: THREE.Group;
  legs: [THREE.Object3D, THREE.Object3D];
  arms: [THREE.Object3D, THREE.Object3D];
}

export interface ActorAssets {
  bike(paintHex: string, vehicleId: VehicleId): BikeModel;
  car(color: string): THREE.Group;
  pedestrian(shirt: string, skin: string, isChild?: boolean): PedestrianModel;
  cone(): THREE.Group;
}

const UP = new THREE.Vector3(0, 1, 0);

function limb(a: Vec, b: Vec, radius: number): THREE.BufferGeometry {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const length = dir.length();
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - 2 * radius), 4, 10).toNonIndexed();
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  const mid = start.add(end).multiplyScalar(0.5);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geo.translate(x, y, z);
  return geo;
}

function ball(radius: number, x: number, y: number, z: number, scale: Vec = [1, 1, 1]): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 16, 12).toNonIndexed();
  geo.scale(scale[0], scale[1], scale[2]);
  geo.translate(x, y, z);
  return geo;
}

function tire(x: number, y: number, z: number, rotateY: boolean): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.2, 0.12, 12, 24).toNonIndexed();
  if (rotateY) geo.rotateY(Math.PI / 2);
  geo.translate(x, y, z);
  return geo;
}

function rim(x: number, y: number, z: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.19, 0.19, 0.14, 16).toNonIndexed();
  geo.rotateZ(Math.PI / 2);
  geo.translate(x, y, z);
  return geo;
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(list);
  if (!merged) throw new Error('Geometry merge failed');
  return merged;
}

function extrudeAcross(profile: THREE.Shape, width: number): THREE.BufferGeometry {
  const bevel = 0.08;
  const depth = width - 2 * bevel;
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-depth / 2, 0, 0);
  return geo;
}

function carBodyProfile(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-2.3, 0.34);
  shape.lineTo(2.3, 0.34);
  shape.lineTo(2.3, 0.8);
  shape.quadraticCurveTo(2.26, 0.96, 1.9, 0.98);
  shape.lineTo(-1.9, 0.98);
  shape.quadraticCurveTo(-2.26, 0.96, -2.3, 0.8);
  shape.closePath();
  return shape;
}

function cabinProfile(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-1.25, 0.96);
  shape.lineTo(1.2, 0.96);
  shape.lineTo(0.5, 1.42);
  shape.lineTo(-0.75, 1.42);
  shape.closePath();
  return shape;
}

function buildCarParts() {
  const body = extrudeAcross(carBodyProfile(), 1.9);
  const cabin = extrudeAcross(cabinProfile(), 1.6);
  const tires = [
    tire(-0.98, 0.33, 1.45, true),
    tire(0.98, 0.33, 1.45, true),
    tire(-0.98, 0.33, -1.45, true),
    tire(0.98, 0.33, -1.45, true),
  ];
  const rims = [
    rim(-1.0, 0.33, 1.45),
    rim(1.0, 0.33, 1.45),
    rim(-1.0, 0.33, -1.45),
    rim(1.0, 0.33, -1.45),
  ];
  const trim = [
    // Front and rear bumper lips.
    box(1.9, 0.22, 0.12, 0, 0.42, 2.34),
    box(1.9, 0.22, 0.12, 0, 0.42, -2.34),
    // Front grille and lower air intake.
    box(0.9, 0.16, 0.05, 0, 0.7, 2.31),
    box(0.72, 0.08, 0.05, 0, 0.53, 2.32),
    // Side mirrors with short mounting stems.
    box(0.12, 0.1, 0.2, -1.02, 1.0, 0.6),
    box(0.12, 0.1, 0.2, 1.02, 1.0, 0.6),
    box(0.08, 0.06, 0.24, -1.0, 0.96, 0.48),
    box(0.08, 0.06, 0.24, 1.0, 0.96, 0.48),
    // Door protection strips and handles on both sides.
    box(0.08, 0.1, 1.45, -0.98, 0.62, -0.05),
    box(0.08, 0.1, 1.45, 0.98, 0.62, -0.05),
    box(0.05, 0.045, 0.22, -1.0, 0.82, 0.12),
    box(0.05, 0.045, 0.22, 1.0, 0.82, 0.12),
    // Subtle lower side skirts and rear diffuser.
    box(0.1, 0.08, 1.8, -0.96, 0.34, 0),
    box(0.1, 0.08, 1.8, 0.96, 0.34, 0),
    box(1.2, 0.08, 0.12, 0, 0.34, -2.35),
    // Front and rear registration plate surrounds.
    box(0.62, 0.18, 0.035, 0, 0.55, 2.37),
    box(0.62, 0.18, 0.035, 0, 0.55, -2.37),
    // Underbody cross-member.
    box(1.9, 0.08, 0.2, 0, 0.34, 0.9),
  ];
  return {
    paint: merge([body]),
    glass: merge([cabin]),
    tire: merge(tires),
    rim: merge(rims),
    trim: merge(trim),
    head: merge([box(0.42, 0.12, 0.05, -0.6, 0.8, 2.31), box(0.42, 0.12, 0.05, 0.6, 0.8, 2.31)]),
    tail: merge([box(0.42, 0.12, 0.05, -0.6, 0.8, -2.31), box(0.42, 0.12, 0.05, 0.6, 0.8, -2.31)]),
  };
}

function buildPedestrianParts() {
  return {
    torso: merge([limb([0, 0.98, 0], [0, 1.36, 0], 0.19)]),
    skin: merge([limb([0, 1.36, 0], [0, 1.5, 0], 0.06), ball(0.13, 0, 1.63, 0)]),
    hair: new THREE.SphereGeometry(0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(),
    pants: merge([limb([0, 0, 0], [0, -0.46, 0], 0.085), limb([0, -0.46, 0], [0, -0.9, 0], 0.075)]),
    shoe: box(0.12, 0.08, 0.26, 0, -0.96, 0.04),
    sleeve: limb([0, 0, 0], [0, -0.5, 0], 0.07),
    hand: ball(0.065, 0, -0.58, 0),
  };
}

export function createActorAssets(): ActorAssets {
  const glass = new THREE.MeshStandardMaterial({ color: '#1b2630', roughness: 0.12, metalness: 0.6 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.92 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.28, metalness: 0.85 });
  const black = new THREE.MeshStandardMaterial({ color: '#1b1e22', roughness: 0.6 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.7 });
  const jacket = new THREE.MeshStandardMaterial({ color: '#f3f3f0', roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: '#23272e', roughness: 0.8 });
  const boot = new THREE.MeshStandardMaterial({ color: '#16130f', roughness: 0.55 });
  const helmet = new THREE.MeshStandardMaterial({ color: '#f7f7f5', roughness: 0.3 });
  const visor = new THREE.MeshStandardMaterial({ color: '#0d1620', roughness: 0.1, metalness: 0.4 });
  const brake = new THREE.MeshBasicMaterial({ color: '#ff3b30', toneMapped: false });
  const headlight = new THREE.MeshBasicMaterial({ color: '#fff1c4', toneMapped: false });
  const cone = new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.6 });
  const logo = new THREE.MeshStandardMaterial({ map: createLogoTexture(), roughness: 0.6 });
  const boxRed = new THREE.MeshStandardMaterial({ color: '#d7262e', roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#2a1f1a', roughness: 0.9 });
  const pedPants = new THREE.MeshStandardMaterial({ color: '#2c3440', roughness: 0.85 });
  const pedShoe = new THREE.MeshStandardMaterial({ color: '#1f1d1a', roughness: 0.6 });

  const paintCache = new Map<string, THREE.MeshStandardMaterial>();
  const materialFor = (hex: string, roughness: number, metalness: number) => {
    const key = `${hex}-${roughness}-${metalness}`;
    const cached = paintCache.get(key);
    if (cached) return cached;
    const material = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
    paintCache.set(key, material);
    return material;
  };

  let carParts: ReturnType<typeof buildCarParts> | null = null;
  let pedParts: ReturnType<typeof buildPedestrianParts> | null = null;

  return {
    bike(paintHex, vehicleId) {
      const group = new THREE.Group();
      const paint = materialFor(paintHex, 0.35, 0.2);
      const paintGeo = merge([
        ball(0.2, 0, 0.95, 0.12, [0.9, 0.6, 1.6]),
        ball(0.22, 0, 0.9, 0.42, [0.85, 0.85, 1.3]),
        limb([0, 1.0, 0.5], [0, 0.82, -0.35], 0.05),
      ]);
      const chromeGeo = merge([
        limb([0, 1.05, 0.62], [0, 0.34, 0.82], 0.035),
        limb([-0.3, 1.1, 0.6], [0.3, 1.1, 0.6], 0.02),
        limb([0.12, 0.3, -0.4], [0.14, 0.28, -0.95], 0.04),
      ]);
      group.add(new THREE.Mesh(paintGeo, paint));
      group.add(new THREE.Mesh(chromeGeo, chrome));
      group.add(new THREE.Mesh(merge([
        box(0.3, 0.28, 0.38, 0, 0.5, -0.05),
        box(0.3, 0.08, 0.52, 0, 0.97, -0.3),
        limb([0, 0.34, -0.72], [0, 0.62, -0.2], 0.04),
        box(0.2, 0.04, 0.3, 0, 0.66, -0.7),
      ]), black));
      group.add(new THREE.Mesh(merge([
        limb([0, 1.0, -0.25], [0, 1.42, 0.02], 0.19),
        limb([-0.2, 1.38, 0.0], [-0.2, 1.08, 0.56], 0.07),
        limb([0.2, 1.38, 0.0], [0.2, 1.08, 0.56], 0.07),
      ]), jacket));
      group.add(new THREE.Mesh(merge([
        limb([-0.13, 0.98, -0.25], [-0.14, 0.6, 0.12], 0.09),
        limb([-0.14, 0.6, 0.12], [-0.13, 0.36, 0.36], 0.08),
        limb([0.13, 0.98, -0.25], [0.14, 0.6, 0.12], 0.09),
        limb([0.14, 0.6, 0.12], [0.13, 0.36, 0.36], 0.08),
      ]), pants));
      group.add(new THREE.Mesh(merge([
        box(0.12, 0.1, 0.24, -0.13, 0.34, 0.4),
        box(0.12, 0.1, 0.24, 0.13, 0.34, 0.4),
        ball(0.065, -0.2, 1.06, 0.6),
        ball(0.065, 0.2, 1.06, 0.6),
      ]), boot));
      group.add(new THREE.Mesh(merge([ball(0.165, 0, 1.6, 0.1)]), helmet));
      group.add(new THREE.Mesh(box(0.22, 0.1, 0.03, 0, 1.6, 0.27), visor));
      group.add(new THREE.Mesh(ball(0.09, 0, 0.98, 0.7), headlight));
      group.add(new THREE.Mesh(box(0.14, 0.08, 0.04, 0, 0.86, -0.95), brake));

      // Lightweight silhouette kits make garage classes visually distinct while
      // keeping the same rig, wheel pivots, and low draw-call budget.
      const sportIds: VehicleId[] = ['sport', 'racer220', 'falcon320', 'phantom500', 'vortex600', 'blaze650', 'apex750', 'ultimate1000'];
      const touringIds: VehicleId[] = ['beast', 'touring250', 'titan550'];
      const adventureIds: VehicleId[] = ['desert300', 'rally450'];
      const cruiserIds: VehicleId[] = ['shadow350', 'nighthawk700'];
      if (sportIds.includes(vehicleId)) {
        group.add(new THREE.Mesh(merge([
          ball(0.27, 0, 0.93, 0.28, [1.25, 0.8, 1.35]),
          box(0.08, 0.48, 0.48, -0.31, 0.91, 0.22),
          box(0.08, 0.48, 0.48, 0.31, 0.91, 0.22),
          limb([-0.23, 1.2, 0.58], [-0.28, 0.91, 0.85], 0.035),
          limb([0.23, 1.2, 0.58], [0.28, 0.91, 0.85], 0.035),
        ]), paint));
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.035), glass);
        screen.position.set(0, 1.28, 0.56);
        screen.rotation.x = -0.28;
        group.add(screen);
      } else if (touringIds.includes(vehicleId)) {
        group.add(new THREE.Mesh(merge([
          box(0.28, 0.42, 0.48, -0.43, 0.86, -0.72),
          box(0.28, 0.42, 0.48, 0.43, 0.86, -0.72),
          box(0.54, 0.08, 0.48, 0, 0.92, -0.72),
          limb([-0.22, 1.12, 0.58], [-0.2, 1.55, 0.62], 0.025),
          limb([0.22, 1.12, 0.58], [0.2, 1.55, 0.62], 0.025),
        ]), paint));
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.045), glass);
        screen.position.set(0, 1.43, 0.62);
        screen.rotation.x = -0.18;
        group.add(screen);
      } else if (adventureIds.includes(vehicleId)) {
        group.add(new THREE.Mesh(merge([
          box(0.42, 0.62, 0.22, 0, 1.02, 0.68),
          box(0.16, 0.12, 0.7, 0, 0.55, 0.82),
          limb([-0.28, 1.12, 0.5], [-0.4, 1.05, 0.76], 0.035),
          limb([0.28, 1.12, 0.5], [0.4, 1.05, 0.76], 0.035),
        ]), paint));
        group.scale.y = 1.08;
      } else if (cruiserIds.includes(vehicleId)) {
        group.add(new THREE.Mesh(merge([
          ball(0.25, 0, 0.9, 0.05, [1.2, 0.78, 1.9]),
          limb([-0.18, 0.45, -0.35], [-0.18, 0.38, -1.0], 0.045),
          limb([0.18, 0.45, -0.35], [0.18, 0.38, -1.0], 0.045),
          box(0.42, 0.1, 0.16, 0, 0.42, -0.92),
        ]), chrome));
        group.scale.z = 1.08;
      } else {
        group.add(new THREE.Mesh(merge([
          ball(0.19, 0, 0.98, 0.36, [1.15, 0.8, 1.25]),
          box(0.36, 0.18, 0.22, 0, 1.12, 0.56),
        ]), paint));
      }

      const wheels: THREE.Object3D[] = [];
      for (const z of [0.82, -0.72]) {
        const wheel = new THREE.Group();
        wheel.position.set(0, 0.33, z);
        wheel.add(new THREE.Mesh(tire(0, 0, 0, true), tireMat));
        wheel.add(new THREE.Mesh(rim(0, 0, 0), chrome));
        group.add(wheel);
        wheels.push(wheel);
      }

      const deliveryBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.56, 0.58),
        [boxRed, boxRed, boxRed, boxRed, boxRed, logo],
      );
      deliveryBox.position.set(0, 1.05, -1.0);
      group.add(deliveryBox);
      const deliveryLid = new THREE.Group();
      deliveryLid.position.set(0, 1.33, -1.0);
      const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.62), boxRed);
      deliveryLid.add(lidMesh);
      group.add(deliveryLid);

      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      return { group, wheels, deliveryLid };
    },

    car(color) {
      carParts ??= buildCarParts();
      const parts = carParts;
      const group = new THREE.Group();
      const add = (geo: THREE.BufferGeometry, material: THREE.Material, name?: string) => {
        const mesh = new THREE.Mesh(geo, material);
        if (name) mesh.name = name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      };
      add(parts.paint, materialFor(color, 0.3, 0.45));
      add(parts.glass, glass);
      add(parts.tire, tireMat);
      add(parts.rim, chrome);
      add(parts.trim, trimMat);
      const headlightMaterial = headlight.clone();
      headlightMaterial.color.set('#514b3c');
      add(parts.head, headlightMaterial, 'headlights');
      const brakeLightMaterial = brake.clone();
      brakeLightMaterial.color.set('#701b18');
      add(parts.tail, brakeLightMaterial, 'brake-lights');
      return group;
    },

    pedestrian(shirt, skin, isChild = false) {
      pedParts ??= buildPedestrianParts();
      const parts = pedParts;
      const shirtMat = materialFor(shirt, 0.8, 0);
      const skinMat = materialFor(skin, 0.65, 0);
      const group = new THREE.Group();
      if (isChild) group.scale.setScalar(0.72);
      const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material) => {
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        parent.add(mesh);
      };

      add(group, parts.torso, shirtMat);
      add(group, parts.skin, skinMat);
      add(group, parts.hair, hairMat);

      const legs = [-0.1, 0.1].map((x) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, 0.98, 0);
        add(pivot, parts.pants, pedPants);
        add(pivot, parts.shoe, pedShoe);
        group.add(pivot);
        return pivot;
      });
      const arms = [-0.25, 0.25].map((x) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, 1.32, 0);
        add(pivot, parts.sleeve, shirtMat);
        add(pivot, parts.hand, skinMat);
        group.add(pivot);
        return pivot;
      });
      return { group, legs: [legs[0], legs[1]], arms: [arms[0], arms[1]] };
    },

    cone() {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.72, 12), cone);
      body.position.y = 0.4;
      body.castShadow = true;
      group.add(body);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.6), black);
      base.position.y = 0.025;
      group.add(base);
      return group;
    },
  };
}
