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

/**
 * Add lightweight zebra crossings at alternating intersections. Instancing keeps
 * the markings to two draw calls instead of thousands of individual meshes.
 */
function buildCrosswalks(): THREE.Group {
  const group = new THREE.Group();
  const intersectionCount = Math.ceil(CITY.cols / 2) * Math.ceil(CITY.rows / 2);
  const barsPerApproach = 5;
  const count = intersectionCount * barsPerApproach * 2;
  const acrossX = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.72, 0.035, CITY.roadWidth - 2),
    new THREE.MeshBasicMaterial({ color: '#f5f1e7' }),
    count,
  );
  const acrossZ = new THREE.InstancedMesh(
    new THREE.BoxGeometry(CITY.roadWidth - 2, 0.035, 0.72),
    new THREE.MeshBasicMaterial({ color: '#f5f1e7' }),
    count,
  );
  const matrix = new THREE.Matrix4();
  const offset = CITY.roadWidth / 2 + 1.5;
  let xIndex = 0;
  let zIndex = 0;

  for (let i = 0; i < CITY.cols; i += 2) {
    for (let j = 0; j < CITY.rows; j += 2) {
      const x = roadX(i);
      const z = roadZ(j);
      for (const side of [-1, 1]) {
        for (let bar = 0; bar < barsPerApproach; bar++) {
          const shift = (bar - (barsPerApproach - 1) / 2) * 1.15;
          matrix.makeTranslation(x + side * offset + shift, 0.115, z);
          acrossX.setMatrixAt(xIndex++, matrix);
          matrix.makeTranslation(x, 0.115, z + side * offset + shift);
          acrossZ.setMatrixAt(zIndex++, matrix);
        }
      }
    }
  }

  acrossX.count = xIndex;
  acrossZ.count = zIndex;
  acrossX.instanceMatrix.needsUpdate = true;
  acrossZ.instanceMatrix.needsUpdate = true;
  acrossX.computeBoundingSphere();
  acrossZ.computeBoundingSphere();
  group.add(acrossX, acrossZ);
  return group;
}

/**
 * Add a small number of marked curbside parking bays on selected streets.
 * A single InstancedMesh keeps the decoration inexpensive and does not affect traffic.
 */
function buildParkingBays(): THREE.Group {
  const group = new THREE.Group();
  const baysPerBlock = 2;
  const selectedRows = 4;
  const slotsPerSide = baysPerBlock;
  const slotLength = 5.5;
  const slotDepth = 2.4;
  const lineWidth = 0.12;
  const totalSlots = Math.floor(CITY.rows / selectedRows) * (CITY.cols - 1) * slotsPerSide * 2;
  const marks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.035, 1),
    new THREE.MeshBasicMaterial({ color: '#e9e5d9' }),
    totalSlots * 3,
  );
  const dummy = new THREE.Object3D();
  let index = 0;

  for (let row = 0; row < CITY.rows; row += selectedRows) {
    const z = roadZ(row);
    for (let col = 0; col < CITY.cols - 1; col++) {
      const left = roadX(col) + CITY.roadWidth / 2 + 2.5;
      const right = roadX(col + 1) - CITY.roadWidth / 2 - 2.5;
      const segmentLength = right - left;
      if (segmentLength < slotLength * baysPerBlock + 4) continue;
      for (const side of [-1, 1]) {
        for (let slot = 0; slot < slotsPerSide; slot++) {
          const x = left + segmentLength * (slot + 0.5) / slotsPerSide;
          const edgeZ = z + side * (CITY.roadWidth / 2 - 1.1);
          dummy.position.set(x, 0.13, edgeZ);
          dummy.scale.set(slotLength, 1, lineWidth);
          dummy.updateMatrix();
          marks.setMatrixAt(index++, dummy.matrix);
          for (const end of [-1, 1]) {
            dummy.position.set(x + end * slotLength / 2, 0.13, z + side * (CITY.roadWidth / 2 - 1.1 - slotDepth / 2));
            dummy.scale.set(lineWidth, 1, slotDepth);
            dummy.updateMatrix();
            marks.setMatrixAt(index++, dummy.matrix);
          }
        }
      }
    }
  }

  marks.count = index;
  marks.instanceMatrix.needsUpdate = true;
  marks.computeBoundingSphere();
  group.add(marks);
  return group;
}

/**
 * Define the sidewalk edge with continuous low curb strips. One instanced mesh
 * keeps the city-wide detail to a single draw call without changing collision.
 */
