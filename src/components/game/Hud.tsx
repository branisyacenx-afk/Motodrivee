import { Bike, Gauge, Heart, Pause, Timer, Volume2, VolumeX } from 'lucide-react';
import { EarningsCard, OfferCard, OrderCard, Toasts, TurnCard, GLASS_CARD } from '@/components/game/HudCards';
import type { GameEvent, HudSnapshot } from '@/game/types';

export interface ToastItem extends GameEvent {
  id: number;
}

interface HudProps {
  hud: HudSnapshot;
  toasts: ToastItem[];
  onAccept: () => void;
  onDecline: () => void;
  onPause: () => void;
  onDismissToast: (id: number) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const LINK_DOT: Record<HudSnapshot['link'], string> = {
  connecting: 'bg-amber-400 animate-pulse',
  live: 'bg-emerald-500',
  offline: 'bg-slate-400',
};

const LINK_LABEL: Record<HudSnapshot['link'], string> = {
  connecting: 'جاري الاتصال',
  live: 'متصل',
  offline: 'بلا اتصال',
};

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function Hud({ hud, toasts, onAccept, onDecline, onPause, onDismissToast, muted, onToggleMute }: HudProps) {
  const lowHealth = hud.health < 35;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className={`${GLASS_CARD} flex items-center gap-2 px-3 py-2`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Bike className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold">
            سويفت <span className="text-brand-500">دروب</span>
          </span>
          <span className="mr-1 flex items-center gap-1.5 border-r border-slate-200 pr-2 text-xs font-bold text-slate-600">
            <span className={`h-2 w-2 rounded-full ${LINK_DOT[hud.link]}`} />
            {LINK_LABEL[hud.link]} · {hud.players} لاعب
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition hover:bg-slate-100 active:scale-95"
          >
            {muted ? <VolumeX className="h-5 w-5 text-slate-900" /> : <Volume2 className="h-5 w-5 text-slate-900" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="وقف اللعبة"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition hover:bg-slate-100 active:scale-95"
          >
            <Pause className="h-5 w-5 text-slate-900" />
          </button>
        </div>
      </div>

      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2">
        <Toasts items={toasts} onDismiss={onDismissToast} />
        <TurnCard turn={hud.turn} order={hud.order} />
        <div className="grid grid-cols-[1.25fr_1fr] gap-2">
          <OrderCard order={hud.order} />
          <EarningsCard earnings={hud.earnings} score={hud.score} deliveries={hud.deliveries} />
        </div>
        {hud.offer && <OfferCard offer={hud.offer} onAccept={onAccept} onDecline={onDecline} />}
      </div>

      <div className="mt-auto flex justify-center">
        <div className={`${GLASS_CARD} flex items-center gap-3 px-4 py-2 text-sm font-bold tabular-nums sm:gap-5 sm:px-6`}>
          <span className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-slate-500" />
            {hud.speedKmh} كم/س
          </span>
          <span className="h-4 w-px bg-slate-300" />
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-slate-500" />
            {formatClock(hud.shiftLeft)}
          </span>
          <span className="h-4 w-px bg-slate-300" />
          <span className="flex items-center gap-1.5">
            <Heart className={`h-4 w-4 ${lowHealth ? 'text-brand-500' : 'text-emerald-600'}`} />
            <span className="w-20 overflow-hidden rounded-full bg-slate-200">
              <span
                className={`block h-1.5 rounded-full transition-[width] duration-200 ${lowHealth ? 'bg-brand-500' : 'bg-emerald-500'}`}
                style={{ width: `${hud.health}%` }}
              />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
