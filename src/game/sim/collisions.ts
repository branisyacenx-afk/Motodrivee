import { BASE_BIKE } from '@/game/config';
import { CAR_HALF_LENGTH, CAR_HALF_WIDTH, type Car, type Traffic } from '@/game/sim/traffic';
import { type BikeState, circleVsCircle, circleVsRect, type Contact } from '@/game/sim/bike';
import type { Box, BikeContactKind, Rect, Vec2 } from '@/game/types';

const PEDESTRIAN_RADIUS = 0.5;
const CONE_RADIUS = 0.6;
const CLOSE_CALL_RANGE = 1.3;
const COLLISION_CELL_SIZE = 45;
const MAX_INDEXED_CELLS_PER_BOX = 16;

export interface BikeHit {
  kind: BikeContactKind | 'close-call';
  impact: number;
}

interface StaticBoxIndex {
  cells: Map<string, Box[]>;
  oversized: Box[];
}

// Layout geometry is immutable for a game session. Cache its broad-phase index
// by array identity so the expensive build happens only once per city layout.
const boxIndexCache = new WeakMap<readonly Box[], StaticBoxIndex>();

function cellKey(x: number, z: number): string {
  return `${x},${z}`;
}

function getStaticBoxIndex(boxes: readonly Box[]): StaticBoxIndex {
  const cached = boxIndexCache.get(boxes);
  if (cached) return cached;

  const index: StaticBoxIndex = { cells: new Map(), oversized: [] };
  for (const box of boxes) {
    const minX = Math.floor(box.minX / COLLISION_CELL_SIZE);
    const maxX = Math.floor(box.maxX / COLLISION_CELL_SIZE);
    const minZ = Math.floor(box.minZ / COLLISION_CELL_SIZE);
    const maxZ = Math.floor(box.maxZ / COLLISION_CELL_SIZE);
    const cellCount = (maxX - minX + 1) * (maxZ - minZ + 1);

    // World-boundary rectangles cover much of the map; keep them in a tiny
    // fallback list rather than duplicating them into hundreds of grid cells.
    if (cellCount > MAX_INDEXED_CELLS_PER_BOX) {
      index.oversized.push(box);
      continue;
    }

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = cellKey(x, z);
        const bucket = index.cells.get(key);
        if (bucket) bucket.push(box);
        else index.cells.set(key, [box]);
      }
    }
  }

  boxIndexCache.set(boxes, index);
  return index;
}

function nearbyStaticBoxes(index: StaticBoxIndex, x: number, z: number, radius: number): Box[] {
  const candidates = new Set<Box>(index.oversized);
  const minX = Math.floor((x - radius) / COLLISION_CELL_SIZE);
  const maxX = Math.floor((x + radius) / COLLISION_CELL_SIZE);
  const minZ = Math.floor((z - radius) / COLLISION_CELL_SIZE);
  const maxZ = Math.floor((z + radius) / COLLISION_CELL_SIZE);

  for (let cellX = minX; cellX <= maxX; cellX++) {
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      for (const box of index.cells.get(cellKey(cellX, cellZ)) ?? []) candidates.add(box);
    }
  }
  return [...candidates];
}

export function carRect(car: Car): Rect {
  const { lane, pos } = car;
  if (lane.axis === 'x') {
    return { minX: pos - CAR_HALF_LENGTH, maxX: pos + CAR_HALF_LENGTH, minZ: lane.fixed - CAR_HALF_WIDTH, maxZ: lane.fixed + CAR_HALF_WIDTH };
  }
  return { minX: lane.fixed - CAR_HALF_WIDTH, maxX: lane.fixed + CAR_HALF_WIDTH, minZ: pos - CAR_HALF_LENGTH, maxZ: pos + CAR_HALF_LENGTH };
}

function rectDistance(x: number, z: number, rect: Rect): number {
  const dx = x - Math.min(rect.maxX, Math.max(rect.minX, x));
  const dz = z - Math.min(rect.maxZ, Math.max(rect.minZ, z));
  return Math.hypot(dx, dz);
}

function pushOut(bike: BikeState, contact: Contact, bounce: number): number {
  bike.x += contact.nx * contact.depth;
  bike.z += contact.nz * contact.depth;
  const forwardX = Math.sin(bike.heading);
  const forwardZ = Math.cos(bike.heading);
  const impact = bike.speed * Math.max(0, -(forwardX * contact.nx + forwardZ * contact.nz));
  if (impact > 0) bike.speed = Math.max(0, bike.speed - impact * bounce);
  return impact;
}

export function resolveBikeContacts(bike: BikeState, boxes: readonly Box[], traffic: Traffic, cones: readonly Vec2[]): BikeHit[] {
  const hits: BikeHit[] = [];
  const radius = BASE_BIKE.radius;
  // Include cells reachable by the largest possible corner push-out so later
  // resolution passes can see adjacent geometry after the bike moves.
  const nearbyBoxes = nearbyStaticBoxes(getStaticBoxIndex(boxes), bike.x, bike.z, radius * 3);

  // Resolve static contacts in short passes. At building corners, one
  // push can move the bike into a second overlapping rectangle; a few bounded
  // passes settle the rider outside both without scanning the whole city.
  let wallImpact = 0;
  const maxResolutionPasses = 3;
  for (let pass = 0; pass < maxResolutionPasses; pass++) {
    let corrected = false;
    for (const box of nearbyBoxes) {
      const contact = circleVsRect(bike.x, bike.z, radius, box);
      if (!contact) continue;
      const impact = pushOut(bike, contact, 0.7);
      wallImpact = Math.max(wallImpact, impact);
      corrected = true;
    }
    if (!corrected) break;
  }
  if (wallImpact > 0.5) hits.push({ kind: 'wall', impact: wallImpact });

  for (const car of traffic.cars) {
    const rect = carRect(car);
    const distance = rectDistance(bike.x, bike.z, rect);
    if (distance >= radius && distance < radius + CLOSE_CALL_RANGE && bike.speed > 12 && car.nearCooldown <= 0) {
      car.nearCooldown = 3;
      hits.push({ kind: 'close-call', impact: 0 });
    }
    if (distance >= radius) continue;
    const contact = circleVsRect(bike.x, bike.z, radius, rect);
    if (!contact) continue;
    const impact = pushOut(bike, contact, 0.9);
    if (impact > 0.5) hits.push({ kind: 'car', impact });
  }

  for (const cone of cones) {
    const contact = circleVsCircle(bike.x, bike.z, radius, cone.x, cone.z, CONE_RADIUS);
    if (!contact) continue;
    const impact = pushOut(bike, contact, 0.85);
    if (impact > 0.5) hits.push({ kind: 'cone', impact });
  }

  for (const ped of traffic.pedestrians) {
    const px = ped.lane.axis === 'x' ? ped.pos : ped.lane.fixed;
    const pz = ped.lane.axis === 'x' ? ped.lane.fixed : ped.pos;
    const dx = bike.x - px;
    const dz = bike.z - pz;
    const combinedRadius = radius + PEDESTRIAN_RADIUS;
    if (dx * dx + dz * dz >= combinedRadius * combinedRadius) continue;
    const contact = circleVsCircle(bike.x, bike.z, radius, px, pz, PEDESTRIAN_RADIUS);
    if (!contact) continue;
    const impact = pushOut(bike, contact, 0.6);
    if (impact > 1) hits.push({ kind: 'pedestrian', impact });
  }

  return hits;
}
