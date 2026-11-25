import { useEffect, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
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
  { control: 'left', label: 'يسار', icon: ArrowLeft, tone: 'bg-white text-slate-900', size: 'h-[clamp(76px,18vw,94px)] w-[clamp(76px,18vw,94px)] sm:h-[clamp(84px,12vh,96px)] sm:w-[clamp(84px,12vh,96px)] landscape:h-[clamp(5.5rem,24vh,7rem)] landscape:w-[clamp(5.5rem,24vh,7rem)]' },
  { control: 'right', label: 'يمين', icon: ArrowRight, tone: 'bg-white text-slate-900', size: 'h-[clamp(76px,18vw,94px)] w-[clamp(76px,18vw,94px)] sm:h-[clamp(84px,12vh,96px)] sm:w-[clamp(84px,12vh,96px)] landscape:h-[clamp(5.5rem,24vh,7rem)] landscape:w-[clamp(5.5rem,24vh,7rem)]' },
];

const PEDAL_PADS: PadDef[] = [
  { control: 'brake', label: 'فرامل', icon: Square, tone: 'bg-slate-900 text-white', size: 'h-[clamp(76px,18vw,94px)] w-[clamp(76px,18vw,94px)] sm:h-[clamp(84px,12vh,96px)] sm:w-[clamp(84px,12vh,96px)] landscape:h-[clamp(5.5rem,24vh,7rem)] landscape:w-[clamp(5.5rem,24vh,7rem)]' },
  { control: 'gas', label: 'غاز', icon: ArrowUp, tone: 'bg-brand-500 text-white', size: 'h-[clamp(84px,20vw,102px)] w-[clamp(84px,20vw,102px)] sm:h-[clamp(92px,13vh,108px)] sm:w-[clamp(92px,13vh,108px)] landscape:h-[clamp(5.75rem,27vh,7.5rem)] landscape:w-[clamp(5.75rem,27vh,7.5rem)]' },
];

export function TouchControls({ onControl }: TouchControlsProps) {
  const activeSources = useRef(new Map<TouchControl, Set<string>>());
  const onControlRef = useRef(onControl);

  useEffect(() => {
    onControlRef.current = onControl;
  }, [onControl]);

  const pressSource = (control: TouchControl, source: string) => {
    let sources = activeSources.current.get(control);
    if (!sources) {
      sources = new Set<string>();
      activeSources.current.set(control, sources);
    }
    if (sources.has(source)) return;
    const wasInactive = sources.size === 0;
    sources.add(source);
    if (wasInactive) onControlRef.current(control, true);
  };

  const releaseSource = (control: TouchControl, source: string) => {
    const sources = activeSources.current.get(control);
    if (!sources?.delete(source)) return;
    if (sources.size === 0) {
      activeSources.current.delete(control);
      onControlRef.current(control, false);
    }
  };

  const releaseKeyboardSources = (control: TouchControl) => {
    const sources = activeSources.current.get(control);
    if (!sources) return;
    for (const source of Array.from(sources)) {
      if (source.startsWith('keyboard:')) releaseSource(control, source);
    }
  };

  useEffect(() => {
    // Mobile browsers may suspend a tab without delivering pointerup.
    const releaseAllSources = () => {
      for (const control of activeSources.current.keys()) {
        onControlRef.current(control, false);
      }
      activeSources.current.clear();
    };

    const releaseWhenHidden = () => {
      if (document.visibilityState === 'hidden') releaseAllSources();
    };

    window.addEventListener('blur', releaseAllSources);
    window.addEventListener('pagehide', releaseAllSources);
    document.addEventListener('visibilitychange', releaseWhenHidden);

    return () => {
      window.removeEventListener('blur', releaseAllSources);
      window.removeEventListener('pagehide', releaseAllSources);
      document.removeEventListener('visibilitychange', releaseWhenHidden);
      releaseAllSources();
    };
  }, []);

  const bind = (control: TouchControl) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pressSource(control, 'pointer:' + event.pointerId);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => releaseSource(control, 'pointer:' + event.pointerId),
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => releaseSource(control, 'pointer:' + event.pointerId),
    onLostPointerCapture: (event: ReactPointerEvent<HTMLButtonElement>) => releaseSource(control, 'pointer:' + event.pointerId),
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      if (event.repeat) return;
      pressSource(control, 'keyboard:' + event.code);
    },
    onKeyUp: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      releaseSource(control, 'keyboard:' + event.code);
    },
    onBlur: () => releaseKeyboardSources(control),
    onContextMenu: (event: ReactMouseEvent) => event.preventDefault(),
  });

  const renderPad = ({ control, label, icon: Icon, tone, size }: PadDef) => (
    <div key={control} className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={label}
        aria-keyshortcuts="Space Enter"
        className={[tone, size, 'flex touch-none select-none items-center justify-center rounded-full shadow-xl ring-1 ring-black/10 transition-transform active:scale-95 active:brightness-90'].join(' ')}
        {...bind(control)}
      >
        <Icon className="h-9 w-9 sm:h-10 sm:w-10 landscape:h-10 landscape:w-10" strokeWidth={2.6} />
      </button>
      <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs font-extrabold text-white backdrop-blur-sm landscape:text-xs">{label}</span>
    </div>
  );

  return (
    <div dir="ltr" className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex items-end justify-between px-3 sm:bottom-2 sm:px-8 landscape:bottom-2 landscape:px-[max(1rem,3vw)]">
      <div className="pointer-events-auto flex gap-2 sm:gap-5">{STEER_PADS.map(renderPad)}</div>
      <div className="pointer-events-auto flex items-end gap-2 sm:gap-5">{PEDAL_PADS.map(renderPad)}</div>
    </div>
  );
}
