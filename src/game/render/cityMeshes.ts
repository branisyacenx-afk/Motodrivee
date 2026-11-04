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
function buildSidewalkCurbs(): THREE.InstancedMesh {
  // Split each curb at every perpendicular road so the sidewalk edge never
  // continues across an intersection or appears as a barrier in the roadway.
  const segmentsPerAxis = Math.max(0, CITY.cols - 1) * CITY.rows * 2;
  const count = segmentsPerAxis * 2;
  const curbDepth = 0.34;
  const geometry = new THREE.BoxGeometry(1, 0.18, curbDepth);
  const material = new THREE.MeshStandardMaterial({ color: '#b8b6ae', roughness: 0.92 });
  const curbs = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  let index = 0;
  const roadHalf = CITY.roadWidth / 2;
  // Center the curb directly on the asphalt/sidewalk boundary.
  const edgeOffset = roadHalf + curbDepth / 2;

  // East-west curb runs: leave the full width of every north-south road open.
  for (let row = 0; row < CITY.rows; row++) {
    const z = roadZ(row);
    for (const side of [-1, 1]) {
      for (let col = 0; col < CITY.cols - 1; col++) {
        const startX = roadX(col) + roadHalf;
        const endX = roadX(col + 1) - roadHalf;
        const length = endX - startX;
        if (length <= 0) continue;
        dummy.position.set((startX + endX) / 2, 0.12, z + side * edgeOffset);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(length, 1, 1);
        dummy.updateMatrix();
        curbs.setMatrixAt(index++, dummy.matrix);
      }
    }
  }

  // North-south curb runs: leave the full width of every east-west road open.
  for (let col = 0; col < CITY.cols; col++) {
    const x = roadX(col);
    for (const side of [-1, 1]) {
      for (let row = 0; row < CITY.rows - 1; row++) {
        const startZ = roadZ(row) + roadHalf;
        const endZ = roadZ(row + 1) - roadHalf;
        const length = endZ - startZ;
        if (length <= 0) continue;
        dummy.position.set(x + side * edgeOffset, 0.12, (startZ + endZ) / 2);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.scale.set(length, 1, 1);
        dummy.updateMatrix();
        curbs.setMatrixAt(index++, dummy.matrix);
      }
    }
  }

  curbs.count = index;
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
  // Ten facade details are batched per streamed city chunk. They sit on the
  // front (negative-Z) face and remain visual-only.
  type FacadeItem = { x: number; y: number; z: number; sx: number; sy: number; sz: number };
  const facadeItems: FacadeItem[][] = Array.from({ length: 10 }, () => []);
  const facadeBoxes = boxes.filter((box) =>
    box.kind === 'building' && box.height >= 9 && box.maxX - box.minX >= 10 && box.maxZ - box.minZ >= 8
  );
  for (const box of facadeBoxes) {
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    const centerX = (box.minX + box.maxX) / 2;
    const frontZ = box.minZ - 0.09;
    const doorWidth = Math.min(2.1, width * 0.18);
    const doorHeight = Math.min(3.2, box.height * 0.28);
    const seed = Math.floor(box.seed * 1000) % 10;
    // 1. Recessed-looking entrance door panel.
    facadeItems[0].push({ x: centerX, y: doorHeight / 2, z: frontZ, sx: doorWidth, sy: doorHeight, sz: 0.12 });
    // 2. Entrance canopy.
    facadeItems[1].push({ x: centerX, y: doorHeight + 0.22, z: frontZ - 0.48, sx: doorWidth + 0.9, sy: 0.22, sz: 0.95 });
    // 3. Door lintel / sign band.
    facadeItems[2].push({ x: centerX, y: doorHeight + 0.52, z: frontZ - 0.12, sx: doorWidth + 0.45, sy: 0.18, sz: 0.16 });
    // 4. Window sills on a deterministic selection of buildings.
    if (seed < 7 && box.height > 13) {
      const y = Math.min(5.4, box.height * 0.42);
      facadeItems[3].push({ x: centerX, y, z: frontZ - 0.16, sx: Math.min(5.2, width * 0.5), sy: 0.16, sz: 0.32 });
    }
    // 5. Slim window sunshade.
    if (seed === 1 || seed === 4 || seed === 8) {
      facadeItems[4].push({ x: centerX, y: Math.min(7.2, box.height * 0.58), z: frontZ - 0.34, sx: Math.min(5.6, width * 0.56), sy: 0.14, sz: 0.72 });
    }
    // 6–7. Vertical facade pilasters at both front corners.
    for (const side of [-1, 1]) {
      facadeItems[5].push({ x: centerX + side * (width / 2 - 0.22), y: box.height / 2, z: frontZ - 0.08, sx: 0.28, sy: box.height, sz: 0.2 });
    }
    // 8. Ground-floor stone/plaster plinth.
    for (const side of [-1, 1]) {
      facadeItems[6].push({ x: centerX + side * (doorWidth / 2 + (width - doorWidth) / 4), y: 0.48, z: frontZ - 0.08, sx: (width - doorWidth) / 2, sy: 0.96, sz: 0.18 });
    }
    // 9. Corner accent blocks at the entrance level.
    if (seed % 2 === 0) {
      for (const side of [-1, 1]) {
        facadeItems[7].push({ x: centerX + side * (width / 2 - 0.42), y: 1.25, z: frontZ - 0.2, sx: 0.62, sy: 1.25, sz: 0.28 });
      }
    }
    // 10. Narrow horizontal floor-band trim on taller buildings.
    if (box.height >= 24 && depth > 10) {
      facadeItems[8].push({ x: centerX, y: Math.min(8.5, box.height * 0.32), z: frontZ - 0.1, sx: width, sy: 0.12, sz: 0.16 });
      if (box.height >= 38) facadeItems[9].push({ x: centerX, y: Math.min(15, box.height * 0.58), z: frontZ - 0.1, sx: width, sy: 0.12, sz: 0.16 });
    }
  }

  const facadeMaterials = [
    new THREE.MeshStandardMaterial({ color: '#51463f', roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ color: '#a98a68', roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ color: '#d6c8b5', roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: '#b8b0a2', roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: '#8b9a9b', roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: '#d5c9b8', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#a99a86', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#c5b59e', roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: '#e2d7c7', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#e2d7c7', roughness: 0.9 }),
  ];
  facadeItems.forEach((items, index) => {
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMaterials[index], items.length);
    const dummy = new THREE.Object3D();
    items.forEach((item, itemIndex) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(itemIndex, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // Selected residential buildings receive lightweight facade balconies.
  const balconyBoxes = boxes.filter((box) => box.height >= 20 && box.maxX - box.minX >= 12 && box.seed > 0.36);
  if (balconyBoxes.length > 0) {
    const balconyGeometry = new THREE.BoxGeometry(1, 1, 1);
    const platforms = new THREE.InstancedMesh(balconyGeometry, new THREE.MeshStandardMaterial({ color: '#c9c2b5', roughness: 0.88 }), balconyBoxes.length * 2);
    const rails = new THREE.InstancedMesh(balconyGeometry, new THREE.MeshStandardMaterial({ color: '#596b70', roughness: 0.7, metalness: 0.18 }), balconyBoxes.length * 6);
    const dummy = new THREE.Object3D();
    let p = 0;
    let r = 0;
    for (const box of balconyBoxes) {
      const width = Math.min(4.2, (box.maxX - box.minX) * 0.42);
      const centerX = (box.minX + box.maxX) / 2;
      const frontZ = box.minZ - 0.62;
      const levels = box.height >= 38 && box.seed > 0.62 ? [5.2, 10.4] : [5.2];
      for (const level of levels) {
        if (level + 2 > box.height) continue;
        dummy.position.set(centerX, level, frontZ); dummy.scale.set(width, 0.22, 1.15); dummy.updateMatrix(); platforms.setMatrixAt(p++, dummy.matrix);
        dummy.position.set(centerX, level + 0.55, frontZ - 0.52); dummy.scale.set(width, 1.1, 0.12); dummy.updateMatrix(); rails.setMatrixAt(r++, dummy.matrix);
        for (const side of [-1, 1]) {
          dummy.position.set(centerX + side * (width / 2 - 0.06), level + 0.55, frontZ); dummy.scale.set(0.12, 1.1, 1.05); dummy.updateMatrix(); rails.setMatrixAt(r++, dummy.matrix);
        }
      }
    }
    platforms.count = p; rails.count = r;
    for (const mesh of [platforms, rails]) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
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

  // Ten restrained rooftop-life details make residential blocks feel lived-in.
  // Each category is a single instanced batch per streamed city chunk.
  type RoofTransform = { x: number; y: number; z: number; sx?: number; sy?: number; sz?: number; ry?: number };
  const roofItems: RoofTransform[][] = Array.from({ length: 10 }, () => []);
  const eligibleRoofs = boxes.filter((box) => box.height >= 20 && box.maxX - box.minX >= 13 && box.maxZ - box.minZ >= 13);
  for (const box of eligibleRoofs) {
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    const x = (box.minX + box.maxX) / 2;
    const z = (box.minZ + box.maxZ) / 2;
    const roofY = box.height + 0.18;
    const insetX = Math.min(3.5, width * 0.18);
    const insetZ = Math.min(3.5, depth * 0.18);
    const slot = Math.floor(box.seed * 1000) % 10;
    // 1. Solar water-heating panels.
    if (slot === 0 || slot === 5) roofItems[0].push({ x: x - insetX, y: roofY + 0.45, z: z - insetZ, sx: 3.2, sy: 0.12, sz: 1.8, ry: box.seed });
    // 2. Satellite dishes.
    if (slot === 1 || slot === 6) roofItems[1].push({ x: x + insetX, y: roofY + 0.8, z: z + insetZ, sx: 0.9, sy: 0.22, sz: 0.9, ry: box.seed * Math.PI * 2 });
    // 3. Television antennas.
    if (slot === 2 || slot === 7) roofItems[2].push({ x: x - insetX, y: roofY + 1.8, z: z + insetZ, sx: 0.08, sy: 3.2, sz: 0.08 });
    // 4. Air-conditioning condenser units.
    if (slot === 3 || slot === 8) roofItems[3].push({ x: x + insetX, y: roofY + 0.55, z: z - insetZ, sx: 1.25, sy: 1.0, sz: 0.8 });
    // 5. Ventilation stacks.
    if (slot === 4 || slot === 9) roofItems[4].push({ x: x - insetX, y: roofY + 0.65, z: z - insetZ, sx: 0.38, sy: 1.3, sz: 0.38 });
    // 6. Small roof skylights.
    if (box.seed > 0.42 && width > 18) roofItems[5].push({ x: x + insetX, y: roofY + 0.3, z: z - insetZ, sx: 2.0, sy: 0.28, sz: 1.5, ry: box.seed });
    // 7. Roof access rooms.
    if (box.seed > 0.68 && depth > 17) roofItems[6].push({ x: x - insetX, y: roofY + 1.0, z: z + insetZ, sx: 2.2, sy: 2.0, sz: 2.0 });
    // 8. Rainwater pipe outlets.
    if (box.seed < 0.24) roofItems[7].push({ x: x + insetX, y: roofY + 0.75, z: z + insetZ, sx: 0.16, sy: 1.5, sz: 0.16 });
    // 9. Clothesline posts.
    if (box.seed > 0.76 && width > 18) roofItems[8].push({ x: x, y: roofY + 0.8, z: z + insetZ, sx: 0.12, sy: 1.6, sz: 0.12 });
    // 10. Roof safety rails on selected taller residential buildings.
    if (box.height > 34 && box.seed > 0.84) roofItems[9].push({ x, y: roofY + 0.55, z: z, sx: Math.min(8, width * 0.35), sy: 0.12, sz: 0.12 });
  }

  const roofBatchDefs: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [
    { geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshStandardMaterial({ color: '#315d70', roughness: 0.48, metalness: 0.18 }) },
    { geometry: new THREE.CylinderGeometry(0.8, 0.8, 0.12, 10), material: new THREE.MeshStandardMaterial({ color: '#a9afb2', roughness: 0.62, metalness: 0.25 }) },
    { geometry: new THREE.CylinderGeometry(0.07, 0.09, 1, 6), material: new THREE.MeshStandardMaterial({ color: '#68747a', roughness: 0.7, metalness: 0.35 }) },
    { geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshStandardMaterial({ color: '#d5d4ce', roughness: 0.82 }) },
    { geometry: new THREE.CylinderGeometry(0.5, 0.42, 1, 8), material: new THREE.MeshStandardMaterial({ color: '#8d9697', roughness: 0.82 }) },
    { geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshStandardMaterial({ color: '#7c9aa2', roughness: 0.38, metalness: 0.08 }) },
    { geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshStandardMaterial({ color: '#c9bda9', roughness: 0.9 }) },
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 1, 6), material: new THREE.MeshStandardMaterial({ color: '#477f91', roughness: 0.7 }) },
    { geometry: new THREE.CylinderGeometry(0.06, 0.06, 1, 6), material: new THREE.MeshStandardMaterial({ color: '#e1ded5', roughness: 0.8 }) },
    { geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshStandardMaterial({ color: '#6e777a', roughness: 0.78, metalness: 0.18 }) },
  ];
  roofItems.forEach((items, batchIndex) => {
    if (items.length === 0) return;
    const def = roofBatchDefs[batchIndex];
    const mesh = new THREE.InstancedMesh(def.geometry, def.material, items.length);
    const dummy = new THREE.Object3D();
    items.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(0, item.ry ?? 0, 0);
      dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

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
/**
 * Ten lightweight street-detail batches add recognizable urban furniture without
 * introducing collision objects or changing the driving simulation.
 */
function buildStreetDetailPack(): THREE.Group {
  const group = new THREE.Group();
  const selectedStep = 4;
  const addBatch = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    transforms: { x: number; y: number; z: number; sx?: number; sy?: number; sz?: number; ry?: number }[],
  ) => {
    if (!transforms.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(0, item.ry ?? 0, 0);
      dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  const stopLines: Parameters<typeof addBatch>[2] = [];
  const manholes: Parameters<typeof addBatch>[2] = [];
  const drains: Parameters<typeof addBatch>[2] = [];
  const bollards: Parameters<typeof addBatch>[2] = [];
  const bins: Parameters<typeof addBatch>[2] = [];
  const planters: Parameters<typeof addBatch>[2] = [];
  const cabinets: Parameters<typeof addBatch>[2] = [];
  const signalPoles: Parameters<typeof addBatch>[2] = [];
  const reflectors: Parameters<typeof addBatch>[2] = [];
  const warningMarks: Parameters<typeof addBatch>[2] = [];

  for (let row = 2; row < CITY.rows - 1; row += selectedStep) {
    for (let col = 2; col < CITY.cols - 1; col += selectedStep) {
      const x = roadX(col);
      const z = roadZ(row);
      const half = CITY.roadWidth / 2;
      // 1. Stop bars before selected zebra crossings.
      stopLines.push({ x, y: 0.12, z: z - half - 2.8, sx: CITY.roadWidth - 2, sy: 1, sz: 0.16 });
      stopLines.push({ x, y: 0.12, z: z + half + 2.8, sx: CITY.roadWidth - 2, sy: 1, sz: 0.16 });
      stopLines.push({ x: x - half - 2.8, y: 0.12, z, sx: 0.16, sy: 1, sz: CITY.roadWidth - 2 });
      stopLines.push({ x: x + half + 2.8, y: 0.12, z, sx: 0.16, sy: 1, sz: CITY.roadWidth - 2 });

      // 2. Manhole covers, placed on the road center at sparse intervals.
      if ((row + col) % 8 === 0) manholes.push({ x: x + 18, y: 0.105, z: z + 18 });

      // 3. Drain grates at the asphalt/sidewalk boundary.
      for (const side of [-1, 1]) {
        drains.push({ x: x + 22, y: 0.14, z: z + side * (half + 0.55), sx: 1.5, sy: 1, sz: 0.38 });
      }

      // 4. Short pedestrian bollards at selected sidewalk corners.
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        bollards.push({ x: x + dx * (half + 2.2), y: 0.65, z: z + dz * (half + 2.2) });
      }

      // 5–8. Street bins, planters, utility cabinets, and pedestrian signal poles.
      bins.push({ x: x + 27, y: 0.58, z: z + half + 2.5 });
      planters.push({ x: x - 25, y: 0.35, z: z - half - 2.6, sx: 2.2, sy: 0.7, sz: 1.4 });
      cabinets.push({ x: x + half + 2.7, y: 0.85, z: z - 25, sx: 0.9, sy: 1.7, sz: 0.8 });
      signalPoles.push({ x: x - half - 2.6, y: 2.0, z: z + half + 2.4, sx: 0.16, sy: 4, sz: 0.16 });

      // 9. Small reflective lane studs along the approach.
      for (let n = 0; n < 3; n++) reflectors.push({ x: x + (n - 1) * 1.8, y: 0.13, z: z - half - 7.5, sx: 0.24, sy: 1, sz: 0.18 });

      // 10. Raised visual warning tiles on the sidewalk corner.
      warningMarks.push({ x: x + half + 2.4, y: 0.12, z: z - half - 2.4, sx: 0.85, sy: 1, sz: 0.85, ry: Math.PI / 4 });
    }
  }

  addBatch(new THREE.BoxGeometry(1, 0.035, 1), new THREE.MeshBasicMaterial({ color: '#f5f2e9' }), stopLines);
  addBatch(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 12), new THREE.MeshStandardMaterial({ color: '#777b7d', roughness: 0.86 }), manholes);
  addBatch(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshStandardMaterial({ color: '#454b50', roughness: 0.9 }), drains);
  addBatch(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 7), new THREE.MeshStandardMaterial({ color: '#e6e0d1', roughness: 0.82 }), bollards);
  addBatch(new THREE.BoxGeometry(0.9, 1.1, 0.8), new THREE.MeshStandardMaterial({ color: '#347d68', roughness: 0.88 }), bins);
  addBatch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#a78b68', roughness: 0.95 }), planters);
  addBatch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#7c8589', roughness: 0.8 }), cabinets);
  addBatch(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), new THREE.MeshStandardMaterial({ color: '#4e5960', roughness: 0.82 }), signalPoles);
  addBatch(new THREE.BoxGeometry(1, 0.035, 1), new THREE.MeshStandardMaterial({ color: '#d5b34e', metalness: 0.2, roughness: 0.65 }), reflectors);
  addBatch(new THREE.BoxGeometry(1, 0.035, 1), new THREE.MeshBasicMaterial({ color: '#e6c75c' }), warningMarks);
  return group;
}

function buildDistrictRoadSigns(): THREE.Group {
  const group = new THREE.Group();
  const districts = ['باب الوادي', 'حسين داي', 'القبة', 'الحراش', 'بئر مراد رايس', 'حيدرة'];
  const postGeometry = new THREE.BoxGeometry(0.18, 4.2, 0.18);
  const boardGeometry = new THREE.BoxGeometry(0.28, 1.35, 5.4);
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#59636a', metalness: 0.45, roughness: 0.65 });
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, districts.length * 2);
  const dummy = new THREE.Object3D();
  const roadSideZ = roadZ(2) - CITY.roadWidth / 2 - 5.5;

  districts.forEach((name, index) => {
    const start = Math.floor((index / districts.length) * (CITY.cols - 1));
    const end = Math.floor(((index + 1) / districts.length) * (CITY.cols - 1));
    const x = (roadX(start) + roadX(Math.max(start + 1, end))) / 2;
    for (const offset of [-2.25, 2.25]) {
      dummy.position.set(x, 2.1, roadSideZ + offset);
      dummy.updateMatrix();
      posts.setMatrixAt(index * 2 + (offset > 0 ? 1 : 0), dummy.matrix);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#174c43';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#e8d8a8';
      context.lineWidth = 8;
      context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
      context.direction = 'rtl';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#fff5dc';
      context.font = 'bold 48px sans-serif';
      context.fillText(name, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(5.15, 1.15),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.72, side: THREE.DoubleSide }),
    );
    face.position.set(x + 0.17, 3.05, roadSideZ);
    face.rotation.y = Math.PI / 2;
    face.castShadow = true;
    group.add(face);
  });

  posts.instanceMatrix.needsUpdate = true;
  posts.computeBoundingSphere();
  posts.castShadow = true;
  group.add(posts);
  return group;
}

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
  root.add(buildSidewalkCurbs());
  root.add(buildStreetLamps());
  root.add(buildBusShelters());
  root.add(buildParkingBays());
  root.add(buildStreetDetailPack());
  root.add(buildDistrictRoadSigns());

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
