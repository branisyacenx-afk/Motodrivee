import { Bike, Cloud, CloudFog, CloudRain, Gauge, Heart, Moon, Pause, Sun, Timer, Volume2, VolumeX, Wind, ShieldAlert, AlertTriangle } from 'lucide-react';
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
  onRefuel: () => void;
  onRepair: () => void;
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

const WEATHER_LABEL: Record<HudSnapshot['weather'], string> = {
  clear: 'صحو',
  cloudy: 'غائم',
  rain: 'ممطر',
  fog: 'ضباب',
  wind: 'رياح',
};

const WEATHER_ICON = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  fog: CloudFog,
  wind: Wind,
} as const;

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

export function Hud({ hud, toasts, onAccept, onDecline, onRefuel, onRepair, onPause, onDismissToast, muted, onToggleMute }: HudProps) {
  const lowHealth = hud.health < 35;
  const criticalHealth = hud.health <= 25;
  const lowFuel = hud.fuel < 25;
  const criticalFuel = hud.fuel <= 15;
  const WeatherIcon = WEATHER_ICON[hud.weather];
  const isNight = hud.gameHour < 6 || hud.gameHour >= 19;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-1.5 p-2 sm:gap-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className={`${GLASS_CARD} flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white sm:h-8 sm:w-8">
            <Bike className="h-5 w-5" />
          </span>
          <span className="text-sm font-extrabold sm:text-base">
            سويفت <span className="text-brand-500">دروب</span>
          </span>
          <span className="mr-1 hidden items-center gap-1.5 border-r border-slate-200 pr-2 text-xs font-bold text-slate-600 sm:flex">
            <span className={`h-2 w-2 rounded-full ${LINK_DOT[hud.link]}`} />
            {LINK_LABEL[hud.link]} · {hud.players} لاعب
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition hover:bg-slate-100 active:scale-95"
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

      {(criticalFuel || criticalHealth) && (
        <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-2" role="status" aria-live="polite">
          {criticalFuel && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-950/95 px-3 py-2 text-xs font-extrabold text-amber-100 shadow-xl">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              الوقود حرج · {hud.fuel}% — ابحث عن محطة
            </div>
          )}
          {criticalHealth && (
            <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-950/95 px-3 py-2 text-xs font-extrabold text-red-100 shadow-xl">
              <Heart className="h-4 w-4 shrink-0 text-red-300" />
              حالة الدراجة حرجة · {hud.health}% — توجّه إلى ورشة
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-auto mx-auto flex w-full max-w-sm flex-col gap-1 sm:gap-2">
        <Toasts items={toasts.slice(-1)} onDismiss={onDismissToast} />
        <TurnCard turn={hud.turn} order={hud.order} />
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-1 sm:gap-2">
          <OrderCard order={hud.order} />
          <EarningsCard earnings={hud.earnings} score={hud.score} deliveries={hud.deliveries} />
        </div>
        {hud.offer && <OfferCard offer={hud.offer} onAccept={onAccept} onDecline={onDecline} />}
      </div>

      {hud.nearFuelStation && (
        <div className="pointer-events-auto absolute bottom-20 right-4 z-30 sm:bottom-24 sm:right-8">
          <button type="button" onClick={onRefuel} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-xl ring-2 ring-white/80 active:scale-95">
            ⛽ تعبئة الوقود · E
          </button>
        </div>
      )}
      {hud.nearPoliceZone && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-950/90 px-4 py-2 text-xs font-extrabold text-white shadow-xl">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            منطقة مراقبة الشرطة · الحد 60 كم/س
          </div>
        </div>
      )}
      {hud.nearRepairShop && (
        <div className="pointer-events-auto absolute bottom-20 left-4 z-30 sm:bottom-24 sm:left-8">
          <button type="button" onClick={onRepair} className="rounded-2xl bg-sky-700 px-4 py-3 text-sm font-extrabold text-white shadow-xl ring-2 ring-white/80 active:scale-95">
            🔧 إصلاح الدراجة · R
          </button>
        </div>
      )}
      <div className="mt-auto flex justify-center">
        <div className={`${GLASS_CARD} flex items-center gap-2 px-3 py-1.5 text-xs font-bold tabular-nums sm:gap-5 sm:px-6 sm:py-2 sm:text-sm`}>
          <span className="flex items-center gap-1.5">
            {isNight ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
            {String(hud.gameHour).padStart(2, '0')}:{String(hud.gameMinute).padStart(2, '0')}
          </span>
          <span className="h-4 w-px bg-slate-300" />
          <span className="flex items-center gap-1.5">
            <WeatherIcon className="h-4 w-4 text-sky-600" />
            {WEATHER_LABEL[hud.weather]}
          </span>
          <span className="h-4 w-px bg-slate-300" />
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
          <span className="flex items-center gap-1.5" aria-label={'الوقود ' + hud.fuel + '%'}>
            <span className={lowFuel ? 'font-extrabold text-brand-600' : 'font-extrabold text-amber-700'}>⛽</span>
            <span className="w-12 overflow-hidden rounded-full bg-slate-200 sm:w-20">
              <span className={lowFuel ? 'block h-1.5 rounded-full bg-brand-500' : 'block h-1.5 rounded-full bg-amber-500'} style={{ width: hud.fuel + '%' }} />
            </span>
            <span className={lowFuel ? 'text-brand-600' : ''}>{hud.fuel}%</span>
          </span>
          <span className="h-4 w-px bg-slate-300" />
          <span className="flex items-center gap-1.5">
            <Heart className={`h-4 w-4 ${lowHealth ? 'text-brand-500' : 'text-emerald-600'}`} />
            <span className="w-12 overflow-hidden rounded-full bg-slate-200 sm:w-20">
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
