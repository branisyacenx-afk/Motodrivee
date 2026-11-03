export const CITY = {
  cols: 40,
  rows: 40,
  pitch: 90,
  roadWidth: 16,
  sidewalk: 3.5,
  laneOffset: 4,
  lightHalfCycle: 7,
  seed: 20251,
} as const;

export const SHIFT_SECONDS = 600;

export const ALGIERS_DISTRICTS = ['باب الوادي', 'حسين داي', 'القبة', 'الحراش', 'بئر مراد رايس', 'حيدرة'] as const;

export const BASE_BIKE = {
  maxSpeed: 30,
  accel: 11,
  brake: 26,
  turnRate: 2.1,
  radius: 1.1,
  health: 100,
} as const;

export type VehicleId = 'classic' | 'sport' | 'beast';
export type PaintId = 'swift' | 'ocean' | 'graphite';
export type UpgradeId = 'engine' | 'handling' | 'helmet';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  tagline: string;
  price: number;
  speed: number;
  accel: number;
}

export const VEHICLES: readonly VehicleDef[] = [
  { id: 'classic', name: 'كلاسيك 125', tagline: 'دراجة عملية لشوارع المدينة', price: 0, speed: 1, accel: 1 },
  { id: 'sport', name: 'سبورت 200', tagline: 'توازن أفضل وسرعة أعلى', price: 12000, speed: 1.1, accel: 1.15 },
  { id: 'beast', name: 'تورينغ 250', tagline: 'دراجة قوية للرحلات الطويلة', price: 35000, speed: 1.2, accel: 1.22 },
];

export const PAINTS: readonly { id: PaintId; name: string; hex: string }[] = [
  { id: 'swift', name: 'أحمر سويفت', hex: '#d7262e' },
  { id: 'ocean', name: 'أزرق البحر', hex: '#1f6fb2' },
  { id: 'graphite', name: 'رمادي غرافيت', hex: '#3a3f47' },
];

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  costs: readonly number[];
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'engine', name: 'تعديل المحرك', description: '+8% في السرعة القصوى وتسارع أحسن في كل مستوى', costs: [2500, 5000, 9000] },
  { id: 'handling', name: 'تحسين التوجيه', description: '+12% في سرعة الاستجابة للمنعطفات في كل مستوى', costs: [2000, 4500, 8000] },
  { id: 'helmet', name: 'خوذة محترفة', description: '15% أقل من الضرر عند الاصطدام في كل مستوى', costs: [1500, 3500, 6500] },
];

export const RESTAURANTS = [
  'شاورما الحومة',
  'بيتزا الجزائر',
  'مطعم الكسكسي',
  'مشوي الشارع',
  'سلطة الواحات',
  'مطعم الشرق',
  'فلافل الشباب',
  'سندويتش بلدي',
] as const;

export interface BikeStats {
  maxSpeed: number;
  accel: number;
  turnRate: number;
  damageFactor: number;
}

export function getBikeStats(vehicle: VehicleId, upgrades: Record<UpgradeId, number>): BikeStats {
  const def = VEHICLES.find((v) => v.id === vehicle) ?? VEHICLES[0];
  const engine = upgrades.engine;
  const handling = upgrades.handling;
  const helmet = upgrades.helmet;
  return {
    maxSpeed: BASE_BIKE.maxSpeed * def.speed * (1 + 0.08 * engine),
    accel: BASE_BIKE.accel * def.accel * (1 + 0.1 * engine),
    turnRate: BASE_BIKE.turnRate * (1 + 0.12 * handling),
    damageFactor: 1 - 0.15 * helmet,
  };
}
