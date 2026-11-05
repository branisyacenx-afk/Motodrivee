import * as THREE from 'three';
import { createSignTexture } from '@/game/render/textures';
import type { CivicBuilding } from '@/game/types';

const box = new THREE.BoxGeometry(1, 1, 1);

function part(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function buildBuilding(building: CivicBuilding): THREE.Group {
  const group = new THREE.Group();
  const width = Math.min(56, (building.maxX - building.minX) * 0.72);
  const depth = Math.min(48, (building.maxZ - building.minZ) * 0.62);
  const height = building.kind === 'bank' ? 16 : building.kind === 'market' ? 10 : building.kind === 'police' ? 12 : 7;
  const cx = (building.minX + building.maxX) / 2;
  const cz = (building.minZ + building.maxZ) / 2;
  group.position.set(cx, 0, cz);
  const wall = new THREE.MeshStandardMaterial({ color: building.kind === 'kiosk' ? '#f0d6a8' : '#e6dfd2', roughness: 0.88 });
  const trim = new THREE.MeshStandardMaterial({ color: building.color, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: '#83b8c5', roughness: 0.25, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: '#303b43', roughness: 0.72 });
  const roof = new THREE.MeshStandardMaterial({ color: building.kind === 'market' ? '#a94b3e' : '#d4c8b5', roughness: 0.86 });

  // Solid, walk-up building shell with a colored fascia and raised roof edge.
  part(group, box, wall, 0, height / 2, 0, width, height, depth);
  part(group, box, trim, 0, height - 0.45, depth / 2 + 0.08, width + 0.5, 0.9, 0.45);
  part(group, box, roof, 0, height + 0.18, 0, width + 1.2, 0.42, depth + 1.2);

  const doorWidth = building.kind === 'kiosk' ? 2.2 : 3.2;
  part(group, box, dark, 0, 1.75, depth / 2 + 0.12, doorWidth, 3.5, 0.2);
  part(group, box, glass, 0, 1.85, depth / 2 + 0.24, doorWidth - 0.35, 2.8, 0.08);

  const windowCount = building.kind === 'kiosk' ? 2 : 5;
  const windowWidth = Math.min(5.4, (width - 10) / windowCount);
  for (let i = 0; i < windowCount; i++) {
    const x = (i - (windowCount - 1) / 2) * (windowWidth + 1.8);
    if (Math.abs(x) < doorWidth * 0.8) continue;
    for (let floor = 0; floor < Math.max(1, Math.floor((height - 3) / 4.5)); floor++) {
      const y = 3.4 + floor * 4.4;
      part(group, box, dark, x, y, depth / 2 + 0.13, windowWidth + 0.25, 2.7, 0.18);
      part(group, box, glass, x, y, depth / 2 + 0.24, windowWidth, 2.45, 0.08);
      part(group, box, trim, x, y - 1.45, depth / 2 + 0.28, windowWidth + 0.35, 0.16, 0.22);
    }
  }

  // Repeated facade columns add depth and make the service entrance readable from the street.
  if (building.kind !== 'kiosk') {
    for (const x of [-width * 0.42, -width * 0.22, width * 0.22, width * 0.42]) {
      part(group, box, trim, x, height / 2, depth / 2 + 0.34, 0.48, height - 1, 0.48);
    }
  }

  const signTexture = createSignTexture(building.name, building.color);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(width * 0.72, 24), 3.2),
    new THREE.MeshStandardMaterial({ map: signTexture, emissiveMap: signTexture, emissive: '#ffffff', emissiveIntensity: 0.22, side: THREE.DoubleSide }),
  );
  sign.position.set(0, height - 2.1, depth / 2 + 0.62);
  group.add(sign);

  // A colored canopy marks the kiosk and market entrances.
  if (building.kind === 'kiosk' || building.kind === 'market') {
    part(group, box, trim, 0, 4.1, depth / 2 + 2.1, width * 0.78, 0.32, 4.4);
    for (const x of [-width * 0.36, width * 0.36]) {
      part(group, box, dark, x, 2.0, depth / 2 + 3.6, 0.22, 4, 0.22);
    }
  }

  // Distinctive rooftop identity: bank clock, market vent, or police mast.
  if (building.kind === 'bank') {
    part(group, new THREE.CylinderGeometry(2.2, 2.2, 0.35, 24), trim, 0, height + 1.1, 0, 1, 1, 1);
    part(group, new THREE.BoxGeometry(0.16, 2.6, 0.16), dark, 0, height + 2.4, 0, 1, 1, 1);
  } else if (building.kind === 'market') {
    part(group, box, dark, 0, height + 1.0, 0, width * 0.35, 1.4, depth * 0.25);
  } else if (building.kind === 'police') {
    part(group, new THREE.CylinderGeometry(0.12, 0.12, 8, 8), dark, width * 0.35, height + 4, -depth * 0.25, 1, 1, 1);
    part(group, new THREE.SphereGeometry(0.72, 12, 8), new THREE.MeshBasicMaterial({ color: '#e34d4d' }), width * 0.35, height + 8.1, -depth * 0.25, 1, 1, 1);
  }
  return group;
}

export function buildCivicBuildings(buildings: readonly CivicBuilding[]): THREE.Group {
  const group = new THREE.Group();
  for (const building of buildings) group.add(buildBuilding(building));
  return group;
}
