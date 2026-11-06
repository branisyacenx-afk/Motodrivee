import { Check } from 'lucide-react';
import { BikePreview } from '@/components/screens/BikePreview';
import { getBikeStats, PAINTS, UPGRADES, VEHICLES } from '@/game/config';
import { formatMoney } from '@/lib/money';
import { buyUpgrade, buyVehicle, levelFor, nextUpgradeCost, selectPaint, selectVehicle, type Profile } from '@/lib/profile';

interface PanelProps {
  profile: Profile;
  onUpdate: (next: Profile) => void;
}

const CARD = 'rounded-2xl bg-white/5 p-5';
const PRIMARY_BUTTON =
  'rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none';
const SECONDARY_BUTTON =
  'rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]';

export function BikesPanel({ profile, onUpdate }: PanelProps) {
  const currentLevel = levelFor(profile.xp);
  const selectedBike = VEHICLES.find((vehicle) => vehicle.id === profile.vehicle) ?? VEHICLES[0];
  return (
    <>
      <BikePreview paint={PAINTS.find((paint) => paint.id === profile.paint)?.hex ?? '#d7262e'} vehicleId={selectedBike.id} vehicleName={selectedBike.name} riderGender={profile.riderGender} riderJacket={profile.riderJacket} riderHelmet={profile.riderHelmet} />
    <ul className="grid gap-3">
      {VEHICLES.map((vehicle) => {
        const owned = profile.owned.includes(vehicle.id);
        const selected = profile.vehicle === vehicle.id;
        const levelLocked = currentLevel < vehicle.requiredLevel;
        const canAfford = profile.wallet >= vehicle.price && !levelLocked;
        const stats = getBikeStats(vehicle.id, profile.upgrades);
        const protection = Math.round((1 - stats.damageFactor) * 100);
        const statRows = [
          { label: 'السرعة', value: Math.round(stats.maxSpeed), percent: Math.round((stats.maxSpeed / 30) * 100) },
          { label: 'التسارع', value: `${Math.round(stats.accel * 10) / 10}`, percent: Math.round((stats.accel / 11) * 100) },
          { label: 'المناورة', value: `${Math.round(stats.turnRate * 100) / 100}`, percent: Math.round((stats.turnRate / 2.1) * 100) },
          { label: 'الحماية', value: `${protection}%`, percent: Math.round((protection / 45) * 100) },
        ];
        return (
          <li
            key={vehicle.id}
            className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
              selected ? 'ring-2 ring-brand-500' : 'ring-1 ring-white/10'
            }`}
          >
            <div>
              <p className="text-lg font-bold">{vehicle.name}</p>
              <p className="mt-0.5 text-sm text-slate-400">{vehicle.tagline}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:max-w-md">
                {statRows.map((stat) => (
                  <div key={stat.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-300">
                      <span>{stat.label}</span>
                      <span className="tabular-nums text-white">{stat.value}</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-white/10"
                      role="progressbar"
                      aria-label={`${stat.label} ${vehicle.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, stat.percent)}
                    >
                      <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${Math.min(100, stat.percent)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className={`mt-2 text-xs font-bold ${levelLocked ? 'text-amber-300' : 'text-emerald-300'}`}>
                {levelLocked ? `تُفتح في المستوى ${vehicle.requiredLevel} · مستواك ${currentLevel}` : `متاحة للشراء · المستوى ${vehicle.requiredLevel}+`}
              </p>
            </div>
            {selected ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                <Check className="h-4 w-4" />
                راكبها دابا
              </span>
            ) : owned ? (
              <button type="button" onClick={() => onUpdate(selectVehicle(profile, vehicle.id))} className={SECONDARY_BUTTON}>
                اختارها
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => {
                  const next = buyVehicle(profile, vehicle.id);
                  if (next) onUpdate(next);
                }}
                className={PRIMARY_BUTTON}
              >
                {levelLocked ? `مقفولة حتى المستوى ${vehicle.requiredLevel}` : `اشريها بـ ${formatMoney(vehicle.price)}`}
              </button>
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}

export function PaintPanel({ profile, onUpdate }: PanelProps) {
  return (
    <div className={CARD}>
      <p className="text-sm text-slate-300">اختار لون جسم الدراجة وصندوق التوصيل، ثم خصّص مظهر السائق.</p>
      <div className="mt-5 rounded-xl bg-black/20 p-4">
        <p className="mb-3 text-sm font-bold text-white">شخصية السائق</p>
        <div className="grid grid-cols-2 gap-2">
          {([{ id: 'male', label: 'رجل' }, { id: 'female', label: 'امرأة' }] as const).map((option) => (
            <button key={option.id} type="button" aria-pressed={profile.riderGender === option.id} onClick={() => onUpdate({ ...profile, riderGender: option.id })}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${profile.riderGender === option.id ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-300'}`}>{option.label}</button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-slate-300">لون السترة<input aria-label="لون سترة السائق" type="color" value={profile.riderJacket} onChange={(event) => onUpdate({ ...profile, riderJacket: event.target.value })} className="mt-2 h-10 w-full cursor-pointer rounded-lg bg-transparent" /></label>
          <label className="text-xs font-semibold text-slate-300">لون الخوذة<input aria-label="لون خوذة السائق" type="color" value={profile.riderHelmet} onChange={(event) => onUpdate({ ...profile, riderHelmet: event.target.value })} className="mt-2 h-10 w-full cursor-pointer rounded-lg bg-transparent" /></label>
        </div>
        <p className="mt-2 text-xs text-slate-400">تُحفظ اختياراتك تلقائياً وتظهر على السائق أثناء اللعب.</p>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {PAINTS.map((paint) => {
          const active = profile.paint === paint.id;
          return (
            <li key={paint.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onUpdate(selectPaint(profile, paint.id))}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-bold transition hover:bg-white/10 active:scale-[0.98] ${
                  active ? 'bg-white/10 ring-2 ring-brand-500' : 'ring-1 ring-white/10'
                }`}
              >
                <span className="h-8 w-8 shrink-0 rounded-full ring-2 ring-white/20" style={{ backgroundColor: paint.hex }} />
                <span className="flex-1">{paint.name}</span>
                {active && <Check className="h-4 w-4 text-brand-300" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function UpgradesPanel({ profile, onUpdate }: PanelProps) {
  return (
    <ul className="grid gap-3">
      {UPGRADES.map((def) => {
        const level = profile.upgrades[def.id];
        const cost = nextUpgradeCost(profile, def.id);
        return (
          <li key={def.id} className={`${CARD} ring-1 ring-white/10`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold">{def.name}</p>
                <p className="mt-1 text-sm text-slate-400">{def.description}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-300">
                المستوى {level}/{def.costs.length}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {def.costs.map((_, index) => (
                  <span key={index} className={`h-2 w-8 rounded-full ${index < level ? 'bg-emerald-500' : 'bg-white/15'}`} />
                ))}
              </div>
              {cost === null ? (
                <span className="text-sm font-bold text-emerald-400">وصلت للحد الأقصى</span>
              ) : (
                <button
                  type="button"
                  disabled={profile.wallet < cost}
                  onClick={() => {
                    const next = buyUpgrade(profile, def.id);
                    if (next) onUpdate(next);
                  }}
                  className={PRIMARY_BUTTON}
                >
                  طوّر بـ {formatMoney(cost)}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
