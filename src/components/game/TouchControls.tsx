import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Square } from 'lucide-react';
import type { TouchControl } from '@/game/input';

interface TouchControlsProps {
  onControl: (control: TouchControl, pressed: boolean) => void;
}

interface PadDef {
  control: TouchControl;
  label: string;
  icon: typeof ArrowLeft;
  tone: string;
  size: string;
}

const STEER_PADS: PadDef[] = [
  { control: 'left', label: 'يسار', icon: ArrowLeft, tone: 'bg-white text-slate-900', size: 'h-[68px] w-[68px]' },
  { control: 'right', label: 'يمين', icon: ArrowRight, tone: 'bg-white text-slate-900', size: 'h-[68px] w-[68px]' },
];

const PEDAL_PADS: PadDef[] = [
  { control: 'brake', label: 'فرامل', icon: Square, tone: 'bg-slate-900 text-white', size: 'h-[68px] w-[68px]' },
  { control: 'gas', label: 'غاز', icon: ArrowUp, tone: 'bg-brand-500 text-white', size: 'h-[80px] w-[80px]' },
];

export function TouchControls({ onControl }: TouchControlsProps) {
  const bind = (control: TouchControl) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      onControl(control, true);
    },
    onPointerUp: () => onControl(control, false),
    onPointerCancel: () => onControl(control, false),
    onLostPointerCapture: () => onControl(control, false),
    onContextMenu: (event: ReactMouseEvent) => event.preventDefault(),
  });

  const renderPad = ({ control, label, icon: Icon, tone, size }: PadDef) => (
    <div key={control} className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        className={`${tone} ${size} flex touch-none select-none items-center justify-center rounded-full shadow-xl ring-1 ring-black/10 transition-transform active:scale-95 active:brightness-90`}
        {...bind(control)}
      >
        <Icon className="h-7 w-7" strokeWidth={2.6} />
      </button>
      <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">{label}</span>
    </div>
  );

  return (
    <div dir="ltr" className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex items-end justify-between px-4 sm:px-8">
      <div className="pointer-events-auto flex gap-3">{STEER_PADS.map(renderPad)}</div>
      <div className="pointer-events-auto flex items-end gap-3">{PEDAL_PADS.map(renderPad)}</div>
    </div>
  );
}
