import * as THREE from 'three';
import { CITY } from '@/game/config';
import { roadX, roadZ } from '@/game/city/layout';
import { mergeNonIndexed } from '@/game/render/mergeGeometry';
import { createRoadTexture, createWindowTexture } from '@/game/render/textures';
import type { Box, Layout, Rect } from '@/game/types';

const ROAD_DASH_PERIOD = 12;
const WALL_FACES = [0, 1, 4, 5];
const ROOF_FACES = [2, 3];

const TOON_GRADIENT = (() => {
  const texture = new THREE.DataTexture(new Uint8Array([110, 175, 255]), 3, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

function toon(params: THREE.MeshToonMaterialParameters): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ gradientMap: TOON_GRADIENT, ...params });
}

export function flatPlane(rect: Rect, color: string, y: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(rect.maxX - rect.minX, rect.maxZ - rect.minZ);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, toon({ color }));
  mesh.position.set((rect.minX + rect.maxX) / 2, y, (rect.minZ + rect.maxZ) / 2);
  mesh.receiveShadow = true;
  return mesh;
}

function roadStrip(rect: Rect, horizontal: boolean, texture: THREE.CanvasTexture): THREE.Mesh {
  const length = horizontal ? rect.maxX - rect.minX : rect.maxZ - rect.minZ;
  const width = horizontal ? rect.maxZ - rect.minZ : rect.maxX - rect.minX;
  const roadTexture = texture.clone();
  roadTexture.repeat.set(length / ROAD_DASH_PERIOD, 1);
  roadTexture.needsUpdate = true;
  const geometry = new THREE.PlaneGeometry(length, width);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, toon({ map: roadTexture }));
  mesh.position.set((rect.minX + rect.maxX) / 2, 0.08, (rect.minZ + rect.maxZ) / 2);
  if (!horizontal) mesh.rotation.y = Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function scaleWallUvs(geometry: THREE.BoxGeometry, width: number, depth: number, height: number): void {
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const sideU = (face: number) => (face < 2 ? depth : width) / 9;
  for (let k = 0; k < uv.count; k++) {
    const face = Math.floor(k / 4);
    if (face === 2 || face === 3) continue;
    uv.setXY(k, uv.getX(k) * sideU(face), uv.getY(k) * (height / 7));
  }
  uv.needsUpdate = true;
}

function faceGeometry(box: THREE.BufferGeometry, faces: number[]): THREE.BufferGeometry {
  const source = box.index!.array;
  const picked: number[] = [];
  for (const face of faces) {
    for (let k = 0; k < 6; k++) picked.push(source[face * 6 + k]);
  }
  const subset = box.clone();
  subset.setIndex(picked);
  subset.clearGroups();
  return subset;
}

function buildingGeometries(box: Box): { wall: THREE.BufferGeometry; roof: THREE.BufferGeometry } {
  const width = box.maxX - box.minX;
  const depth = box.maxZ - box.minZ;
  const geometry = new THREE.BoxGeometry(width, box.height, depth);
  scaleWallUvs(geometry, width, depth, box.height);
  geometry.translate((box.minX + box.maxX) / 2, box.height / 2, (box.minZ + box.maxZ) / 2);
  const wall = faceGeometry(geometry, WALL_FACES);
  const roof = faceGeometry(geometry, ROOF_FACES);
  geometry.dispose();
  return { wall, roof };
}

function buildingGroup(boxes: readonly Box[], windowTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const byColor = new Map<string, { walls: THREE.BufferGeometry[]; roofs: THREE.BufferGeometry[] }>();
  for (const box of boxes) {
    let bucket = byColor.get(box.color);
    if (!bucket) {
      bucket = { walls: [], roofs: [] };
      byColor.set(box.color, bucket);
    }
    const { wall, roof } = buildingGeometries(box);
    bucket.walls.push(wall);
    bucket.roofs.push(roof);
  }

  const roofMaterial = toon({ color: '#9aa3ad' });
  for (const [color, bucket] of byColor) {
    const wallMesh = new THREE.Mesh(
      mergeNonIndexed(bucket.walls),
      toon({ color, map: windowTexture }),
    );
    const roofMesh = new THREE.Mesh(mergeNonIndexed(bucket.roofs), roofMaterial);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(wallMesh, roofMesh);
  }
  return group;
}

function treeGroup(boxes: readonly Box[]): THREE.Group {
  const trunkTemplate = new THREE.CylinderGeometry(0.22, 0.34, 3, 6);
  const crownTemplate = new THREE.IcosahedronGeometry(2.4, 0);
  const trunks: THREE.BufferGeometry[] = [];
  const crowns: THREE.BufferGeometry[] = [];

  for (const box of boxes) {
    const x = (box.minX + box.maxX) / 2;
    const z = (box.minZ + box.maxZ) / 2;
    const scale = 0.85 + box.seed * 0.4;
    const trunk = trunkTemplate.clone().scale(scale, scale, scale).translate(x, 1.5 * scale, z);
    const crown = crownTemplate.clone().scale(scale, scale, scale).translate(x, 4.6 * scale, z);
    trunks.push(trunk);
    crowns.push(crown);
  }

  const group = new THREE.Group();
  if (trunks.length === 0) return group;
  const trunkMesh = new THREE.Mesh(
    mergeNonIndexed(trunks),
    toon({ color: '#8a6040' }),
  );
  const crownMesh = new THREE.Mesh(
    mergeNonIndexed(crowns),
    toon({ color: '#5cc04a' }),
  );
  trunkMesh.castShadow = true;
  crownMesh.castShadow = true;
  group.add(trunkMesh, crownMesh);
  return group;
}

