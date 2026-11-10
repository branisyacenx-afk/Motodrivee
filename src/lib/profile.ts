import { UPGRADES, VEHICLES, type PaintId, type UpgradeId, type VehicleId } from '@/game/config';
import type { ShiftSummary } from '@/game/types';
import { completedTasks } from '@/lib/tasks';

export interface Profile {
  name: string;
  wallet: number;
  xp: number;
  totalDeliveries: number;
  totalEarned: number;
  reputation: number;
  cleanDeliveries: number;
  dailyDeliveries: number;
  dailyChallengeDate: string;
  dailyChallengeClaimed: boolean;
  weeklyDeliveries: number;
  weeklyChallengeWeek: string;
  weeklyChallengeClaimed: boolean;
  dailyStreak: number;
  lastDailyClaim: string | null;
  owned: VehicleId[];
  vehicle: VehicleId;
  paint: PaintId;
  riderGender: 'male' | 'female';
  riderJacket: string;
  riderHelmet: string;
  upgrades: Record<UpgradeId, number>;
  bestScore: number;
}

const STORAGE_KEY = 'swift-drop-profile';
const STARTING_WALLET = 1000;
const XP_PER_DELIVERY = 100;
const XP_PER_LEVEL = 500;
export const DAILY_DELIVERY_GOAL = 3;
export const DAILY_CHALLENGE_REWARD = 1200;
export const WEEKLY_DELIVERY_GOAL = 15;
export const WEEKLY_CHALLENGE_REWARD = 6000;

export function levelFor(xp: number): number {
  return 1 + Math.floor(xp / XP_PER_LEVEL);
}

export function careerRank(level: number): string {
  if (level >= 20) return 'أسطورة التوصيل';
  if (level >= 12) return 'محترف المدينة';
  if (level >= 7) return 'سائق خبير';
  if (level >= 4) return 'سائق نشيط';
  if (level >= 2) return 'مبتدئ متقدم';
  return 'متدرّب جديد';
}

export function levelProgress(xp: number): number {
  return Math.floor(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);
}

export function todayKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function weekKey(date: Date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  return todayKey(monday);
}

function dayBefore(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return todayKey(new Date(year, month - 1, day - 1));
}

export function dailyRewardFor(streak: number): number {
  return Math.min(2500, 500 + streak * 250);
}

function nextStreak(profile: Profile, today: string): number {
  return profile.lastDailyClaim === dayBefore(today) ? profile.dailyStreak + 1 : 1;
}

export function dailyRewardPreview(profile: Profile, today: string): number {
  return dailyRewardFor(nextStreak(profile, today));
}

export function claimDaily(profile: Profile, today: string): Profile | null {
  if (profile.lastDailyClaim === today) return null;
  const streak = nextStreak(profile, today);
  return { ...profile, wallet: profile.wallet + dailyRewardFor(streak), dailyStreak: streak, lastDailyClaim: today };
}

export function claimDailyChallenge(profile: Profile, today: string): Profile | null {
  const deliveries = profile.dailyChallengeDate === today ? profile.dailyDeliveries : 0;
  const alreadyClaimed = profile.dailyChallengeDate === today && profile.dailyChallengeClaimed;
  if (deliveries < DAILY_DELIVERY_GOAL || alreadyClaimed) return null;
  return { ...profile, wallet: profile.wallet + DAILY_CHALLENGE_REWARD, dailyChallengeDate: today, dailyChallengeClaimed: true };
}

export function claimWeeklyChallenge(profile: Profile, week: string): Profile | null {
  const deliveries = profile.weeklyChallengeWeek === week ? profile.weeklyDeliveries : 0;
  const alreadyClaimed = profile.weeklyChallengeWeek === week && profile.weeklyChallengeClaimed;
  if (deliveries < WEEKLY_DELIVERY_GOAL || alreadyClaimed) return null;
  return { ...profile, wallet: profile.wallet + WEEKLY_CHALLENGE_REWARD, weeklyChallengeWeek: week, weeklyChallengeClaimed: true };
}

export function createProfile(): Profile {
  return {
    name: 'الراكب', wallet: STARTING_WALLET, xp: 0, totalDeliveries: 0, totalEarned: 0, reputation: 80, cleanDeliveries: 0,
    dailyDeliveries: 0, dailyChallengeDate: todayKey(), dailyChallengeClaimed: false,
    weeklyDeliveries: 0, weeklyChallengeWeek: weekKey(), weeklyChallengeClaimed: false,
    dailyStreak: 0, lastDailyClaim: null, owned: ['classic'], vehicle: 'classic', paint: 'swift', riderGender: 'male', riderJacket: '#253b55', riderHelmet: '#f1f3f5',
    upgrades: { engine: 0, handling: 0, helmet: 0 }, bestScore: 0,
  };
}

function isVehicleId(value: unknown): value is VehicleId {
  return VEHICLES.some((v) => v.id === value);
}

function isPaintId(value: unknown): value is PaintId {
  return value === 'swift' || value === 'ocean' || value === 'graphite';
}

function finiteNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function loadProfile(): Profile {
  const fallback = createProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    const upgrades = parsed.upgrades ?? fallback.upgrades;
    const owned = Array.isArray(parsed.owned) ? parsed.owned.filter(isVehicleId) : fallback.owned;
    const today = todayKey();
    const challengeDate = typeof parsed.dailyChallengeDate === 'string' ? parsed.dailyChallengeDate : today;
    const week = weekKey();
    const challengeWeek = typeof parsed.weeklyChallengeWeek === 'string' ? parsed.weeklyChallengeWeek : week;
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 16) : fallback.name,
      wallet: finiteNonNegative(parsed.wallet, fallback.wallet),
      xp: Math.floor(finiteNonNegative(parsed.xp, 0)),
      totalDeliveries: Math.floor(finiteNonNegative(parsed.totalDeliveries, 0)),
      totalEarned: Math.floor(finiteNonNegative(parsed.totalEarned, 0)),
      reputation: Math.min(100, Math.floor(finiteNonNegative(parsed.reputation, 80))),
      cleanDeliveries: Math.floor(finiteNonNegative(parsed.cleanDeliveries, 0)),
      dailyDeliveries: challengeDate === today ? Math.floor(finiteNonNegative(parsed.dailyDeliveries, 0)) : 0,
      dailyChallengeDate: challengeDate === today ? challengeDate : today,
      dailyChallengeClaimed: challengeDate === today && parsed.dailyChallengeClaimed === true,
      weeklyDeliveries: challengeWeek === week ? Math.floor(finiteNonNegative(parsed.weeklyDeliveries, 0)) : 0,
      weeklyChallengeWeek: challengeWeek === week ? challengeWeek : week,
      weeklyChallengeClaimed: challengeWeek === week && parsed.weeklyChallengeClaimed === true,
      dailyStreak: Math.floor(finiteNonNegative(parsed.dailyStreak, 0)),
      lastDailyClaim: typeof parsed.lastDailyClaim === 'string' ? parsed.lastDailyClaim : null,
      owned: owned.includes('classic') ? owned : ['classic', ...owned],
      vehicle: isVehicleId(parsed.vehicle) && owned.includes(parsed.vehicle) ? parsed.vehicle : fallback.vehicle,
      paint: isPaintId(parsed.paint) ? parsed.paint : fallback.paint,
      riderGender: parsed.riderGender === 'female' ? 'female' : 'male',
      riderJacket: typeof parsed.riderJacket === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.riderJacket) ? parsed.riderJacket : fallback.riderJacket,
      riderHelmet: typeof parsed.riderHelmet === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.riderHelmet) ? parsed.riderHelmet : fallback.riderHelmet,
      upgrades: { engine: clampLevel(upgrades.engine, 'engine'), handling: clampLevel(upgrades.handling, 'handling'), helmet: clampLevel(upgrades.helmet, 'helmet') },
      bestScore: finiteNonNegative(parsed.bestScore, 0),
    };
  } catch (error) {
    console.warn('Could not read the Swift Drop profile from local storage.', error);
    return fallback;
  }
}

function clampLevel(value: unknown, id: UpgradeId): number {
  const max = UPGRADES.find((u) => u.id === id)?.costs.length ?? 0;
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
}

export function saveProfile(profile: Profile): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }
  catch (error) { console.warn('Could not save the Swift Drop profile to local storage.', error); }
}

export function buyVehicle(profile: Profile, id: VehicleId): Profile | null {
  const def = VEHICLES.find((v) => v.id === id);
  if (!def || profile.owned.includes(id) || profile.wallet < def.price || levelFor(profile.xp) < def.requiredLevel) return null;
  return { ...profile, wallet: profile.wallet - def.price, owned: [...profile.owned, id], vehicle: id };
}

export function selectVehicle(profile: Profile, id: VehicleId): Profile {
  return profile.owned.includes(id) ? { ...profile, vehicle: id } : profile;
}

export function selectPaint(profile: Profile, paint: PaintId): Profile {
  return { ...profile, paint };
}

export function buyUpgrade(profile: Profile, id: UpgradeId): Profile | null {
  const def = UPGRADES.find((u) => u.id === id);
  const level = profile.upgrades[id];
  if (!def || level >= def.costs.length) return null;
  const cost = def.costs[level];
  if (profile.wallet < cost) return null;
  return { ...profile, wallet: profile.wallet - cost, upgrades: { ...profile.upgrades, [id]: level + 1 } };
}

export function debitWallet(profile: Profile, amount: number): Profile | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cost = Math.ceil(amount);
  if (profile.wallet < cost) return null;
  return { ...profile, wallet: profile.wallet - cost };
}

export function creditDelivery(profile: Profile, pay: number, onTime = true): Profile {
  const reward = Math.max(0, Math.round(pay));
  const today = todayKey();
  const week = weekKey();
  const dailyDeliveries = profile.dailyChallengeDate === today ? profile.dailyDeliveries : 0;
  const weeklyDeliveries = profile.weeklyChallengeWeek === week ? profile.weeklyDeliveries : 0;
  return {
    ...profile, wallet: profile.wallet + reward, xp: profile.xp + XP_PER_DELIVERY,
    reputation: Math.max(0, Math.min(100, profile.reputation + (onTime ? 2 : -4))),
    cleanDeliveries: profile.cleanDeliveries + (onTime ? 1 : 0),
    totalDeliveries: profile.totalDeliveries + 1, totalEarned: profile.totalEarned + reward,
    dailyDeliveries: dailyDeliveries + 1, dailyChallengeDate: today,
    dailyChallengeClaimed: profile.dailyChallengeDate === today && profile.dailyChallengeClaimed,
    weeklyDeliveries: weeklyDeliveries + 1, weeklyChallengeWeek: week,
    weeklyChallengeClaimed: profile.weeklyChallengeWeek === week && profile.weeklyChallengeClaimed,
  };
}

export function creditShift(profile: Profile, summary: ShiftSummary): Profile {
  const taskReward = completedTasks(summary).reduce((sum, task) => sum + task.reward, 0);
  return { ...profile, wallet: profile.wallet + taskReward, bestScore: Math.max(profile.bestScore, summary.score) };
}

export function nextUpgradeCost(profile: Profile, id: UpgradeId): number | null {
  const def = UPGRADES.find((u) => u.id === id);
  return def?.costs[profile.upgrades[id]] ?? null;
}
