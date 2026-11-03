import { ArrowLeft, ArrowRight, ArrowUp, Check, MapPin, RotateCcw, Timer, X } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { GameEvent, HudSnapshot, OfferHud, OrderHud } from '@/game/types';

export const GLASS_CARD = 'rounded-2xl bg-white/95 text-slate-900 shadow-xl ring-1 ring-black/5 backdrop-blur-md';

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} كم` : `${meters} م`;
}

const TURN_META = {
  left: { label: 'انعطف يسار', icon: ArrowLeft },
  right: { label: 'انعطف يمين', icon: ArrowRight },
  straight: { label: 'واصل مستقيم', icon: ArrowUp },
  uturn: { label: 'دور للوراء', icon: RotateCcw },
} as const;

interface TurnCardProps {
  turn: HudSnapshot['turn'];
  order: OrderHud | null;
}

export function TurnCard({ turn, order }: TurnCardProps) {
  if (!turn) {
    return (
      <div className={`${GLASS_CARD} flex items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2.5`}>
        <span className="flex h-7 w-7 shrink-0 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">تجوال حر</p>
          <p className="text-xs text-slate-500">استكشف المدينة وتسنى الطلبيات</p>
        </div>
      </div>
    );
  }
  const meta = TURN_META[turn.direction];
  const Icon = meta.icon;
  const destination = turn.target === 'pickup'
    ? order ? `مطعم ${order.restaurant} · ${order.pickupDistrict}` : 'المطعم'
    : order ? `الزبون · ${order.dropoffDistrict}` : 'الزبون';
  return (
    <div className={`${GLASS_CARD} flex items-center gap-2 px-2.5 py-1.5 sm:gap-3 sm:px-3 sm:py-2`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-md">
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{meta.label}</p>
        <p className="truncate text-xs text-slate-500">
          بعد {formatDistance(turn.distance)} للوصول لـ{destination}
        </p>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: OrderHud | null;
}

export function OrderCard({ order }: OrderCardProps) {
  if (!order) {
    return (
      <div className={`${GLASS_CARD} px-4 py-2.5`}>
        <p className="text-[11px] font-semibold text-slate-500">ما عندك حتى طلبية</p>
        <p className="text-sm font-bold">استنى الطلبية الجاية</p>
      </div>
    );
  }
  const lateRed = order.timeLeft === 0;
  const lowTime = order.timeLeft > 0 && order.timeLeft <= 15;
  const timeRatio = Math.max(0, Math.min(1, order.timeLeft / Math.max(1, order.timeLimit)));
  return (
    <div className={`${GLASS_CARD} min-w-0 px-2 py-1 sm:px-2.5 sm:py-1.5`}>
      <p className="text-[11px] font-semibold text-slate-500">
        {order.phase === 'pickup' ? 'امشي خذ الطلبية' : 'وصّل للزبون'}
      </p>
      <p className="truncate text-sm font-bold leading-tight">{order.restaurant}</p>
      <p className="truncate text-[11px] text-slate-500">
        من {order.pickupDistrict} إلى {order.dropoffDistrict}
      </p>
      <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-700">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-brand-500" />
          {formatDistance(order.distance)}
        </span>
        <span className={`flex items-center gap-1 ${lateRed ? 'text-brand-600' : lowTime ? 'text-amber-600' : ''}`}>
          <Timer className="h-3.5 w-3.5" />
          {lateRed ? 'متأخر' : `${order.timeLeft} ث`}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200" aria-label={`الوقت المتبقي ${order.timeLeft} ثانية`}>
        <div className={`h-full rounded-full transition-[width] duration-300 ${lateRed ? 'bg-brand-500' : lowTime ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${timeRatio * 100}%` }} />
      </div>
      <div className="mt-1 rounded-md bg-slate-100 px-1.5 py-1">
        <p className="text-[11px] font-semibold text-slate-600">
          {order.progress > 0
            ? order.phase === 'pickup' ? 'راك تستلم الطلبية… خليك ثابت' : 'راك تسلّم الطلبية… خليك ثابت'
            : order.phase === 'pickup' ? 'قرّب للمطعم واحبس الدراجة للاستلام' : 'قرّب للزبون واحبس الدراجة للتسليم'}
        </p>
        {order.progress > 0 && (
          <div
            className="mt-1 h-1 overflow-hidden rounded-full bg-slate-300"
            role="progressbar"
            aria-label={order.phase === 'pickup' ? 'تقدم استلام الطلبية' : 'تقدم تسليم الطلبية'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(order.progress * 100)}
          >
            <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-100" style={{ width: `${Math.round(order.progress * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

interface OfferCardProps {
  offer: OfferHud;
  onAccept: () => void;
  onDecline: () => void;
}

export function OfferCard({ offer, onAccept, onDecline }: OfferCardProps) {
  const urgency = offer.expiresIn <= 5;
  const expiryRatio = Math.max(0, Math.min(1, offer.expiresIn / 20));
  return (
    <div className={`${GLASS_CARD} w-full border-s-4 border-brand-500 p-2 sm:p-2.5 animate-toast-in`} role="dialog" aria-label="طلبية جديدة">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-brand-600">طلبية جديدة</p>
          <p className="truncate text-base font-extrabold leading-tight">{offer.restaurant}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            من {offer.pickupDistrict} إلى {offer.dropoffDistrict} · {formatDistance(offer.distance)}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-base font-bold tabular-nums text-emerald-700">{formatMoney(offer.pay)}</p>
          <p className="text-[11px] font-semibold text-slate-500">{offer.expiresIn} ث</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-label={`تنتهي الطلبية بعد ${offer.expiresIn} ثانية`}>
        <div className={`h-full rounded-full transition-[width] duration-200 ${urgency ? 'bg-brand-500' : 'bg-amber-400'}`} style={{ width: `${expiryRatio * 100}%` }} />
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2">
        <button
          type="button"
          onClick={onDecline}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 sm:py-2 sm:text-sm transition hover:bg-slate-100 active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
          تخطي
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white shadow-md sm:py-2 sm:text-sm transition hover:bg-brand-600 active:scale-[0.98]"
        >
          <Check className="h-4 w-4" />
          قبول
        </button>
      </div>
    </div>
  );
}

interface EarningsCardProps {
  earnings: number;
  score: number;
  deliveries: number;
}

export function EarningsCard({ earnings, score, deliveries }: EarningsCardProps) {
  return (
    <div className={`${GLASS_CARD} min-w-0 px-2.5 py-1.5 text-end sm:px-3.5 sm:py-2.5`}>
      <p className="text-[11px] font-semibold text-slate-500">مداخيل الوردية</p>
      <p className="text-base font-bold tabular-nums leading-tight sm:text-lg">{formatMoney(earnings)}</p>
      <p className="text-[11px] text-slate-500">
        {score} نقطة · {deliveries} توصيلة
      </p>
    </div>
  );
}

interface ToastsProps {
  items: (GameEvent & { id: number })[];
  onDismiss: (id: number) => void;
}

const TOAST_TONE: Record<GameEvent['kind'], string> = {
  good: 'bg-emerald-600 text-white',
  bad: 'bg-brand-600 text-white',
  info: 'bg-slate-900 text-white',
};

export function Toasts({ items, onDismiss }: ToastsProps) {
  return (
    <div className="pointer-events-none flex w-full max-w-sm flex-col items-stretch gap-2" role="status" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          className={`${TOAST_TONE[item.kind]} pointer-events-auto flex animate-toast-in items-center gap-2 rounded-lg py-1.5 ps-3 pe-1.5 text-xs font-bold shadow-xl ring-1 ring-black/10`}
        >
          <span className="flex-1">{item.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            aria-label="إغلاق الإشعار"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/35 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
