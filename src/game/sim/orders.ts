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
// Weighted distance bands keep jobs varied: very short and very long trips
// are occasional, while medium-distance work remains the everyday norm.
const PICKUP_BANDS = [
  { min: 0, max: 90, weight: 10 },
  { min: 90, max: 220, weight: 20 },
  { min: 220, max: 450, weight: 40 },
  { min: 450, max: 750, weight: 20 },
  { min: 750, max: 1100, weight: 10 },
] as const;
const DELIVERY_BANDS = [
  { min: 55, max: 140, weight: 10 },
  { min: 140, max: 280, weight: 20 },
  { min: 280, max: 500, weight: 40 },
  { min: 500, max: 760, weight: 20 },
  { min: 760, max: 1050, weight: 10 },
] as const;
const ARRIVAL_RADIUS = 9;
// Require a genuine near-stop (0.75 m/s ≈ 2.7 km/h), not a slow roll.
// This prevents pickup/drop-off progress while the rider is still moving.
const STOP_SPEED = 0.75;

export function requiredWait(phase: ActiveOrder['phase']): number {
  return phase === 'pickup' ? 3 : 1.5;
}

export function createOfferGenerator(blocks: readonly Block[], venues: readonly Venue[], seed: number): (origin: Vec2) => Offer {
  const rand = createRandom(seed);
  // Remember a short history so consecutive offers feel like different jobs.
  // Keep this state inside the generator: each game world gets its own history.
  const recentRestaurants: string[] = [];
  return (origin) => {
    const offer = createOffer(blocks, venues, rand, origin, recentRestaurants);
    recentRestaurants.push(offer.restaurant);
    if (recentRestaurants.length > 3) recentRestaurants.shift();
    return offer;
  };
}

function weightedBand<T extends { weight: number }>(bands: readonly T[], rand: Random): T {
  const total = bands.reduce((sum, band) => sum + band.weight, 0);
  let ticket = rand() * total;
  for (const band of bands) {
    ticket -= band.weight;
    if (ticket < 0) return band;
  }
  return bands[bands.length - 1];
}

function randomPointOnBlock(block: Block, rand: Random): Vec2 {
  const side = Math.floor(rand() * 4);
  if (side === 0) return { x: block.minX - 1.5, z: range(block.minZ, block.maxZ, rand) };
  if (side === 1) return { x: block.maxX + 1.5, z: range(block.minZ, block.maxZ, rand) };
  if (side === 2) return { x: range(block.minX, block.maxX, rand), z: block.minZ - 1.5 };
  return { x: range(block.minX, block.maxX, rand), z: block.maxZ + 1.5 };
}

function createOffer(
  blocks: readonly Block[],
  venues: readonly Venue[],
  rand: Random,
  origin: Vec2,
  recentRestaurants: readonly string[],
): Offer {
  const pickupBand = weightedBand(PICKUP_BANDS, rand);
  const pickupCandidates = venues.filter((venue) => {
    const distance = Math.hypot(venue.x - origin.x, venue.z - origin.z);
    return distance >= pickupBand.min && distance < pickupBand.max;
  });
  const fallbackVenues = [...venues].sort((a, b) => Math.hypot(a.x - origin.x, a.z - origin.z) - Math.hypot(b.x - origin.x, b.z - origin.z)).slice(0, 12);
  const candidates = pickupCandidates.length ? pickupCandidates : fallbackVenues;
  const freshCandidates = candidates.filter((venue) => !recentRestaurants.includes(venue.name));
  // Prefer a restaurant not used in the last three offers, but never block
  // offer generation if a small city has too few distinct venues.
  const venue = pick(freshCandidates.length ? freshCandidates : candidates, rand);
  const pickup = { x: venue.x, z: venue.z };
  const deliveryBand = weightedBand(DELIVERY_BANDS, rand);
  const nearby = blocks.filter((block) => {
    const straight = Math.hypot((block.minX + block.maxX) / 2 - pickup.x, (block.minZ + block.maxZ) / 2 - pickup.z);
    return straight >= deliveryBand.min && straight < deliveryBand.max;
  });
  const dropBlock = pick(nearby.length > 0 ? nearby : blocks, rand);
  const dropoff = randomPointOnBlock(dropBlock, rand);
  const straight = Math.hypot(dropoff.x - pickup.x, dropoff.z - pickup.z);
  const distance = straight * 1.12;
  const approachDistance = Math.hypot(pickup.x - origin.x, pickup.z - origin.z);
  const totalDistance = approachDistance + distance;
  return {
    restaurant: venue.name,
    pickup,
    dropoff,
    pickupDistrict: venue.district,
    dropoffDistrict: dropBlock.district,
    distance,
    pay: Math.round(450 + distance * (distance >= 500 ? 1.25 : 0.95) + approachDistance * 0.4),
    // Shorter deadlines make every delivery a real challenge; longer routes
    // still receive extra time, but never the old three-minute window.
    timeLimit: Math.max(42, Math.min(125, Math.round(totalDistance / 9 + 26))),
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
