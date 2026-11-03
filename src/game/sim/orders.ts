import { createRandom, pick, range, type Random } from '@/game/random';
import type { Block, Vec2, Venue } from '@/game/types';

export interface Offer {
  restaurant: string;
  pickup: Vec2;
  dropoff: Vec2;
  pickupDistrict: string;
  dropoffDistrict: string;
  distance: number;
  pay: number;
  timeLimit: number;
  expiresIn: number;
}

export interface ActiveOrder extends Omit<Offer, 'expiresIn'> {
  phase: 'pickup' | 'dropoff';
  timeLeft: number;
  progress: number;
  lateSeconds: number;
}

export const OFFER_LIFETIME = 20;
const MIN_TRIP_STRAIGHT = 85;
const MAX_TRIP_STRAIGHT = 175;
const MAX_PICKUP_APPROACH = 220;
const ARRIVAL_RADIUS = 9;
const STOP_SPEED = 4;

export function requiredWait(phase: ActiveOrder['phase']): number {
  return phase === 'pickup' ? 3 : 1.5;
}

export function createOfferGenerator(blocks: readonly Block[], venues: readonly Venue[], seed: number): (origin: Vec2) => Offer {
  const rand = createRandom(seed);
  return (origin) => createOffer(blocks, venues, rand, origin);
}

function randomPointOnBlock(block: Block, rand: Random): Vec2 {
  const side = Math.floor(rand() * 4);
  if (side === 0) return { x: block.minX - 1.5, z: range(block.minZ, block.maxZ, rand) };
  if (side === 1) return { x: block.maxX + 1.5, z: range(block.minZ, block.maxZ, rand) };
  if (side === 2) return { x: range(block.minX, block.maxX, rand), z: block.minZ - 1.5 };
  return { x: range(block.minX, block.maxX, rand), z: block.maxZ + 1.5 };
}

function createOffer(blocks: readonly Block[], venues: readonly Venue[], rand: Random, origin: Vec2): Offer {
  const rankedVenues = [...venues].sort((a, b) => Math.hypot(a.x - origin.x, a.z - origin.z) - Math.hypot(b.x - origin.x, b.z - origin.z));
  const nearbyVenues = rankedVenues.filter((venue) => Math.hypot(venue.x - origin.x, venue.z - origin.z) <= MAX_PICKUP_APPROACH);
  const venue = pick((nearbyVenues.length ? nearbyVenues : rankedVenues.slice(0, 8)), rand);
  const pickup = { x: venue.x, z: venue.z };
  const nearby = blocks.filter((block) => {
    const straight = Math.hypot((block.minX + block.maxX) / 2 - pickup.x, (block.minZ + block.maxZ) / 2 - pickup.z);
    return straight >= MIN_TRIP_STRAIGHT && straight <= MAX_TRIP_STRAIGHT;
  });
  const dropBlock = pick(nearby.length > 0 ? nearby : blocks, rand);
  const dropoff = randomPointOnBlock(dropBlock, rand);
  const straight = Math.hypot(dropoff.x - pickup.x, dropoff.z - pickup.z);
  const distance = straight * 1.12;
  const approachDistance = Math.hypot(pickup.x - origin.x, pickup.z - origin.z);
  return {
    restaurant: venue.name,
    pickup,
    dropoff,
    pickupDistrict: venue.district,
    dropoffDistrict: dropBlock.district,
    distance,
    pay: Math.round(450 + distance * 0.9 + approachDistance * 0.35),
    timeLimit: Math.max(90, Math.min(210, Math.round((approachDistance + distance) / 5 + 55))),
    expiresIn: OFFER_LIFETIME,
  };
}

export function activateOffer(offer: Offer): ActiveOrder {
  const { restaurant, pickup, dropoff, pickupDistrict, dropoffDistrict, distance, pay, timeLimit } = offer;
  return {
    restaurant,
    pickup,
    dropoff,
    pickupDistrict,
    dropoffDistrict,
    distance,
    pay,
    timeLimit,
    phase: 'pickup',
    timeLeft: timeLimit,
    progress: 0,
    lateSeconds: 0,
  };
}

export interface OrderEvent {
  kind: 'picked-up' | 'delivered' | 'none';
}

export function updateActiveOrder(order: ActiveOrder, bikeX: number, bikeZ: number, speed: number, dt: number): OrderEvent {
  order.timeLeft -= dt;
  if (order.timeLeft < 0) order.lateSeconds += dt;

  const target = activeTarget(order);
  const distance = Math.hypot(bikeX - target.x, bikeZ - target.z);
  const waitNeeded = requiredWait(order.phase);

  if (distance < ARRIVAL_RADIUS && speed < STOP_SPEED) {
    order.progress += dt;
  } else {
    order.progress = Math.max(0, order.progress - dt * 2);
  }

  if (order.progress < waitNeeded) return { kind: 'none' };

  order.progress = 0;
  if (order.phase === 'pickup') {
    order.phase = 'dropoff';
    return { kind: 'picked-up' };
  }
  return { kind: 'delivered' };
}

export function activeTarget(order: ActiveOrder): Vec2 {
  return order.phase === 'pickup' ? order.pickup : order.dropoff;
}

export function offerExpired(offer: Offer, dt: number): boolean {
  offer.expiresIn -= dt;
  return offer.expiresIn <= 0;
}