function buildSidewalkCurbs(bounds: Rect): THREE.InstancedMesh {
  const count = CITY.rows * 2 + CITY.cols * 2;
  const geometry = new THREE.BoxGeometry(1, 0.18, 0.34);
  const material = new THREE.MeshStandardMaterial({ color: '#b8b6ae', roughness: 0.92 });
  const curbs = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  let index = 0;
  const edgeOffset = CITY.roadWidth / 2 + CITY.sidewalk;
  const horizontalLength = bounds.maxX - bounds.minX;
  const verticalLength = bounds.maxZ - bounds.minZ;

  for (let j = 0; j < CITY.rows; j++) {
    const z = roadZ(j);
    for (const side of [-1, 1]) {
      dummy.position.set((bounds.minX + bounds.maxX) / 2, 0.12, z + side * edgeOffset);
      dummy.scale.set(horizontalLength, 1, 1);
      dummy.updateMatrix();
      curbs.setMatrixAt(index++, dummy.matrix);
    }
  }

  for (let i = 0; i < CITY.cols; i++) {
    const x = roadX(i);
    for (const side of [-1, 1]) {
      dummy.position.set(x + side * edgeOffset, 0.12, (bounds.minZ + bounds.maxZ) / 2);
      dummy.scale.set(verticalLength, 1, 1);
      dummy.rotation.y = Math.PI / 2;
      dummy.updateMatrix();
      curbs.setMatrixAt(index++, dummy.matrix);
      dummy.rotation.y = 0;
    }
  }

  curbs.instanceMatrix.needsUpdate = true;
  curbs.computeBoundingSphere();
  curbs.receiveShadow = true;
  return curbs;
}


/**
 * Add restrained decorative street lamps along selected avenue sidewalks.
 * Three instanced meshes keep the entire set to a small, fixed draw-call cost.
 * Lamps are visual only: they do not add collision or real-time light sources.
 */
function buildStreetLamps(): THREE.Group {
  const group = new THREE.Group();
  const selectedRows = 3;
  const count = Math.ceil(CITY.rows / selectedRows) * (CITY.cols - 1) * 2;
  const pole = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.16, 7, 6),
    new THREE.MeshStandardMaterial({ color: '#59636a', roughness: 0.82 }),
    count,
  );
  const arms = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.72),
    new THREE.MeshStandardMaterial({ color: '#59636a', roughness: 0.82 }),
    count,
  );
  const heads = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.48, 0.16, 0.62),
    new THREE.MeshStandardMaterial({ color: '#e5dfc8', roughness: 0.68 }),
    count,
  );
  const matrix = new THREE.Matrix4();
  const edgeOffset = CITY.roadWidth / 2 + CITY.sidewalk * 0.72;
  let index = 0;

  for (let row = 0; row < CITY.rows; row += selectedRows) {
    const road = roadZ(row);
    for (let col = 0; col < CITY.cols - 1; col++) {
      const x = (roadX(col) + roadX(col + 1)) / 2;
      for (const side of [-1, 1]) {
        const z = road + side * edgeOffset;
        matrix.makeTranslation(x, 3.5, z);
        pole.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 6.88, z - side * 0.28);
        arms.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 7.02, z - side * 0.68);
        heads.setMatrixAt(index, matrix);
        index++;
      }
    }
  }

  for (const mesh of [pole, arms, heads]) {
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(pole, arms, heads);
  return group;
}

/**
 * Add a small set of simple roadside bus shelters along selected avenues.
 * All shelter parts are instanced; they are decorative and do not affect gameplay.
 */
