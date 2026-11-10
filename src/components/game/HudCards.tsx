import { ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw, X } from 'lucide-react';
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
  if (!turn || !order) return null;
  const meta = TURN_META[turn.direction];
  const Icon = meta.icon;
  return (
    <div className={`${GLASS_CARD} pointer-events-none flex w-fit min-w-[5.5rem] items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs shadow-lg`} aria-label="اتجاه الطلب">
      <Icon className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
      <span className="font-bold tabular-nums">{formatDistance(turn.distance)}</span>
      <span className="text-slate-500">·</span>
      <span className={`font-extrabold tabular-nums ${order.timeLeft <= 15 ? 'text-red-600' : 'text-slate-800'}`}>{order.timeLeft}ث</span>
    </div>
  );
}

interface OrderCardProps {
  order: OrderHud | null;
}

export function OrderCard({ order }: OrderCardProps) {
  if (!order) return null;
  const late = order.timeLeft === 0;
  const lowTime = order.timeLeft > 0 && order.timeLeft <= 15;
  const ratio = Math.max(0, Math.min(1, order.timeLeft / Math.max(1, order.timeLimit)));
  return (
    <div className={`${GLASS_CARD} pointer-events-none w-fit min-w-[6.5rem] max-w-[9rem] rounded-xl px-2.5 py-1.5 shadow-lg`} aria-label="الوقت المتبقي للطلب">
      <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold tabular-nums">
        <span className="text-slate-500">{formatDistance(order.distance)}</span>
        <span className={late ? 'text-red-600' : lowTime ? 'text-amber-600' : 'text-emerald-700'}>{late ? '0ث' : `${order.timeLeft}ث`}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-[width] ${late ? 'bg-red-500' : lowTime ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      {order.progress > 0 && <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-sky-600" style={{ width: `${Math.round(order.progress * 100)}%` }} /></div>}
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
            من {offer.pickupDistrict} إلى {offer.dropoffDistrict} · {formatDistance(offer.pickupDistance)} للمطعم · {formatDistance(offer.distance)} للزبون
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
