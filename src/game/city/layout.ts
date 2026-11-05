import { ALGIERS_DISTRICTS, CITY, RESTAURANTS } from '@/game/config';
import { createRandom, pick, range, type Random } from '@/game/random';
import type { Block, Box, Lane, Layout, Rect, Vec2, Venue, Zone, ZoneKind } from '@/game/types';

const ZONE_KINDS: readonly Exclude<ZoneKind, 'park'>[] = ['plaza', 'parking', 'oasis'];

const HALF_ROAD = CITY.roadWidth / 2;
const BLOCK_INSET = HALF_ROAD + CITY.sidewalk;
const SIDEWALK_WALK = HALF_ROAD + 0.9;
const SIDEWALK_TREE = HALF_ROAD + 2.3;
// Each district has a restrained architectural palette to make the city easier to read.
const DISTRICT_BUILDING_PALETTES: readonly (readonly string[])[] = [
  ['#e8d8c2', '#c9ad8e', '#f0e6d7'], // Bab El Oued: warm coastal plaster
  ['#d8d2c5', '#aeb9bd', '#eee9df'], // Hussein Dey: neutral urban tones
  ['#e6dfcf', '#b8aa91', '#d0c5b3'], // Kouba: limestone and sand
  ['#d9c8b5', '#b7a08a', '#eee0cf'], // El Harrach: earthy tones
  ['#e8e4dc', '#c5c9c5', '#b4c0b5'], // Bir Mourad Rais: pale stone and sage
  ['#eee8df', '#c8c0b4', '#aeb8b0'], // Hydra: light stone and muted green
];
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
  const civicBuildings: Layout['civicBuildings'] = [];

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
      const districtIndex = Math.min(ALGIERS_DISTRICTS.length - 1, Math.floor((bi / (cols - 1)) * ALGIERS_DISTRICTS.length));
      const district = ALGIERS_DISTRICTS[districtIndex];
      const buildingColors = DISTRICT_BUILDING_PALETTES[districtIndex];
      blocks.push({ ...block, district });

      const civic = bi === 1 && bj === 1
        ? { kind: 'bank' as const, name: 'بنك المدينة', color: '#176b62' }
        : bi === cols - 3 && bj === 2
          ? { kind: 'kiosk' as const, name: 'كشك الحي', color: '#d97706' }
          : bi === Math.floor(cols / 2) && bj === rows - 3
            ? { kind: 'market' as const, name: 'سوق المدينة', color: '#a83d36' }
            : bi === 2 && bj === rows - 3
              ? { kind: 'police' as const, name: 'مركز الشرطة', color: '#285b91' }
              : null;
      if (civic) {
        civicBuildings.push({ ...block, ...civic });
        continue;
      }

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
            color: pick(buildingColors, rand),
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

  const fuelStations: Vec2[] = [
    { x: roadX(1) + 8, z: roadZ(1) + 8 },
    { x: roadX(cols - 2) - 8, z: roadZ(2) - 8 },
    { x: roadX(3) + 8, z: roadZ(rows - 2) + 8 },
    { x: roadX(Math.floor(cols / 2)) - 8, z: roadZ(Math.floor(rows / 2)) - 8 },
  ];

  const policeZones: Vec2[] = [
    { x: roadX(2) + 15, z: roadZ(rows - 3) + 12 },
    { x: roadX(cols - 3) - 15, z: roadZ(2) + 12 },
    { x: roadX(Math.floor(cols / 2)) + 12, z: roadZ(Math.floor(rows / 2)) - 12 },
  ];

  const repairShops: Vec2[] = [
    { x: roadX(2) - 9, z: roadZ(4) + 8 },
    { x: roadX(cols - 3) + 9, z: roadZ(rows - 3) - 8 },
    { x: roadX(Math.floor(cols / 2) + 1) + 9, z: roadZ(1) - 8 },
  ];

  return { bounds, boxes, zones, carLanes, walkLanes, cones, blocks, venues, fuelStations, repairShops, civicBuildings, policeZones };
}
