import * as THREE from 'three';
import { flatPlane } from '@/game/render/cityMeshes';
import { mergeNonIndexed } from '@/game/render/mergeGeometry';
import type { Rect, Zone } from '@/game/types';

const STRIPE_PITCH = 3.2;
const STRIPE_LENGTH = 4.8;

function rectSpan(rect: Rect): number {
  return Math.min(rect.maxX - rect.minX, rect.maxZ - rect.minZ);
}

function rectCenter(rect: Rect): { x: number; z: number } {
  return { x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2 };
}

function buildPlaza(rect: Rect, group: THREE.Group): void {
  group.add(flatPlane(rect, '#e7dcc7', 0.04));
  const { x, z } = rectCenter(rect);
  const radius = rectSpan(rect) * 0.18;
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: '#d6cbb5', roughness: 0.9 }),
  );
  basin.position.set(x, 0.25, z);
  basin.receiveShadow = true;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius - 0.6, 24),
    new THREE.MeshStandardMaterial({ color: '#5fb3d4', roughness: 0.2, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.52, z);
  group.add(basin, water);
}

function buildOasis(rect: Rect, group: THREE.Group, palmTrunks: THREE.BufferGeometry[], palmCrowns: THREE.BufferGeometry[]): void {
  group.add(flatPlane(rect, '#a8b56b', 0.04));
  const { x, z } = rectCenter(rect);
  const radius = rectSpan(rect) * 0.2;
  const pool = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.2, 28),
    new THREE.MeshStandardMaterial({ color: '#3fa7c4', roughness: 0.15 }),
  );
  pool.position.set(x, 0.12, z);
  pool.receiveShadow = true;
  group.add(pool);

  const half = rectSpan(rect) * 0.35;
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const px = x + dx * half;
    const pz = z + dz * half;
    palmTrunks.push(new THREE.CylinderGeometry(0.22, 0.32, 7, 6).translate(px, 3.5, pz));
    palmCrowns.push(new THREE.IcosahedronGeometry(2.6, 0).scale(1, 0.4, 1).translate(px, 7.6, pz));
  }
}

function buildParking(rect: Rect, group: THREE.Group, stripes: THREE.Matrix4[]): void {
  group.add(flatPlane(rect, '#4a4f57', 0.04));
  const width = rect.maxX - rect.minX;
  const { z } = rectCenter(rect);
  const count = Math.floor((width - 2) / STRIPE_PITCH);
  for (let k = 0; k < count; k++) {
    const sx = rect.minX + 1 + (k + 0.5) * STRIPE_PITCH;
    stripes.push(new THREE.Matrix4().makeTranslation(sx, 0.07, z));
  }
}


/**
 * Add a pair of simple benches to each park. Three instanced batches keep
 * the furniture lightweight and purely decorative, with no gameplay collision.
 */
function buildParkBenches(zones: readonly Zone[]): THREE.Group {
  const parks = zones.filter((zone) => zone.kind === 'park');
  const group = new THREE.Group();
  if (parks.length === 0) return group;

  const count = parks.length * 2;
  const seat = new THREE.InstancedMesh(
    new THREE.BoxGeometry(3.2, 0.18, 0.72),
    new THREE.MeshStandardMaterial({ color: '#9a6844', roughness: 0.86 }),
    count,
  );
  const back = new THREE.InstancedMesh(
    new THREE.BoxGeometry(3.2, 1.05, 0.16),
    new THREE.MeshStandardMaterial({ color: '#805538', roughness: 0.88 }),
    count,
  );
  const legs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.78, 0.16),
    new THREE.MeshStandardMaterial({ color: '#555b60', roughness: 0.82 }),
    count * 2,
  );
  const matrix = new THREE.Matrix4();
  let index = 0;
  let legIndex = 0;

  for (const zone of parks) {
    const centerX = (zone.rect.minX + zone.rect.maxX) / 2;
    const centerZ = (zone.rect.minZ + zone.rect.maxZ) / 2;
    const offset = Math.min(12, (zone.rect.maxX - zone.rect.minX) * 0.18);
    for (const side of [-1, 1]) {
      const x = centerX + side * offset;
      matrix.makeTranslation(x, 0.82, centerZ);
      seat.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, 1.38, centerZ - 0.28);
      back.setMatrixAt(index, matrix);
      for (const legSide of [-1, 1]) {
        matrix.makeTranslation(x + legSide * 1.25, 0.39, centerZ);
        legs.setMatrixAt(legIndex++, matrix);
      }
      index++;
    }
  }

  for (const mesh of [seat, back, legs]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(seat, back, legs);
  return group;
}

export function buildZones(zones: readonly Zone[]): THREE.Group {
  const group = new THREE.Group();
  const palmTrunks: THREE.BufferGeometry[] = [];
  const palmCrowns: THREE.BufferGeometry[] = [];
  const stripes: THREE.Matrix4[] = [];

  for (const zone of zones) {
    if (zone.kind === 'park') group.add(flatPlane(zone.rect, '#7fa35e', 0.05));
    else if (zone.kind === 'plaza') buildPlaza(zone.rect, group);
    else if (zone.kind === 'oasis') buildOasis(zone.rect, group, palmTrunks, palmCrowns);
    else buildParking(zone.rect, group, stripes);
  }

  group.add(buildParkBenches(zones));

  if (palmTrunks.length > 0) {
    const trunkMesh = new THREE.Mesh(mergeNonIndexed(palmTrunks), new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 1 }));
    const crownMesh = new THREE.Mesh(
      mergeNonIndexed(palmCrowns),
      new THREE.MeshStandardMaterial({ color: '#3f7d3a', roughness: 0.9, flatShading: true }),
    );
    trunkMesh.castShadow = true;
    crownMesh.castShadow = true;
    group.add(trunkMesh, crownMesh);
  }

  if (stripes.length > 0) {
    const stripeGeometry = new THREE.BoxGeometry(0.22, 0.02, STRIPE_LENGTH);
    const instanced = new THREE.InstancedMesh(
      stripeGeometry,
      new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.8 }),
      stripes.length,
    );
    stripes.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
    instanced.instanceMatrix.needsUpdate = true;
    instanced.receiveShadow = true;
    group.add(instanced);
  }

  return group;
}