function buildBusShelters(): THREE.Group {
  const group = new THREE.Group();
  const selectedRows = 6;
  const selectedBlocks = 3;
  const shelterCount = Math.ceil(CITY.rows / selectedRows)
    * Math.ceil((CITY.cols - 1) / selectedBlocks) * 2;
  const posts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 2.8, 0.16),
    new THREE.MeshStandardMaterial({ color: '#59636a', roughness: 0.78 }),
    shelterCount * 4,
  );
  const roofs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(5.6, 0.2, 2.7),
    new THREE.MeshStandardMaterial({ color: '#d6d0c2', roughness: 0.82 }),
    shelterCount,
  );
  const panels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(5.2, 2.0, 0.08),
    new THREE.MeshStandardMaterial({ color: '#8fb6bd', roughness: 0.35, metalness: 0.08 }),
    shelterCount,
  );
  const benches = new THREE.InstancedMesh(
    new THREE.BoxGeometry(4.0, 0.18, 0.62),
    new THREE.MeshStandardMaterial({ color: '#8a6849', roughness: 0.9 }),
    shelterCount,
  );
  const matrix = new THREE.Matrix4();
  let index = 0;

  for (let row = 0; row < CITY.rows; row += selectedRows) {
    const road = roadZ(row);
    for (let col = 1; col < CITY.cols - 1; col += selectedBlocks) {
      const x = (roadX(col) + roadX(Math.min(col + 1, CITY.cols - 1))) / 2;
      for (const side of [-1, 1]) {
        const z = road + side * (CITY.roadWidth / 2 + CITY.sidewalk * 0.5);
        matrix.makeTranslation(x, 3.0, z);
        roofs.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 1.65, z + side * 1.0);
        panels.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 0.72, z - side * 0.25);
        benches.setMatrixAt(index, matrix);

        let postIndex = index * 4;
        for (const dx of [-2.55, 2.55]) {
          for (const dz of [-1.18, 1.18]) {
            matrix.makeTranslation(x + dx, 1.4, z + dz);
            posts.setMatrixAt(postIndex++, matrix);
          }
        }
        index++;
      }
    }
  }

  for (const mesh of [posts, roofs, panels, benches]) {
    mesh.count = mesh === posts ? index * 4 : index;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(posts, roofs, panels, benches);
  return group;
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
    const wallGeometry = mergeNonIndexed(bucket.walls);
    const roofGeometry = mergeNonIndexed(bucket.roofs);
    bucket.walls.forEach((geometry) => geometry.dispose());
    bucket.roofs.forEach((geometry) => geometry.dispose());
    const wallMesh = new THREE.Mesh(
      wallGeometry,
      toon({ color, map: windowTexture }),
    );
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(wallMesh, roofMesh);
  }
  // A restrained number of rooftop water tanks adds a familiar Algerian
  // residential detail without creating one mesh per building.
  const tankBoxes = boxes.filter((box) => box.height >= 24 && box.seed > 0.58);
  if (tankBoxes.length > 0) {
    const tankBodies = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1.05, 1.2, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: '#477f91', roughness: 0.72, metalness: 0.08 }),
      tankBoxes.length,
    );
    const tankLids = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1.22, 1.22, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: '#8ca6a8', roughness: 0.68 }),
      tankBoxes.length,
    );
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const matrix = new THREE.Matrix4();

    tankBoxes.forEach((box, index) => {
      const width = box.maxX - box.minX;
      const depth = box.maxZ - box.minZ;
      const x = (box.minX + box.maxX) / 2 + (box.seed - 0.5) * Math.min(4, width * 0.12);
      const z = (box.minZ + box.maxZ) / 2 + (0.5 - box.seed) * Math.min(4, depth * 0.12);
      const tankScale = 0.82 + box.seed * 0.3;
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), box.seed * Math.PI * 2);
      scale.setScalar(tankScale);
      position.set(x, box.height + 1.1 * tankScale, z);
      matrix.compose(position, rotation, scale);
      tankBodies.setMatrixAt(index, matrix);
      position.y = box.height + 2.22 * tankScale;
      matrix.compose(position, rotation, scale);
      tankLids.setMatrixAt(index, matrix);
    });

    for (const tank of [tankBodies, tankLids]) {
      tank.instanceMatrix.needsUpdate = true;
      tank.computeBoundingSphere();
      tank.castShadow = true;
      tank.receiveShadow = true;
      group.add(tank);
    }
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
  trunkTemplate.dispose();
  crownTemplate.dispose();
  if (trunks.length === 0) return group;
  const trunkGeometry = mergeNonIndexed(trunks);
  const crownGeometry = mergeNonIndexed(crowns);
  trunks.forEach((geometry) => geometry.dispose());
  crowns.forEach((geometry) => geometry.dispose());
  const trunkMesh = new THREE.Mesh(
    trunkGeometry,
    toon({ color: '#8a6040' }),
  );
  const crownMesh = new THREE.Mesh(
    crownGeometry,
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
  roadTexture.dispose();
  root.add(buildCrosswalks());
  root.add(buildSidewalkCurbs(bounds));
  root.add(buildStreetLamps());
  root.add(buildBusShelters());
  root.add(buildParkingBays());

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
  const chunkRecords = new Map<string, PendingCityChunk>();
  for (const [key, chunk] of chunks) {
    chunkRecords.set(key, {
      x: chunk.x,
      z: chunk.z,
      buildings: chunk.buildings.map((box) => ({
        ...box,
        minX: box.minX - chunk.x, maxX: box.maxX - chunk.x,
        minZ: box.minZ - chunk.z, maxZ: box.maxZ - chunk.z,
      })),
      trees: chunk.trees.map((box) => ({
        ...box,
        minX: box.minX - chunk.x, maxX: box.maxX - chunk.x,
        minZ: box.minZ - chunk.z, maxZ: box.maxZ - chunk.z,
      })),
    });
  }

  root.userData.chunkRecords = chunkRecords;
  root.userData.builtChunks = new Map<string, THREE.Group>();
  root.userData.pendingChunkKeys = [...chunkRecords.keys()];
  root.userData.windowTexture = windowTexture;
  root.userData.lastChunkX = Number.NaN;
  root.userData.lastChunkZ = Number.NaN;
  return root;
}

