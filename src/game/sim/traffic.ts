import { CITY } from '@/game/config';
import { createRandom, range } from '@/game/random';
import type { Lane, Layout } from '@/game/types';

export const CAR_HALF_LENGTH = 2.3;
export const CAR_HALF_WIDTH = 1.0;

const CAR_COLORS = ['#e9ebee', '#1c1f24', '#8e959e', '#b8c4d0', '#7a2a2a', '#2d4a6b', '#f4f4f1', '#c9a227'];
const WALK_COLORS = ['#2e4057', '#8c5e3c', '#d1495b', '#3d6b5c', '#e2b714', '#5a5a80'];
const SKIN_COLORS = ['#f1c8a0', '#c68a5c', '#8d5a3b', '#e8b48c'];

export interface Car {
  lane: Lane;
  pos: number;
  speed: number;
  cruise: number;
  color: string;
  nearCooldown: number;
}

export interface Pedestrian {
  lane: Lane;
  pos: number;
  speed: number;
  shirt: string;
  skin: string;
  phase: number;
}

export interface Traffic {
  cars: Car[];
  pedestrians: Pedestrian[];
}

export function greenAxis(i: number, j: number, t: number): 'x' | 'z' {
  const cycle = Math.floor(t / CITY.lightHalfCycle);
  return (cycle + i + j) % 2 === 0 ? 'x' : 'z';
}

export function aheadDistance(from: number, to: number, dir: 1 | -1, length: number): number {
  const d = (dir * (to - from)) % length;
  return d < 0 ? d + length : d;
}

export function createTraffic(layout: Layout): Traffic {
  const rand = createRandom(CITY.seed + 99);
  const cars: Car[] = [];
  for (const lane of layout.carLanes) {
    const count = 2 + Math.floor(rand() * 2);
    const spacing = lane.length / count;
    // Spread vehicles around the loop so a new shift never starts with a
    // traffic jam caused by several cars being randomly placed nose-to-tail.
    const offset = rand() * spacing;
    for (let k = 0; k < count; k++) {
      const cruise = range(9, 14, rand);
      const jitter = (rand() - 0.5) * spacing * 0.18;
      cars.push({
        lane,
        pos: lane.min + ((offset + k * spacing + jitter + lane.length) % lane.length),
        speed: cruise,
        cruise,
        color: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
        nearCooldown: 0,
      });
    }
  }

  const pedestrians: Pedestrian[] = [];
  for (const lane of layout.walkLanes) {
    const count = 2;
    const spacing = lane.length / count;
    const offset = rand() * spacing;
    for (let k = 0; k < count; k++) {
      const jitter = (rand() - 0.5) * spacing * 0.2;
      pedestrians.push({
        lane,
        pos: lane.min + ((offset + k * spacing + jitter + lane.length) % lane.length),
        speed: range(1.1, 1.8, rand),
        shirt: WALK_COLORS[Math.floor(rand() * WALK_COLORS.length)],
        skin: SKIN_COLORS[Math.floor(rand() * SKIN_COLORS.length)],
        phase: rand() * Math.PI * 2,
      });
    }
  }

  return { cars, pedestrians };
}

function wrap(pos: number, lane: Lane): number {
  if (pos > lane.max) return pos - lane.length;
  if (pos < lane.min) return pos + lane.length;
  return pos;
}

export function updateTraffic(traffic: Traffic, t: number, dt: number): void {
  const carsByLane = new Map<Lane, Car[]>();
  for (const car of traffic.cars) {
    const list = carsByLane.get(car.lane);
    if (list) list.push(car);
    else carsByLane.set(car.lane, [car]);
  }

  for (const car of traffic.cars) {
    const { lane } = car;
    let desired = car.cruise;

    let leadGap = Infinity;
    let lead: Car | null = null;
    for (const other of carsByLane.get(lane) ?? []) {
      if (other === car) continue;
      const ahead = aheadDistance(car.pos, other.pos, lane.dir, lane.length);
      if (ahead > 0 && ahead < leadGap) {
        leadGap = ahead;
        lead = other;
      }
    }
    if (lead) {
      const gap = leadGap - CAR_HALF_LENGTH * 2;
      if (gap < 16) desired = Math.min(desired, Math.max(0, lead.speed + (gap - 8) * 0.8));
    }

    for (const stop of lane.stops) {
      const ahead = aheadDistance(car.pos, stop.pos, lane.dir, lane.length);
      const isRed = greenAxis(stop.i, stop.j, t) !== lane.axis;
      if (isRed && ahead > 9 && ahead < 30) {
        desired = Math.min(desired, Math.sqrt(2 * 6 * (ahead - 9)));
      }
    }

    if (car.speed < desired) car.speed = Math.min(desired, car.speed + 3.5 * dt);
    else car.speed = Math.max(desired, car.speed - 9 * dt);

    car.pos = wrap(car.pos + lane.dir * car.speed * dt, lane);
    car.nearCooldown = Math.max(0, car.nearCooldown - dt);
  }

  for (const ped of traffic.pedestrians) {
    ped.pos = wrap(ped.pos + ped.lane.dir * ped.speed * dt, ped.lane);
    ped.phase += dt * ped.speed * 2.2;
  }
}
