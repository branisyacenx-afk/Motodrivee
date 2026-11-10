import { useEffect, useRef } from 'react';
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
  { control: 'left', label: 'يسار', icon: ArrowLeft, tone: 'bg-white text-slate-900', size: 'h-[clamp(76px,18vw,94px)] w-[clamp(76px,18vw,94px)] sm:h-[clamp(84px,12vh,96px)] sm:w-[clamp(84px,12vh,96px)] landscape:h-[84px] landscape:w-[84px]' },
  { control: 'right', label: 'يمين', icon: ArrowRight, tone: 'bg-white text-slate-900', size: 'h-[clamp(76px,18vw,94px)] w-[clamp(76px,18vw,94px)] sm:h-[clamp(84px,12vh,96px)] sm:w-[clamp(84px,12vh,96px)] landscape:h-[84px] landscape:w-[84px]' },
];

const PEDAL_PADS: PadDef[] = [
  { control: 'brake', label: 'فرامل', icon: Square, tone: 'bg-slate-900 text-white', size: 'h-[clamp(76px,18vw,94px)] w-[clamp(76px,18vw,94px)] sm:h-[clamp(84px,12vh,96px)] sm:w-[clamp(84px,12vh,96px)] landscape:h-[84px] landscape:w-[84px]' },
  { control: 'gas', label: 'غاز', icon: ArrowUp, tone: 'bg-brand-500 text-white', size: 'h-[clamp(84px,20vw,102px)] w-[clamp(84px,20vw,102px)] sm:h-[clamp(92px,13vh,108px)] sm:w-[clamp(92px,13vh,108px)] landscape:h-[92px] landscape:w-[92px]' },
];

export function TouchControls({ onControl }: TouchControlsProps) {
  const activePointers = useRef(new Map<TouchControl, Set<number>>());
  const onControlRef = useRef(onControl);

  useEffect(() => {
    onControlRef.current = onControl;
  }, [onControl]);

  const releasePointer = (control: TouchControl, pointerId: number) => {
    const pointers = activePointers.current.get(control);
    if (!pointers?.delete(pointerId)) return;
    if (pointers.size === 0) {
      activePointers.current.delete(control);
      onControlRef.current(control, false);
    }
  };

  useEffect(() => () => {
    for (const control of activePointers.current.keys()) onControlRef.current(control, false);
    activePointers.current.clear();
  }, []);

  const bind = (control: TouchControl) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      let pointers = activePointers.current.get(control);
      if (!pointers) {
        pointers = new Set<number>();
        activePointers.current.set(control, pointers);
      }
      if (pointers.size === 0) onControlRef.current(control, true);
      pointers.add(event.pointerId);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => releasePointer(control, event.pointerId),
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => releasePointer(control, event.pointerId),
    onLostPointerCapture: (event: ReactPointerEvent<HTMLButtonElement>) => releasePointer(control, event.pointerId),
    onContextMenu: (event: ReactMouseEvent) => event.preventDefault(),
  });

  const renderPad = ({ control, label, icon: Icon, tone, size }: PadDef) => (
    <div key={control} className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={label}
        className={`${tone} ${size} flex touch-none select-none items-center justify-center rounded-full shadow-xl ring-1 ring-black/10 transition-transform active:scale-95 active:brightness-90`}
        {...bind(control)}
      >
        <Icon className="h-8 w-8 sm:h-9 sm:w-9 landscape:h-8 landscape:w-8" strokeWidth={2.6} />
      </button>
      <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs font-extrabold text-white backdrop-blur-sm landscape:text-[10px]">{label}</span>
    </div>
  );

  return (
    <div dir="ltr" className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex items-end justify-between px-3 sm:bottom-2 sm:px-8 landscape:bottom-2 landscape:px-8">
      <div className="pointer-events-auto flex gap-2 sm:gap-5">{STEER_PADS.map(renderPad)}</div>
      <div className="pointer-events-auto flex items-end gap-2 sm:gap-5">{PEDAL_PADS.map(renderPad)}</div>
    </div>
  );
}
