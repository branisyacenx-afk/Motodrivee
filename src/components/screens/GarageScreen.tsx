import { useState } from 'react';
import { Bike, Paintbrush, Wallet, Wrench } from 'lucide-react';
import { ScreenHeader } from '@/components/screens/ScreenHeader';
import { BikesPanel, PaintPanel, UpgradesPanel } from '@/components/screens/GaragePanels';
import { formatMoney } from '@/lib/money';
import type { Profile } from '@/lib/profile';

interface GarageScreenProps {
  profile: Profile;
  onUpdate: (next: Profile) => void;
  onBack: () => void;
}

const TABS = [
  { id: 'bikes', label: 'الدراجات', icon: Bike },
  { id: 'paint', label: 'الصبغة', icon: Paintbrush },
  { id: 'upgrades', label: 'التحسينات', icon: Wrench },
] as const;

type Tab = (typeof TABS)[number]['id'];

export function GarageScreen({ profile, onUpdate, onBack }: GarageScreenProps) {
  const [tab, setTab] = useState<Tab>('bikes');

  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-white">
      <ScreenHeader
        title="الكراج"
        onBack={onBack}
        right={
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/15">
            <Wallet className="h-4 w-4 text-amber-300" />
            <span className="tabular-nums">{formatMoney(profile.wallet)}</span>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-8">
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">اسمك في الترتيب</span>
          <input
            value={profile.name}
            maxLength={16}
            onChange={(event) => onUpdate({ ...profile, name: event.target.value })}
            onBlur={() => {
              if (!profile.name.trim()) onUpdate({ ...profile, name: 'الراكب' });
            }}
            className="mt-2 w-full rounded-xl bg-white/5 px-4 py-3 text-base font-semibold text-white ring-1 ring-white/15 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </label>

        <div role="tablist" className="mt-6 grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                tab === id ? 'bg-brand-500 text-white shadow-md' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div key={tab} className="mt-6 animate-rise-in">
          {tab === 'bikes' && <BikesPanel profile={profile} onUpdate={onUpdate} />}
          {tab === 'paint' && <PaintPanel profile={profile} onUpdate={onUpdate} />}
          {tab === 'upgrades' && <UpgradesPanel profile={profile} onUpdate={onUpdate} />}
        </div>
      </main>
    </div>
  );
}
