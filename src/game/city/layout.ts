import { ALGIERS_DISTRICTS, CITY, RESTAURANTS } from '@/game/config';
import { createRandom, pick, range, type Random } from '@/game/random';
import type { Block, Box, Lane, Layout, Rect, Vec2, Venue, Zone, ZoneKind } from '@/game/types';

const ZONE_KINDS: readonly Exclude<ZoneKind, 'park'>[] = ['plaza', 'parking', 'oasis'];

const HALF_ROAD = CITY.roadWidth / 2;
const BLOCK_INSET = HALF_ROAD + CITY.sidewalk;
const SIDEWALK_WALK = HALF_ROAD + 0.9;
const SIDEWALK_TREE = HALF_ROAD + 2.3;
const BUILDING_COLORS = ['#dcd6c8', '#c7b59a', '#9ba6b2', '#e8e3d8', '#b3a287', '#7d8a98', '#f2eee6', '#a9b4a0'];
const VENUE_COLORS = ['#c2410c', '#0f766e', '#1d4ed8', '#b45309', '#be123c', '#15803d'];
const SIDE_NORMALS: readonly Vec2[] = [
  { x: -1, z: 0 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: 0, z: 1 },
];

function createVenue(block: Rect, district: string, index: number, rand: Random): Venue {
  const side = Math.floor(rand() * 4);
  const along = range(0.25, 0.75, rand);
  const x = side === 0 ? block.minX - 1.5 : side === 1 ? block.maxX + 1.5 : block.minX + (block.maxX - block.minX) * along;
  const z = side === 2 ? block.minZ - 1.5 : side === 3 ? block.maxZ + 1.5 : block.minZ + (block.maxZ - block.minZ) * along;
  return {
    x,
    z,
    name: RESTAURANTS[index % RESTAURANTS.length],
    district,
    normal: SIDE_NORMALS[side],
    color: VENUE_COLORS[index % VENUE_COLORS.length],
  };
}

export function roadX(i: number): number {
  return i * CITY.pitch;
}

export function roadZ(j: number): number {
  return j * CITY.pitch;
}

