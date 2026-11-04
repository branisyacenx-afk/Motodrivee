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
  isChild: boolean;
}

export interface Traffic {
  cars: Car[];
  pedestrians: Pedestrian[];
}

export type SignalState = 'red' | 'amber' | 'green';

const AMBER_SECONDS = 1.1;
const SIGNAL_BRAKE_DISTANCE = 36;
const SIGNAL_STOP_OFFSET = 5.5;

export function greenAxis(i: number, j: number, t: number): 'x' | 'z' {
  const cycle = Math.floor(t / CITY.lightHalfCycle);
  return (cycle + i + j) % 2 === 0 ? 'x' : 'z';
}

/** Shared by simulation and rendering so amber timing never drifts visually. */
export function trafficSignalState(axis: 'x' | 'z', i: number, j: number, t: number): SignalState {
  if (greenAxis(i, j, t) !== axis) return 'red';
  const phase = ((t % CITY.lightHalfCycle) + CITY.lightHalfCycle) % CITY.lightHalfCycle;
  return phase >= CITY.lightHalfCycle - AMBER_SECONDS ? 'amber' : 'green';
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
    const count = 3;
    const spacing = lane.length / count;
    const offset = rand() * spacing;
    for (let k = 0; k < count; k++) {
      const jitter = (rand() - 0.5) * spacing * 0.2;
      const isChild = rand() < 0.22;
      pedestrians.push({
        lane,
        pos: lane.min + ((offset + k * spacing + jitter + lane.length) % lane.length),
        speed: isChild ? range(0.9, 1.35, rand) : range(1.1, 1.8, rand),
        shirt: WALK_COLORS[Math.floor(rand() * WALK_COLORS.length)],
        skin: SKIN_COLORS[Math.floor(rand() * SKIN_COLORS.length)],
        phase: rand() * Math.PI * 2,
        isChild,
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
  // Read every vehicle from the same frame snapshot. Updating positions in
  // place while scanning made later cars react to a different traffic state.
  const carsByLane = new Map<Lane, Car[]>();
  for (const car of traffic.cars) {
    const list = carsByLane.get(car.lane);
    if (list) list.push(car);
    else carsByLane.set(car.lane, [car]);
  }

  const nextCars: Array<{ car: Car; pos: number; speed: number; travel: number; lead: Car | null; leadGap: number; stopDistance: number }> = [];
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
      // Follow the leader smoothly and preserve a small safety buffer.
      if (gap < 22) {
        const followSpeed = Math.max(0, lead.speed + (gap - 7) * 1.05);
        desired = Math.min(desired, followSpeed);
      }
    }

    let redStopDistance = Infinity;
    for (const stop of lane.stops) {
      const ahead = aheadDistance(car.pos, stop.pos, lane.dir, lane.length);
      const signal = trafficSignalState(lane.axis, stop.i, stop.j, t);
      if (ahead <= 0 || ahead >= SIGNAL_BRAKE_DISTANCE || signal === 'green') continue;

      // At amber, stop only when there is enough room to brake safely. If the
      // rider is already too close, clear the junction instead of hard braking.
      const brakingDistance = (car.speed * car.speed) / (2 * 8);
      if (signal === 'amber' && ahead < brakingDistance + SIGNAL_STOP_OFFSET + 2) continue;

      redStopDistance = Math.min(redStopDistance, ahead);
      const stoppingDistance = Math.max(0, ahead - SIGNAL_STOP_OFFSET);
      const signalSpeed = Math.sqrt(2 * 8 * stoppingDistance);
      desired = Math.min(desired, signalSpeed);
    }

    const speed = car.speed < desired
      ? Math.min(desired, car.speed + 3.5 * dt)
      : Math.max(desired, car.speed - 9 * dt);
    nextCars.push({
      car,
      speed,
      pos: car.pos,
      travel: speed * dt,
      lead,
      leadGap,
      stopDistance: redStopDistance,
    });
  }

  // Resolve movement from the same frame snapshot. A follower may never
  // consume the leader's safety buffer, even after a long or stalled frame.
  const travelByCar = new Map<Car, number>();
  for (const next of nextCars) {
    let safeTravel = next.travel;
    if (next.lead && Number.isFinite(next.leadGap)) {
      const leaderTravel = travelByCar.get(next.lead);
      // If the leader has not been resolved yet, its unconstrained movement
      // is a conservative upper bound; the final pass below tightens it.
      const leadMovement = leaderTravel ?? next.lead.speed * dt;
      const bumperGap = next.leadGap - CAR_HALF_LENGTH * 2;
      safeTravel = Math.min(safeTravel, Math.max(0, leadMovement + bumperGap - 7));
    }

    // Keep the red/amber stop-line clamp independent from car-following.
    if (Number.isFinite(next.stopDistance)) {
      safeTravel = Math.min(safeTravel, Math.max(0, next.stopDistance - SIGNAL_STOP_OFFSET));
    }
    travelByCar.set(next.car, safeTravel);
  }

  // Relax the follower constraints repeatedly so a stopped lead car
  // propagates safely through an entire queue, regardless of array order.
  for (let pass = 0; pass < nextCars.length; pass++) {
    let changed = false;
    for (const next of nextCars) {
      if (!next.lead || !Number.isFinite(next.leadGap)) continue;
      const leaderTravel = travelByCar.get(next.lead) ?? 0;
      const bumperGap = next.leadGap - CAR_HALF_LENGTH * 2;
      const allowed = Math.max(0, leaderTravel + bumperGap - 7);
      const current = travelByCar.get(next.car) ?? next.travel;
      if (allowed + 0.001 < current) {
        travelByCar.set(next.car, allowed);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Commit together so car order in the array cannot affect the simulation.
  for (const next of nextCars) {
    const safeTravel = travelByCar.get(next.car) ?? next.travel;
    next.car.speed = dt > 0 ? Math.min(next.speed, safeTravel / dt) : next.speed;
    next.car.pos = wrap(next.car.pos + next.car.lane.dir * safeTravel, next.car.lane);
    next.car.nearCooldown = Math.max(0, next.car.nearCooldown - dt);
  }

  for (const ped of traffic.pedestrians) {
    ped.pos = wrap(ped.pos + ped.lane.dir * ped.speed * dt, ped.lane);
    ped.phase += dt * ped.speed * 2.2;
  }
}
