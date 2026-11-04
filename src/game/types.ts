export interface Vec2 {
  x: number;
  z: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Block extends Rect {
  district: string;
}

export interface Box extends Rect {
  height: number;
  color: string;
  kind: 'building' | 'tree' | 'boundary';
  seed: number;
}

export interface Stop {
  pos: number;
  i: number;
  j: number;
}

export interface Lane {
  axis: 'x' | 'z';
  fixed: number;
  dir: 1 | -1;
  min: number;
  max: number;
  length: number;
  roadIndex: number;
  stops: Stop[];
}

export interface Venue extends Vec2 {
  name: string;
  district: string;
  normal: Vec2;
  color: string;
}

export type ZoneKind = 'park' | 'plaza' | 'parking' | 'oasis';

export interface Zone {
  rect: Rect;
  kind: ZoneKind;
}

export interface Layout {
  bounds: Rect;
  boxes: Box[];
  zones: Zone[];
  carLanes: Lane[];
  walkLanes: Lane[];
  cones: Vec2[];
  blocks: Block[];
  venues: Venue[];
}

export type BikeContactKind = 'wall' | 'car' | 'pedestrian' | 'cone';

export interface GameEvent {
  kind: 'good' | 'bad' | 'info';
  text: string;
}

export interface OrderHud {
  restaurant: string;
  phase: 'pickup' | 'dropoff';
  pickupDistrict: string;
  dropoffDistrict: string;
  distance: number;
  timeLeft: number;
  timeLimit: number;
  pay: number;
  progress: number;
}

export interface OfferHud {
  restaurant: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  distance: number;
  pay: number;
  expiresIn: number;
}

export interface HudSnapshot {
  speedKmh: number;
  gameHour: number;
  gameMinute: number;
  weather: 'clear' | 'cloudy' | 'rain' | 'fog' | 'wind';
  shiftLeft: number;
  score: number;
  earnings: number;
  deliveries: number;
  health: number;
  order: OrderHud | null;
  offer: OfferHud | null;
  turn: { direction: 'left' | 'right' | 'straight' | 'uturn'; distance: number; target: 'pickup' | 'dropoff' } | null;
  minimap: { x: number; z: number; heading: number; target: Vec2 | null };
  players: number;
  link: LinkStatus;
}

export type LinkStatus = 'connecting' | 'live' | 'offline';

export interface ShiftSummary {
  score: number;
  earnings: number;
  deliveries: number;
  lateDeliveries: number;
}
