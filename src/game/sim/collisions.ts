import { BASE_BIKE } from '@/game/config';
import { CAR_HALF_LENGTH, CAR_HALF_WIDTH, type Car, type Traffic } from '@/game/sim/traffic';
import { type BikeState, circleVsCircle, circleVsRect, type Contact } from '@/game/sim/bike';
import type { Box, BikeContactKind, Rect, Vec2 } from '@/game/types';

const PEDESTRIAN_RADIUS = 0.5;
const CONE_RADIUS = 0.6;
const CLOSE_CALL_RANGE = 1.3;

export interface BikeHit {
  kind: BikeContactKind | 'close-call';
  impact: number;
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

  for (const box of boxes) {
    const contact = circleVsRect(bike.x, bike.z, radius, box);
    if (!contact) continue;
    const impact = pushOut(bike, contact, 0.7);
    if (impact > 0.5) hits.push({ kind: 'wall', impact });
  }

  for (const car of traffic.cars) {
    const rect = carRect(car);
    const distance = rectDistance(bike.x, bike.z, rect);
    if (distance >= radius && distance < radius + CLOSE_CALL_RANGE && bike.speed > 12 && car.nearCooldown <= 0) {
      car.nearCooldown = 3;
      hits.push({ kind: 'close-call', impact: 0 });
    }
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
    const contact = circleVsCircle(bike.x, bike.z, radius, px, pz, PEDESTRIAN_RADIUS);
    if (!contact) continue;
    const impact = pushOut(bike, contact, 0.6);
    if (impact > 1) hits.push({ kind: 'pedestrian', impact });
  }

  return hits;
}
