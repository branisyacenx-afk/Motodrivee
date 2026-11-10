import { Bike, Cloud, CloudFog, CloudRain, Gauge, Heart, Moon, Pause, Sun, Volume2, VolumeX, Wallet, Wind, ShieldAlert, AlertTriangle } from 'lucide-react';
import { OfferCard, OrderCard, Toasts, TurnCard, GLASS_CARD } from '@/components/game/HudCards';
import { formatMoney } from '@/lib/money';
import type { GameEvent, HudSnapshot } from '@/game/types';

export interface ToastItem extends GameEvent {
  id: number;
}

interface HudProps {
  hud: HudSnapshot;
  toasts: ToastItem[];
  wallet: number;
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

export function Hud({ hud, toasts, wallet, onAccept, onDecline, onRefuel, onRepair, onPause, onDismissToast, muted, onToggleMute }: HudProps) {
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

      <div className={`${GLASS_CARD} pointer-events-auto absolute left-3 top-[17rem] z-30 flex flex-col gap-2 px-3 py-2.5 text-xs font-bold shadow-lg landscape:left-4 landscape:top-[13rem] max-[600px]:left-2 max-[600px]:top-[17rem]`} aria-label="الوقت والطقس ورصيد اللاعب">
        <div className="flex items-center gap-2 whitespace-nowrap">
          {isNight ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
          <span className="tabular-nums">{String(hud.gameHour).padStart(2, '0')}:{String(hud.gameMinute).padStart(2, '0')}</span>
          <span className="h-3 w-px bg-slate-300" />
          <WeatherIcon className="h-4 w-4 text-sky-600" />
          <span>{WEATHER_LABEL[hud.weather]}</span>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200 pt-1 text-emerald-700">
          <Wallet className="h-4 w-4" />
          <span className="tabular-nums">{formatMoney(wallet)}</span>
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

      <div className="pointer-events-auto mx-auto flex w-full max-w-[min(42rem,calc(100vw-1rem))] flex-col gap-2 sm:gap-3 landscape:absolute landscape:right-4 landscape:top-[7rem] landscape:bottom-auto landscape:mx-0 landscape:max-h-[70vh] landscape:w-[min(22rem,32vw)] landscape:max-w-none landscape:flex-col landscape:gap-2 landscape:overflow-y-auto landscape:overscroll-contain max-[600px]:absolute max-[600px]:right-2 max-[600px]:top-[6rem] max-[600px]:bottom-auto max-[600px]:mx-0 max-[600px]:w-[min(22rem,calc(100vw-10rem))] max-[600px]:max-w-none max-[600px]:gap-2 max-[600px]:overflow-visible">
        <Toasts items={toasts.slice(-1)} onDismiss={onDismissToast} />
        {hud.order && <TurnCard turn={hud.turn} order={hud.order} /> }
        <div className="flex min-w-0 flex-col gap-2">
          {hud.order && <OrderCard order={hud.order} /> }
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
      <div className={`${GLASS_CARD} pointer-events-none absolute bottom-[7.25rem] left-1/2 z-20 flex min-h-14 -translate-x-1/2 items-center justify-center gap-3 rounded-2xl px-4 py-3 text-xs font-extrabold tabular-nums shadow-xl sm:gap-6 sm:px-6 landscape:bottom-[6.25rem] max-[600px]:bottom-[7.5rem]`}>
        <span className="flex items-center gap-1.5"><Gauge className="h-5 w-5 text-slate-500" />{hud.speedKmh} كم/س</span>
        <span className="h-4 w-px bg-slate-300" />
        <span className="flex items-center gap-1.5" aria-label={'الوقود ' + hud.fuel + '%'}><span className={lowFuel ? 'font-extrabold text-brand-600' : 'font-extrabold text-amber-700'}>⛽</span><span className="w-10 overflow-hidden rounded-full bg-slate-200"><span className={lowFuel ? 'block h-1.5 rounded-full bg-brand-500' : 'block h-1.5 rounded-full bg-amber-500'} style={{ width: hud.fuel + '%' }} /></span><span>{hud.fuel}%</span></span>
        <span className="h-4 w-px bg-slate-300" />
        <span className="flex items-center gap-1.5"><Heart className={`h-5 w-5 ${lowHealth ? 'text-brand-500' : 'text-emerald-600'}`} /><span className="w-10 overflow-hidden rounded-full bg-slate-200"><span className={`block h-1.5 rounded-full ${lowHealth ? 'bg-brand-500' : 'bg-emerald-500'}`} style={{ width: `${hud.health}%` }} /></span><span>{hud.health}%</span></span>
      </div>
    </div>
  );
}
