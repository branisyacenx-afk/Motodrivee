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


// The motorcycle uses a 10-litre tank; fuel is sold at a fixed Algerian-dinar price.
export const FUEL_TANK_LITERS = 10;
export const FUEL_PRICE_PER_LITER = 500;

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
export type RiderOutfitId = 'custom' | 'courier' | 'night' | 'sport' | 'desert' | 'elite';

export interface RiderOutfitDef {
  id: RiderOutfitId;
  name: string;
  description: string;
  price: number;
  requiredLevel: number;
  jacket: string;
  helmet: string;
  trousers: string;
  boots: string;
  accent: string | null;
}

export const RIDER_OUTFITS: readonly RiderOutfitDef[] = [
  { id: 'custom', name: 'ألواني الخاصة', description: 'ألوان السترة والخوذة التي تختارها بنفسك', price: 0, requiredLevel: 1, jacket: '#253b55', helmet: '#f1f3f5', trousers: '#20252d', boots: '#11151a', accent: null },
  { id: 'courier', name: 'زي سويفت الرسمي', description: 'سترة توصيل أنيقة مع شريط تعريفي واضح', price: 0, requiredLevel: 1, jacket: '#263d59', helmet: '#f2f4f7', trousers: '#20252d', boots: '#11151a', accent: '#e2b83d' },
  { id: 'night', name: 'زي الليل العاكس', description: 'ألوان عالية الوضوح وخطوط عاكسة للقيادة الليلية', price: 8500, requiredLevel: 4, jacket: '#b88a22', helmet: '#17202b', trousers: '#30343b', boots: '#101318', accent: '#fff0a8' },
  { id: 'sport', name: 'بدلة رياضية', description: 'مظهر رياضي مع واقيات كتف بارزة', price: 16000, requiredLevel: 8, jacket: '#a92732', helmet: '#f2f2f2', trousers: '#171b23', boots: '#101318', accent: '#d8dbe0', handlingFactor: 1.08, damageFactor: 0.98, specialty: 'سرعة رياضية' },
  { id: 'desert', name: 'زي الرحلات', description: 'ألوان ترابية مناسبة للطرق المفتوحة', price: 26000, requiredLevel: 12, jacket: '#a87d50', helmet: '#405e4a', trousers: '#514738', boots: '#2a2118', accent: '#d6bd93' },
  { id: 'elite', name: 'زي النخبة', description: 'طقم مميز يفتح مع التقدم في المهنة', price: 48000, requiredLevel: 16, jacket: '#4a3671', helmet: '#d7d1c4', trousers: '#23212b', boots: '#11151a', accent: '#d7b85c' },
];
export type UpgradeId = 'engine' | 'handling' | 'helmet';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  tagline: string;
  price: number;
  requiredLevel: number;
  speed: number;
  accel: number;
  handlingFactor: number;
  damageFactor: number;
  specialty: string;
}