interface PendingCityChunk {
  x: number;
  z: number;
  buildings: Box[];
  trees: Box[];
}

const CITY_CHUNK_UNLOAD_RADIUS = CITY.pitch * 10;

function buildChunk(chunk: PendingCityChunk, windowTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  group.position.set(chunk.x, 0, chunk.z);
  group.userData.chunkX = chunk.x;
  group.userData.chunkZ = chunk.z;
  if (chunk.buildings.length) group.add(buildingGroup(chunk.buildings, windowTexture));
  if (chunk.trees.length) group.add(treeGroup(chunk.trees));
  return group;
}

/** Dispose only resources owned by this chunk. Shared textures are intentionally retained. */
function disposeChunk(group: THREE.Group): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

/**
 * Keep nearby chunks resident, unload distant geometry, and rebuild it when the
 * rider returns. Layout/collision data and the shared window texture stay alive.
 */
export function updateCityChunkVisibility(city: THREE.Group, x: number, z: number): void {
  const centerX = Math.floor(x / CITY_CHUNK_SIZE);
  const centerZ = Math.floor(z / CITY_CHUNK_SIZE);
  const enteredNewChunk = city.userData.lastChunkX !== centerX || city.userData.lastChunkZ !== centerZ;
  const activeRadiusSq = CITY_CHUNK_ACTIVE_RADIUS * CITY_CHUNK_ACTIVE_RADIUS;
  const unloadRadiusSq = CITY_CHUNK_UNLOAD_RADIUS * CITY_CHUNK_UNLOAD_RADIUS;
  const records = city.userData.chunkRecords as Map<string, PendingCityChunk>;
  const built = city.userData.builtChunks as Map<string, THREE.Group>;
  let pending = city.userData.pendingChunkKeys as string[];

  if (enteredNewChunk) {
    city.userData.lastChunkX = centerX;
    city.userData.lastChunkZ = centerZ;

    for (const [key, group] of built) {
      const dx = group.position.x - x;
      const dz = group.position.z - z;
      if (dx * dx + dz * dz <= unloadRadiusSq) {
        group.visible = dx * dx + dz * dz <= activeRadiusSq;
        continue;
      }
      city.remove(group);
      disposeChunk(group);
      built.delete(key);
    }

    pending = [...records.keys()].filter((key) => !built.has(key));
    pending.sort((a, b) => {
      const first = records.get(a)!;
      const second = records.get(b)!;
      const adx = first.x - x;
      const adz = first.z - z;
      const bdx = second.x - x;
      const bdz = second.z - z;
      return adx * adx + adz * adz - (bdx * bdx + bdz * bdz);
    });
    city.userData.pendingChunkKeys = pending;
  }

  // Build at most one nearby chunk per frame; do not spend work on distant blocks.
  const nextKey = pending[0];
  if (!nextKey) return;
  const next = records.get(nextKey);
  if (!next) {
    pending.shift();
    return;
  }
  const dx = next.x - x;
  const dz = next.z - z;
  if (dx * dx + dz * dz > unloadRadiusSq) return;

  pending.shift();
  const group = buildChunk(next, city.userData.windowTexture as THREE.Texture);
  group.visible = dx * dx + dz * dz <= activeRadiusSq;
  city.add(group);
  built.set(nextKey, group);
}


/** Release city-owned GPU resources when the entire game world is destroyed. */
export function disposeCity(city: THREE.Group): void {
  const sharedWindowTexture = city.userData.windowTexture as THREE.Texture | undefined;
  const ownedTextures = new Set<THREE.Texture>();

  city.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const textured = material as THREE.Material & {
        map?: THREE.Texture | null;
        emissiveMap?: THREE.Texture | null;
      };
      if (textured.map && textured.map !== sharedWindowTexture) ownedTextures.add(textured.map);
      if (textured.emissiveMap && textured.emissiveMap !== sharedWindowTexture) ownedTextures.add(textured.emissiveMap);
      material.dispose();
    }
  });

  ownedTextures.forEach((texture) => texture.dispose());
  sharedWindowTexture?.dispose();
  (city.userData.builtChunks as Map<string, THREE.Group> | undefined)?.clear();
  (city.userData.chunkRecords as Map<string, PendingCityChunk> | undefined)?.clear();
  city.userData.pendingChunkKeys = [];
}