const CITY_CHUNK_SIZE = CITY.pitch * 4;
const CITY_CHUNK_ACTIVE_RADIUS = CITY.pitch * 7;

/**
 * Builds static city geometry in spatial chunks. Geometry is still prepared once,
 * while distant building/tree meshes are excluded from rendering.
 * Roads and ground remain shared so navigation never develops visual gaps.
 */
export function buildCity(layout: Layout): THREE.Group {
  const root = new THREE.Group();
  const { bounds } = layout;
  const span = 600;

  root.add(flatPlane(
    { minX: bounds.minX - span, maxX: bounds.maxX + span, minZ: bounds.minZ - span, maxZ: bounds.maxZ + span },
    '#d9d0b8',
    0,
  ));
  root.add(flatPlane(bounds, '#eee6d2', 0.02));

  const roadTexture = createRoadTexture();
  for (let j = 0; j < CITY.rows; j++) {
    const z = roadZ(j);
    root.add(roadStrip({ minX: bounds.minX, maxX: bounds.maxX, minZ: z - CITY.roadWidth / 2, maxZ: z + CITY.roadWidth / 2 }, true, roadTexture));
  }
  for (let i = 0; i < CITY.cols; i++) {
    const x = roadX(i);
    root.add(roadStrip({ minX: x - CITY.roadWidth / 2, maxX: x + CITY.roadWidth / 2, minZ: bounds.minZ, maxZ: bounds.maxZ }, false, roadTexture));
  }

  const chunks = new Map<string, { x: number; z: number; buildings: Box[]; trees: Box[] }>();
  const getChunk = (x: number, z: number) => {
    const cx = Math.floor(x / CITY_CHUNK_SIZE);
    const cz = Math.floor(z / CITY_CHUNK_SIZE);
    const key = cx + ':' + cz;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunk = { x: (cx + 0.5) * CITY_CHUNK_SIZE, z: (cz + 0.5) * CITY_CHUNK_SIZE, buildings: [], trees: [] };
      chunks.set(key, chunk);
    }
    return chunk;
  };

  for (const box of layout.boxes) {
    if (box.kind !== 'building' && box.kind !== 'tree') continue;
    const chunk = getChunk((box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2);
    (box.kind === 'building' ? chunk.buildings : chunk.trees).push(box);
  }

  const windowTexture = createWindowTexture();
  for (const chunk of chunks.values()) {
    const group = new THREE.Group();
    group.position.set(chunk.x, 0, chunk.z);
    group.userData.chunkX = chunk.x;
    group.userData.chunkZ = chunk.z;
    // Geometry is authored in world coordinates; offset the chunk back to the origin.
    const localBuildings = chunk.buildings.map((box) => ({
      ...box,
      minX: box.minX - chunk.x, maxX: box.maxX - chunk.x,
      minZ: box.minZ - chunk.z, maxZ: box.maxZ - chunk.z,
    }));
    const localTrees = chunk.trees.map((box) => ({
      ...box,
      minX: box.minX - chunk.x, maxX: box.maxX - chunk.x,
      minZ: box.minZ - chunk.z, maxZ: box.maxZ - chunk.z,
    }));
    if (localBuildings.length) group.add(buildingGroup(localBuildings, windowTexture));
    if (localTrees.length) group.add(treeGroup(localTrees));
    root.add(group);
  }

  root.userData.lastChunkX = Number.NaN;
  root.userData.lastChunkZ = Number.NaN;
  return root;
}

/** Toggle only when the rider enters a different chunk, avoiding per-frame scans. */
export function updateCityChunkVisibility(city: THREE.Group, x: number, z: number): void {
  const centerX = Math.floor(x / CITY_CHUNK_SIZE);
  const centerZ = Math.floor(z / CITY_CHUNK_SIZE);
  if (city.userData.lastChunkX === centerX && city.userData.lastChunkZ === centerZ) return;

  city.userData.lastChunkX = centerX;
  city.userData.lastChunkZ = centerZ;
  const radiusSq = CITY_CHUNK_ACTIVE_RADIUS * CITY_CHUNK_ACTIVE_RADIUS;
  for (const child of city.children) {
    if (child.userData.chunkX === undefined) continue;
    const dx = child.userData.chunkX - x;
    const dz = child.userData.chunkZ - z;
    child.visible = dx * dx + dz * dz <= radiusSq;
  }
}