export const VEHICLES: readonly VehicleDef[] = [
  { id: 'classic', name: 'كلاسيك 125', tagline: 'دراجة عملية لشوارع المدينة', price: 0, requiredLevel: 1, speed: 1, accel: 1, handlingFactor: 1.00, damageFactor: 1.00, specialty: 'توازن البداية' },
  { id: 'street125', name: 'ستريت 125', tagline: 'خفيفة وسهلة في الأزقة', price: 6500, requiredLevel: 2, speed: 1.02, accel: 1.04, handlingFactor: 1.14, damageFactor: 0.99, specialty: 'رشاقة الأزقة' },
  { id: 'sport', name: 'سبورت 200', tagline: 'توازن أفضل وسرعة أعلى', price: 12000, requiredLevel: 3, speed: 1.1, accel: 1.15, handlingFactor: 1.08, damageFactor: 0.98, specialty: 'سرعة رياضية' },
  { id: 'city150', name: 'سيتي 150', tagline: 'عملية للطلبات المتتالية', price: 18500, requiredLevel: 4, speed: 1.08, accel: 1.12, handlingFactor: 1.10, damageFactor: 0.97, specialty: 'اقتصاد المدينة' },
  { id: 'urban180', name: 'أوربان 180', tagline: 'ثبات مريح داخل المدينة', price: 26000, requiredLevel: 5, speed: 1.12, accel: 1.16, handlingFactor: 1.03, damageFactor: 0.96, specialty: 'ثبات يومي' },
  { id: 'beast', name: 'تورينغ 250', tagline: 'قوية للرحلات الطويلة', price: 35000, requiredLevel: 6, speed: 1.2, accel: 1.22, handlingFactor: 0.94, damageFactor: 0.91, specialty: 'راحة الرحلات' },
  { id: 'racer220', name: 'رايسر 220', tagline: 'تسارع رياضي سريع', price: 47000, requiredLevel: 7, speed: 1.22, accel: 1.28, handlingFactor: 1.12, damageFactor: 0.98, specialty: 'تسارع حاد' },
  { id: 'touring250', name: 'تورينغ 250 إكس', tagline: 'راحة وثبات للمسافات', price: 62000, requiredLevel: 8, speed: 1.2, accel: 1.24, handlingFactor: 0.92, damageFactor: 0.90, specialty: 'تحمل المسافات' },
  { id: 'desert300', name: 'ديزرت 300', tagline: 'مصممة للطرق المفتوحة', price: 80000, requiredLevel: 9, speed: 1.25, accel: 1.27, handlingFactor: 0.98, damageFactor: 0.91, specialty: 'تماسك الطرق الوعرة' },
  { id: 'falcon320', name: 'فالكون 320', tagline: 'قوة متوازنة واستجابة حادة', price: 102000, requiredLevel: 10, speed: 1.28, accel: 1.3, handlingFactor: 1.07, damageFactor: 0.95, specialty: 'استجابة متوازنة' },
  { id: 'shadow350', name: 'شادو 350', tagline: 'قيادة مستقرة وشخصية قوية', price: 128000, requiredLevel: 11, speed: 1.3, accel: 1.31, handlingFactor: 0.90, damageFactor: 0.89, specialty: 'ثبات ثقيل' },
  { id: 'storm400', name: 'ستورم 400', tagline: 'أداء قوي في كل الأحياء', price: 158000, requiredLevel: 12, speed: 1.32, accel: 1.34, handlingFactor: 0.99, damageFactor: 0.93, specialty: 'قوة متعددة الاستخدام' },
  { id: 'rally450', name: 'رالي 450', tagline: 'مناسبة للطرق الصعبة', price: 192000, requiredLevel: 13, speed: 1.34, accel: 1.36, handlingFactor: 0.96, damageFactor: 0.88, specialty: 'حماية الطرق الصعبة' },
  { id: 'phantom500', name: 'فانتوم 500', tagline: 'سرعة عالية وتحكم متقدم', price: 232000, requiredLevel: 14, speed: 1.37, accel: 1.39, handlingFactor: 1.09, damageFactor: 0.94, specialty: 'تحكم سريع' },
  { id: 'titan550', name: 'تيتان 550', tagline: 'قوة كبيرة للطلبات البعيدة', price: 278000, requiredLevel: 15, speed: 1.39, accel: 1.4, handlingFactor: 0.89, damageFactor: 0.87, specialty: 'تحمل الحمولة' },
  { id: 'vortex600', name: 'فورتكس 600', tagline: 'أداء احترافي متقدم', price: 330000, requiredLevel: 16, speed: 1.41, accel: 1.43, handlingFactor: 1.04, damageFactor: 0.92, specialty: 'توازن احترافي' },
  { id: 'blaze650', name: 'بلايز 650', tagline: 'تسارع قوي وسرعة قصوى', price: 390000, requiredLevel: 17, speed: 1.44, accel: 1.45, handlingFactor: 1.11, damageFactor: 0.94, specialty: 'مناورة رياضية' },
  { id: 'nighthawk700', name: 'نايت هوك 700', tagline: 'ثبات ممتاز في السرعات', price: 460000, requiredLevel: 18, speed: 1.46, accel: 1.47, handlingFactor: 0.91, damageFactor: 0.86, specialty: 'ثبات السرعات العالية' },
  { id: 'apex750', name: 'أبيكس 750', tagline: 'دراجة نخبة للسائقين المحترفين', price: 540000, requiredLevel: 19, speed: 1.48, accel: 1.49, handlingFactor: 1.06, damageFactor: 0.90, specialty: 'استجابة نخبوية' },
  { id: 'ultimate1000', name: 'ألتيميت 1000', tagline: 'قمة أسطول سويفت دروب', price: 650000, requiredLevel: 20, speed: 1.52, accel: 1.52, handlingFactor: 1.02, damageFactor: 0.85, specialty: 'أداء شامل' },
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
    turnRate: BASE_BIKE.turnRate * def.handlingFactor * (1 + 0.12 * handling),
    damageFactor: def.damageFactor * (1 - 0.15 * helmet),
  };
}
