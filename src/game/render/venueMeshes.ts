import * as THREE from 'three';
import { createSignTexture } from '@/game/render/textures';
import type { Venue } from '@/game/types';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

function addPart(
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

/**
 * Restaurants are proper street-facing buildings rather than freestanding signs.
 * Local +Z is the entrance/front direction; the venue normal points toward the road.
 */
function buildRestaurant(venue: Venue): THREE.Group {
  const group = new THREE.Group();
  const width = 13;
  const depth = 10;
  const height = 8.5;
  const angle = Math.atan2(venue.normal.x, venue.normal.z);

  // Keep the facade at the venue marker and place the building mass behind it,
  // inside the block, away from the carriageway.
  group.position.set(
    venue.x - venue.normal.x * (depth / 2 - 0.8),
    0,
    venue.z - venue.normal.z * (depth / 2 - 0.8),
  );
  group.rotation.y = angle;

  const plaster = new THREE.MeshStandardMaterial({ color: '#e7d8c2', roughness: 0.9 });
  const sideWall = new THREE.MeshStandardMaterial({ color: '#c8b69d', roughness: 0.92 });
  const trim = new THREE.MeshStandardMaterial({ color: venue.color, roughness: 0.76 });
  const glass = new THREE.MeshStandardMaterial({ color: '#7fb8c5', roughness: 0.24, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: '#263640', roughness: 0.7 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: '#aaa397', roughness: 0.92 });
  const metal = new THREE.MeshStandardMaterial({ color: '#60696c', metalness: 0.35, roughness: 0.68 });

  // Full building shell, raised foundation and roof cap.
  addPart(group, UNIT_BOX, plaster, 0, height / 2 + 0.35, 0, width, height, depth);
  addPart(group, UNIT_BOX, sideWall, 0, 0.18, 0, width + 0.45, 0.36, depth + 0.45);
  addPart(group, UNIT_BOX, roofMaterial, 0, height + 0.58, 0, width + 0.8, 0.55, depth + 0.8);
  addPart(group, UNIT_BOX, trim, 0, height - 0.25, depth / 2 + 0.12, width + 0.35, 0.8, 0.3);

  // Wide glazed storefront, with a clearly readable central entrance.
  addPart(group, UNIT_BOX, dark, 0, 2.25, depth / 2 + 0.12, 8.8, 3.6, 0.22);
  addPart(group, UNIT_BOX, glass, -2.35, 2.25, depth / 2 + 0.25, 3.7, 3.15, 0.08);
  addPart(group, UNIT_BOX, glass, 2.35, 2.25, depth / 2 + 0.25, 3.7, 3.15, 0.08);
  addPart(group, UNIT_BOX, trim, 0, 2.25, depth / 2 + 0.34, 1.15, 3.55, 0.18);
  addPart(group, UNIT_BOX, glass, 0, 2.35, depth / 2 + 0.46, 0.78, 2.95, 0.08);
  addPart(group, UNIT_BOX, metal, 0.28, 2.3, depth / 2 + 0.56, 0.08, 0.08, 0.08);

  // Second-floor windows and architectural framing.
  for (const x of [-4.3, 0, 4.3]) {
    addPart(group, UNIT_BOX, dark, x, 6.15, depth / 2 + 0.13, 2.55, 1.55, 0.2);
    addPart(group, UNIT_BOX, glass, x, 6.15, depth / 2 + 0.25, 2.25, 1.25, 0.08);
    addPart(group, UNIT_BOX, trim, x, 5.32, depth / 2 + 0.3, 2.8, 0.14, 0.24);
  }

  // Entrance canopy, support brackets and a broad step toward the sidewalk.
  addPart(group, UNIT_BOX, trim, 0, 4.15, depth / 2 + 1.0, 9.8, 0.28, 1.8);
  for (const x of [-4.55, 4.55]) {
    addPart(group, UNIT_BOX, metal, x, 2.05, depth / 2 + 1.65, 0.16, 3.9, 0.16);
  }
  addPart(group, UNIT_BOX, roofMaterial, 0, 0.2, depth / 2 + 1.0, 4.2, 0.35, 1.8);

  // Sign panel with the restaurant name, mounted above the canopy.
  const signTexture = createSignTexture(venue.name, venue.color);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 1.45),
    new THREE.MeshStandardMaterial({
      map: signTexture,
      emissiveMap: signTexture,
      emissive: '#ffffff',
      emissiveIntensity: 0.2,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  sign.position.set(0, 7.75, depth / 2 + 0.32);
  group.add(sign);

  // Rooftop parapet, ventilation units and a water tank make the volume read as a building.
  for (const x of [-width / 2 + 0.18, width / 2 - 0.18]) {
    addPart(group, UNIT_BOX, sideWall, x, height + 0.95, 0, 0.3, 0.8, depth + 0.25);
  }
  addPart(group, UNIT_BOX, metal, -3.9, height + 1.0, -1.8, 1.8, 1.0, 1.6);
  addPart(group, UNIT_BOX, metal, 3.5, height + 0.95, -1.8, 1.5, 0.9, 1.4);
  addPart(group, new THREE.CylinderGeometry(0.72, 0.72, 1.35, 12), glass, 3.9, height + 1.45, 2.5, 1, 1, 1);

  // Small menu board beside the entrance and two planters at the facade corners.
  addPart(group, UNIT_BOX, dark, -5.7, 1.55, depth / 2 + 0.42, 0.95, 1.8, 0.18);
  addPart(group, UNIT_BOX, trim, -5.7, 1.55, depth / 2 + 0.54, 0.72, 1.35, 0.06);
  for (const x of [-5.7, 5.7]) {
    addPart(group, UNIT_BOX, sideWall, x, 0.42, depth / 2 + 1.05, 1.1, 0.82, 0.95);
    addPart(group, new THREE.IcosahedronGeometry(0.58, 0), new THREE.MeshStandardMaterial({ color: '#4f8e56', roughness: 0.95 }), x, 1.12, depth / 2 + 1.05, 1, 1, 1);
  }

  return group;
}

export function buildVenues(venues: readonly Venue[]): THREE.Group {
  const group = new THREE.Group();
  for (const venue of venues) group.add(buildRestaurant(venue));
  return group;
}
