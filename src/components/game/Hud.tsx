import { Bike, Cloud, CloudFog, CloudRain, Gauge, Heart, Moon, Pause, Sun, Timer, Volume2, VolumeX, Wind, ShieldAlert, AlertTriangle } from 'lucide-react';
import { EarningsCard, OfferCard, OrderCard, Toasts, TurnCard, GLASS_CARD } from '@/components/game/HudCards';
import type { GameEvent, HudSnapshot } from '@/game/types';

export interface ToastItem extends GameEvent {
  id: number;
}

interface HudProps {
  hud: HudSnapshot;
  toasts: ToastItem[];
  dailyDeliveries: number;
  weeklyDeliveries: number;
  dailyClaimed: boolean;
  weeklyClaimed: boolean;
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

export function Hud({ hud, toasts, dailyDeliveries, weeklyDeliveries, dailyClaimed, weeklyClaimed, onAccept, onDecline, onRefuel, onRepair, onPause, onDismissToast, muted, onToggleMute }: HudProps) {
  const lowHealth = hud.health < 35;
  const criticalHealth = hud.health <= 25;
  const lowFuel = hud.fuel < 25;
  const criticalFuel = hud.fuel <= 15;
  const WeatherIcon = WEATHER_ICON[hud.weather];
  const isNight = hud.gameHour < 6 || hud.gameHour >= 19;
  return (
    <div dir="rtl" className="pointer-events-none absolute inset-0 z-20 flex flex-col gap-2 p-2 sm:gap-3 sm:p-4 landscape:gap-2 landscape:p-3">
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

      <div className={`${GLASS_CARD} pointer-events-auto mx-auto grid w-full max-w-[min(42rem,calc(100vw-1rem))] grid-cols-2 gap-3 px-3 py-2.5 sm:px-4 landscape:absolute landscape:left-1/2 landscape:top-[5.5rem] landscape:z-20 landscape:mt-0 landscape:w-[min(56vw,42rem)] landscape:max-w-none landscape:-translate-x-1/2 landscape:gap-2 landscape:px-3 landscape:py-2 max-[600px]:absolute max-[600px]:left-1/2 max-[600px]:top-[3.75rem] max-[600px]:w-[min(72vw,18rem)] max-[600px]:-translate-x-1/2 max-[600px]:gap-2 max-[600px]:px-2 max-[600px]:py-1.5`} aria-label="تقدم التحديات">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-600">
            <span>تحدي اليوم</span>
            <span className="tabular-nums">{Math.min(dailyDeliveries, 3)}/3</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${Math.min(100, (dailyDeliveries / 3) * 100)}%` }} />
          </div>
          <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{dailyClaimed ? 'مكافأة اليوم استُلمت' : dailyDeliveries >= 3 ? 'اكتمل · استلم 1200 دج' : '3 توصيلات · 1200 دج'}</p>
        </div>
        <div className="min-w-0 border-s border-slate-200 ps-2">
          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-600">
            <span>تحدي الأسبوع</span>
            <span className="tabular-nums">{Math.min(weeklyDeliveries, 15)}/15</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 transition-[width]" style={{ width: `${Math.min(100, (weeklyDeliveries / 15) * 100)}%` }} />
          </div>
          <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{weeklyClaimed ? 'مكافأة الأسبوع استُلمت' : weeklyDeliveries >= 15 ? 'اكتمل · استلم 6000 دج' : '15 توصيلة · 6000 دج'}</p>
        </div>
      </div>

      <div className="pointer-events-auto mx-auto flex w-full max-w-[min(42rem,calc(100vw-1rem))] flex-col gap-2 sm:gap-3 landscape:absolute landscape:right-4 landscape:top-[9rem] landscape:bottom-[8.75rem] landscape:mx-0 landscape:max-h-none landscape:w-[min(19rem,25vw)] landscape:max-w-none landscape:flex-col landscape:gap-2 landscape:overflow-y-auto landscape:overscroll-contain max-[600px]:absolute max-[600px]:right-2 max-[600px]:top-[8.5rem] max-[600px]:bottom-[8rem] max-[600px]:mx-0 max-[600px]:w-[min(12rem,calc(100vw-8.5rem))] max-[600px]:max-w-none max-[600px]:gap-1 max-[600px]:overflow-y-auto max-[600px]:overscroll-contain">
        <Toasts items={toasts.slice(-1)} onDismiss={onDismissToast} />
        <TurnCard turn={hud.turn} order={hud.order} />
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-1 sm:gap-2 landscape:min-w-0 landscape:flex-1 max-[600px]:grid-cols-1">
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
      <div className="mt-auto flex justify-center landscape:absolute landscape:bottom-2 landscape:left-1/2 landscape:z-30 landscape:w-auto landscape:-translate-x-1/2 max-[600px]:absolute max-[600px]:bottom-[5.5rem] max-[600px]:left-1/2 max-[600px]:w-[min(90vw,24rem)] max-[600px]:-translate-x-1/2">
        <div className={`${GLASS_CARD} flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 text-xs font-bold tabular-nums sm:gap-x-5 sm:px-5 sm:py-2.5 sm:text-sm max-[600px]:gap-x-2 max-[600px]:px-2 max-[600px]:py-1.5 max-[600px]:text-[10px]`}>
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
