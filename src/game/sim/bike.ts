import type { BikeStats } from '@/game/config';
import { BASE_BIKE } from '@/game/config';
import type { Rect } from '@/game/types';

export interface BikeState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  wheelSpin: number;
}

export interface BikeInput {
  throttle: number;
  brake: number;
  steer: number;
}

export function createBike(x: number, z: number, heading: number): BikeState {
  return { x, z, heading, speed: 0, wheelSpin: 0 };
}

export function stepBikeMotion(bike: BikeState, input: BikeInput, stats: BikeStats, dt: number): void {
  const { maxSpeed } = stats;
  const accel = input.throttle * stats.accel * (1 - Math.min(1, bike.speed / maxSpeed) ** 2);
  const drag = 0.4 + bike.speed * 0.02;
  const braking = input.brake * BASE_BIKE.brake;

  bike.speed = Math.max(0, Math.min(maxSpeed, bike.speed + (accel - drag - braking) * dt));

  const steerFactor = Math.min(1, bike.speed / 6) * (1 - 0.35 * Math.min(1, bike.speed / maxSpeed));
  bike.heading += input.steer * stats.turnRate * steerFactor * dt;

  bike.x += Math.sin(bike.heading) * bike.speed * dt;
  bike.z += Math.cos(bike.heading) * bike.speed * dt;
  bike.wheelSpin += bike.speed * dt * 3;
}

export interface Contact {
  nx: number;
  nz: number;
  depth: number;
}

export function circleVsRect(x: number, z: number, radius: number, rect: Rect): Contact | null {
  const cx = Math.min(rect.maxX, Math.max(rect.minX, x));
  const cz = Math.min(rect.maxZ, Math.max(rect.minZ, z));
  const dx = x - cx;
  const dz = z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 > radius * radius) return null;

  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, nz: dz / d, depth: radius - d };
  }

  const left = x - rect.minX;
  const right = rect.maxX - x;
  const back = z - rect.minZ;
  const front = rect.maxZ - z;
  const m = Math.min(left, right, back, front);
  if (m === left) return { nx: -1, nz: 0, depth: left + radius };
  if (m === right) return { nx: 1, nz: 0, depth: right + radius };
  if (m === back) return { nx: 0, nz: -1, depth: back + radius };
  return { nx: 0, nz: 1, depth: front + radius };
}

export function circleVsCircle(x: number, z: number, radius: number, ox: number, oz: number, oradius: number): Contact | null {
  const dx = x - ox;
  const dz = z - oz;
  const total = radius + oradius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= total * total) return null;
  const d = Math.sqrt(d2) || 1e-6;
  return { nx: dx / d, nz: dz / d, depth: total - d };
}
