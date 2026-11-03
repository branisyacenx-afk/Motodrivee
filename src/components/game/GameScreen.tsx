import { useEffect, useMemo, useRef, useState } from 'react';
import { Hud, type ToastItem } from '@/components/game/Hud';
import { Minimap } from '@/components/game/Minimap';
import { PauseMenu } from '@/components/game/PauseMenu';
import { TouchControls } from '@/components/game/TouchControls';
import { createCityLayout } from '@/game/city/layout';
import { getBikeStats, PAINTS } from '@/game/config';
import { createInputController, type TouchControl } from '@/game/input';
import { GameWorld } from '@/game/world';
import type { GameEvent, HudSnapshot, ShiftSummary } from '@/game/types';
import { connectSharedCity, createRiderId } from '@/lib/sharedCity';
import type { Profile } from '@/lib/profile';

interface GameScreenProps {
  profile: Profile;
  onFinish: (summary: ShiftSummary) => void;
}

const TOAST_LIFE_MS = 2600;
const MAX_TOASTS = 3;

export function GameScreen({ profile, onFinish }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const inputRef = useRef<ReturnType<typeof createInputController> | null>(null);
  const onFinishRef = useRef(onFinish);
  const layout = useMemo(() => createCityLayout(), []);
  const [loadout] = useState(() => ({
    stats: getBikeStats(profile.vehicle, profile.upgrades),
    paintHex: PAINTS.find((paint) => paint.id === profile.paint)?.hex ?? PAINTS[0].hex,
    playerName: profile.name,
  }));
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const input = createInputController();
    inputRef.current = input;
    const network = connectSharedCity(createRiderId());
    let nextToastId = 0;
    let world: GameWorld;

    const reportGameError = (message: string) => {
      setGameError(message.slice(0, 220));
    };
    const onWindowError = (event: ErrorEvent) => {
      reportGameError(event.message || 'حدث خطأ أثناء تشغيل محرك اللعبة.');
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportGameError(reason instanceof Error ? reason.message : 'حدث خطأ غير متوقع أثناء تحميل اللعبة.');
    };
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    try {
      world = new GameWorld(
      container,
      {
        layout,
        stats: loadout.stats,
        paintHex: loadout.paintHex,
        playerName: loadout.playerName,
        network,
        readInput: input.read,
      },
      {
        onHud: setHud,
        onEvent: (event: GameEvent) => {
          const id = ++nextToastId;
          setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { ...event, id }]);
          window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), TOAST_LIFE_MS);
        },
        onEnd: (summary) => onFinishRef.current(summary),
      },
      );
      worldRef.current = world;
      world.start();
    } catch (error) {
      reportGameError(error instanceof Error ? error.message : 'تعذر إنشاء عالم اللعبة.');
      network.close();
      input.dispose();
    }

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      worldRef.current?.dispose();
      network.close();
      input.dispose();
      worldRef.current = null;
      inputRef.current = null;
    };
  }, [layout, loadout]);

  useEffect(() => {
    worldRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    worldRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter') worldRef.current?.acceptOffer();
      else if (event.key === 'n' || event.key === 'N') worldRef.current?.declineOffer();
      else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') setPaused((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleTouch = (control: TouchControl, pressed: boolean) => {
    inputRef.current?.setTouch(control, pressed);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-sky-200 select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {gameError && (
        <div className="absolute inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-red-300/30 bg-slate-950/95 p-5 text-center text-white shadow-2xl">
          <h2 className="mb-2 text-lg font-extrabold">تعذر تشغيل اللعبة</h2>
          <p className="mb-3 text-sm text-slate-300">تم رصد خطأ أثناء بدء الوردية. أرسل لنا نص الخطأ التالي حتى نصلح السبب:</p>
          <p dir="ltr" className="max-h-28 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-rose-200">{gameError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-white px-5 py-2 font-bold text-slate-900">إعادة تحميل اللعبة</button>
        </div>
      )}

      {hud && (
        <>
          <Hud
            hud={hud}
            toasts={toasts}
            onAccept={() => worldRef.current?.acceptOffer()}
            onDecline={() => worldRef.current?.declineOffer()}
            onPause={() => setPaused(true)}
            onDismissToast={dismissToast}
            muted={muted}
            onToggleMute={() => setMuted((value) => !value)}
          />
          {!isTouch && (
            <Minimap
              layout={layout}
              state={hud.minimap}
              className="pointer-events-none absolute bottom-20 left-6 z-10 w-44 md:w-56"
            />
          )}
        </>
      )}

      {isTouch && !paused && <TouchControls onControl={handleTouch} />}

      {paused && (
        <PauseMenu onResume={() => setPaused(false)} onEndShift={() => worldRef.current?.finishShift()} />
      )}
    </div>
  );
}