export function createCityLayout(): Layout {
  const rand = createRandom(CITY.seed);
  const { cols, rows, pitch } = CITY;
  const bounds: Rect = {
    minX: -pitch * 0.6,
    maxX: roadX(cols - 1) + pitch * 0.6,
    minZ: -pitch * 0.6,
    maxZ: roadZ(rows - 1) + pitch * 0.6,
  };

  const boxes: Box[] = [];
  const zones: Zone[] = [];
  const blocks: Block[] = [];
  const venues: Venue[] = [];

  const tree = (x: number, z: number) => {
    boxes.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6, height: 7, color: '#4f8a45', kind: 'tree', seed: rand() });
  };

  for (let bi = 0; bi < cols - 1; bi++) {
    for (let bj = 0; bj < rows - 1; bj++) {
      const block: Rect = {
        minX: roadX(bi) + BLOCK_INSET,
        maxX: roadX(bi + 1) - BLOCK_INSET,
        minZ: roadZ(bj) + BLOCK_INSET,
        maxZ: roadZ(bj + 1) - BLOCK_INSET,
      };
      const district = ALGIERS_DISTRICTS[(bi + bj) % ALGIERS_DISTRICTS.length];
      blocks.push({ ...block, district });

      for (let z = block.minZ + 8; z < block.maxZ - 4; z += 22) {
        if (rand() < 0.55) tree(roadX(bi) + SIDEWALK_TREE, z);
        if (rand() < 0.55) tree(roadX(bi + 1) - SIDEWALK_TREE, z);
      }
      for (let x = block.minX + 8; x < block.maxX - 4; x += 22) {
        if (rand() < 0.55) tree(x, roadZ(bj) + SIDEWALK_TREE);
        if (rand() < 0.55) tree(x, roadZ(bj + 1) - SIDEWALK_TREE);
      }

      const zoneRoll = rand();
      if (zoneRoll < 0.14) {
        zones.push({ rect: block, kind: 'park' });
        for (const fx of [0.25, 0.75]) {
          for (const fz of [0.25, 0.75]) {
            tree(block.minX + (block.maxX - block.minX) * fx, block.minZ + (block.maxZ - block.minZ) * fz);
          }
        }
        continue;
      }
      if (zoneRoll < 0.2) {
        zones.push({ rect: block, kind: pick(ZONE_KINDS, rand) });
        continue;
      }

      if (rand() < 0.2) venues.push(createVenue(block, district, venues.length, rand));

      const nx = 2 + Math.floor(rand() * 2);
      const nz = 2 + Math.floor(rand() * 2);
      const gap = 3;
      const cellW = (block.maxX - block.minX - gap * (nx - 1)) / nx;
      const cellD = (block.maxZ - block.minZ - gap * (nz - 1)) / nz;

      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          const cellMinX = block.minX + ix * (cellW + gap);
          const cellMinZ = block.minZ + iz * (cellD + gap);
          if (nx * nz > 1 && rand() < 0.15) {
            tree(cellMinX + cellW / 2, cellMinZ + cellD / 2);
            continue;
          }
          const inset = rand() * 1.5;
          const tall = rand() < 0.22;
          boxes.push({
            minX: cellMinX + inset,
            maxX: cellMinX + cellW - inset,
            minZ: cellMinZ + inset,
            maxZ: cellMinZ + cellD - inset,
            height: tall ? range(55, 92, rand) : range(12, 48, rand),
            color: pick(BUILDING_COLORS, rand),
            kind: 'building',
            seed: rand(),
          });
        }
      }
    }
  }

  const thick = 6;
  boxes.push(
    { minX: bounds.minX - thick, maxX: bounds.minX, minZ: bounds.minZ, maxZ: bounds.maxZ, height: 0, color: '', kind: 'boundary', seed: 0 },
    { minX: bounds.maxX, maxX: bounds.maxX + thick, minZ: bounds.minZ, maxZ: bounds.maxZ, height: 0, color: '', kind: 'boundary', seed: 0 },
    { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ - thick, maxZ: bounds.minZ, height: 0, color: '', kind: 'boundary', seed: 0 },
    { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.maxZ, maxZ: bounds.maxZ + thick, height: 0, color: '', kind: 'boundary', seed: 0 },
  );

  const carLanes: Lane[] = [];
  const walkLanes: Lane[] = [];

  for (let j = 0; j < rows; j++) {
    for (const dir of [1, -1] as const) {
      carLanes.push({
        axis: 'x',
        fixed: roadZ(j) + dir * CITY.laneOffset,
        dir,
        min: bounds.minX,
        max: bounds.maxX,
        length: bounds.maxX - bounds.minX,
        roadIndex: j,
        stops: Array.from({ length: cols }, (_, i) => ({ pos: roadX(i), i, j })),
      });
      walkLanes.push({
        axis: 'x',
        fixed: roadZ(j) + dir * SIDEWALK_WALK,
        dir,
        min: bounds.minX,
        max: bounds.maxX,
        length: bounds.maxX - bounds.minX,
        roadIndex: j,
        stops: [],
      });
    }
  }

  for (let i = 0; i < cols; i++) {
    for (const dir of [1, -1] as const) {
      carLanes.push({
        axis: 'z',
        fixed: roadX(i) + dir * CITY.laneOffset,
        dir,
        min: bounds.minZ,
        max: bounds.maxZ,
        length: bounds.maxZ - bounds.minZ,
        roadIndex: i,
        stops: Array.from({ length: rows }, (_, j) => ({ pos: roadZ(j), i, j })),
      });
      walkLanes.push({
        axis: 'z',
        fixed: roadX(i) + dir * SIDEWALK_WALK,
        dir,
        min: bounds.minZ,
        max: bounds.maxZ,
        length: bounds.maxZ - bounds.minZ,
        roadIndex: i,
        stops: [],
      });
    }
  }

  const cones: Vec2[] = [];
  for (let k = 0; k < 28; k++) {
    const side = rand() < 0.5 ? 1 : -1;
    if (rand() < 0.5) {
      const j = Math.floor(rand() * rows);
      cones.push({ x: range(bounds.minX + 20, bounds.maxX - 20, rand), z: roadZ(j) + side * 6.5 });
    } else {
      const i = Math.floor(rand() * cols);
      cones.push({ x: roadX(i) + side * 6.5, z: range(bounds.minZ + 20, bounds.maxZ - 20, rand) });
    }
  }

  return { bounds, boxes, zones, carLanes, walkLanes, cones, blocks, venues };
}
