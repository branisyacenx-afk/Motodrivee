import { Check } from 'lucide-react';
import { PAINTS, UPGRADES, VEHICLES } from '@/game/config';
import { formatMoney } from '@/lib/money';
import { buyUpgrade, buyVehicle, nextUpgradeCost, selectPaint, selectVehicle, type Profile } from '@/lib/profile';

interface PanelProps {
  profile: Profile;
  onUpdate: (next: Profile) => void;
}

const CARD = 'rounded-2xl bg-white/5 p-5';
const PRIMARY_BUTTON =
  'rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none';
const SECONDARY_BUTTON =
  'rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]';

function bonusLabel(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 100);
  return percent === 0 ? 'أساسي' : `+${percent}%`;
}

export function BikesPanel({ profile, onUpdate }: PanelProps) {
  return (
    <ul className="grid gap-3">
      {VEHICLES.map((vehicle) => {
        const owned = profile.owned.includes(vehicle.id);
        const selected = profile.vehicle === vehicle.id;
        const canAfford = profile.wallet >= vehicle.price;
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
              <p className="mt-2 text-xs font-semibold text-slate-300">
                السرعة القصوى {bonusLabel(vehicle.speed)} · التسارع {bonusLabel(vehicle.accel)}
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
                اشريها بـ {formatMoney(vehicle.price)}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PaintPanel({ profile, onUpdate }: PanelProps) {
  return (
    <div className={CARD}>
      <p className="text-sm text-slate-300">اختار لون جسم الدراجة وصندوق التوصيل.</p>
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
