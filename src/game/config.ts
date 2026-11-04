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

export type VehicleId = 'classic' | 'sport' | 'beast' | 'street125' | 'city150' | 'urban180' | 'racer220' | 'touring250' | 'desert300' | 'falcon320' | 'shadow350' | 'storm400' | 'rally450' | 'phantom500' | 'titan550' | 'vortex600' | 'blaze650' | 'nighthawk700' | 'apex750' | 'legend800' | 'ultimate1000';
export type PaintId = 'swift' | 'ocean' | 'graphite';
export type UpgradeId = 'engine' | 'handling' | 'helmet';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  tagline: string;
  price: number;
  requiredLevel: number;
  speed: number;
  accel: number;
}

export const VEHICLES: readonly VehicleDef[] = [
  { id: 'classic', name: 'كلاسيك 125', tagline: 'دراجة عملية لشوارع المدينة', price: 0, requiredLevel: 1, speed: 1, accel: 1 },
  { id: 'street125', name: 'ستريت 125', tagline: 'خفيفة وسهلة في الأزقة', price: 6500, requiredLevel: 2, speed: 1.02, accel: 1.04 },
  { id: 'sport', name: 'سبورت 200', tagline: 'توازن أفضل وسرعة أعلى', price: 12000, requiredLevel: 3, speed: 1.1, accel: 1.15 },
  { id: 'city150', name: 'سيتي 150', tagline: 'عملية للطلبات المتتالية', price: 18500, requiredLevel: 4, speed: 1.08, accel: 1.12 },
  { id: 'urban180', name: 'أوربان 180', tagline: 'ثبات مريح داخل المدينة', price: 26000, requiredLevel: 5, speed: 1.12, accel: 1.16 },
  { id: 'beast', name: 'تورينغ 250', tagline: 'قوية للرحلات الطويلة', price: 35000, requiredLevel: 6, speed: 1.2, accel: 1.22 },
  { id: 'racer220', name: 'رايسر 220', tagline: 'تسارع رياضي سريع', price: 47000, requiredLevel: 7, speed: 1.22, accel: 1.28 },
  { id: 'touring250', name: 'تورينغ 250 إكس', tagline: 'راحة وثبات للمسافات', price: 62000, requiredLevel: 8, speed: 1.2, accel: 1.24 },
  { id: 'desert300', name: 'ديزرت 300', tagline: 'مصممة للطرق المفتوحة', price: 80000, requiredLevel: 9, speed: 1.25, accel: 1.27 },
  { id: 'falcon320', name: 'فالكون 320', tagline: 'قوة متوازنة واستجابة حادة', price: 102000, requiredLevel: 10, speed: 1.28, accel: 1.3 },
  { id: 'shadow350', name: 'شادو 350', tagline: 'قيادة مستقرة وشخصية قوية', price: 128000, requiredLevel: 11, speed: 1.3, accel: 1.31 },
  { id: 'storm400', name: 'ستورم 400', tagline: 'أداء قوي في كل الأحياء', price: 158000, requiredLevel: 12, speed: 1.32, accel: 1.34 },
  { id: 'rally450', name: 'رالي 450', tagline: 'مناسبة للطرق الصعبة', price: 192000, requiredLevel: 13, speed: 1.34, accel: 1.36 },
  { id: 'phantom500', name: 'فانتوم 500', tagline: 'سرعة عالية وتحكم متقدم', price: 232000, requiredLevel: 14, speed: 1.37, accel: 1.39 },
  { id: 'titan550', name: 'تيتان 550', tagline: 'قوة كبيرة للطلبات البعيدة', price: 278000, requiredLevel: 15, speed: 1.39, accel: 1.4 },
  { id: 'vortex600', name: 'فورتكس 600', tagline: 'أداء احترافي متقدم', price: 330000, requiredLevel: 16, speed: 1.41, accel: 1.43 },
  { id: 'blaze650', name: 'بلايز 650', tagline: 'تسارع قوي وسرعة قصوى', price: 390000, requiredLevel: 17, speed: 1.44, accel: 1.45 },
  { id: 'nighthawk700', name: 'نايت هوك 700', tagline: 'ثبات ممتاز في السرعات', price: 460000, requiredLevel: 18, speed: 1.46, accel: 1.47 },
  { id: 'apex750', name: 'أبيكس 750', tagline: 'دراجة نخبة للسائقين المحترفين', price: 540000, requiredLevel: 19, speed: 1.48, accel: 1.49 },
  { id: 'ultimate1000', name: 'ألتيميت 1000', tagline: 'قمة أسطول سويفت دروب', price: 650000, requiredLevel: 20, speed: 1.52, accel: 1.52 },
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
