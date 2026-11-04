import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { Hud, type ToastItem } from '@/components/game/Hud';
import { Minimap } from '@/components/game/Minimap';
import { AlgiersMap } from '@/components/game/AlgiersMap';
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
  onDelivery: (pay: number, onTime: boolean) => void;
}

const TOAST_LIFE_MS = 2600;
const MAX_TOASTS = 3;

export function GameScreen({ profile, onFinish, onDelivery }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const inputRef = useRef<ReturnType<typeof createInputController> | null>(null);
  const onFinishRef = useRef(onFinish);
  const onDeliveryRef = useRef(onDelivery);
  const layout = useMemo(() => createCityLayout(), []);
  const [loadout] = useState(() => ({
    stats: getBikeStats(profile.vehicle, profile.upgrades),
    paintHex: PAINTS.find((paint) => paint.id === profile.paint)?.hex ?? PAINTS[0].hex,
    vehicleId: profile.vehicle,
    playerName: profile.name,
  }));
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    onFinishRef.current = onFinish;
    onDeliveryRef.current = onDelivery;
  }, [onFinish, onDelivery]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const input = createInputController();
    inputRef.current = input;
    const network = connectSharedCity(createRiderId());
    let nextToastId = 0;
    let world: GameWorld;

    const reportGameError = (message: string) => {
      setGameError(message.slice(0, 1800));
    };
    const onWindowError = (event: ErrorEvent) => {
      reportGameError(event.message || 'حدث خطأ أثناء تشغيل محرك اللعبة.');
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportGameError(reason instanceof Error ? `${reason.message}\n${reason.stack ?? 'Stack trace unavailable'}` : 'حدث خطأ غير متوقع أثناء تحميل اللعبة.');
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
          vehicleId: loadout.vehicleId,
          playerName: loadout.playerName,
          network,
          readInput: input.read,
        },
        {
          onHud: setHud,
          onDelivery: (pay, onTime) => onDeliveryRef.current(pay, onTime),
          onEvent: (event: GameEvent) => {
            const id = ++nextToastId;
            setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { ...event, id }]);
            window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), TOAST_LIFE_MS);
          },
          onEnd: (summary) => onFinishRef.current(summary),
          onError: reportGameError,
        },
      );
      worldRef.current = world;
      world.start();
    } catch (error) {
      reportGameError(error instanceof Error ? `${error.message}\n${error.stack ?? 'Stack trace unavailable'}` : 'تعذر إنشاء عالم اللعبة.');
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
    worldRef.current?.setPaused(paused || mapOpen);
  }, [paused, mapOpen]);

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
          <p dir="ltr" className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 text-left text-[10px] text-rose-200">{gameError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-white px-5 py-2 font-bold text-slate-900">إعادة تحميل اللعبة</button>
        </div>
      )}

      {hud && !paused && isTouch && (
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          aria-label="فتح خريطة المدينة"
          className="pointer-events-auto absolute left-4 top-20 z-20 flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-white/80 bg-slate-950/90 text-[10px] font-extrabold text-white shadow-xl backdrop-blur-md transition active:scale-95"
        >
          <MapIcon className="h-6 w-6" />
          الخريطة
        </button>
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
          {!isTouch && !mapOpen && (
            <Minimap
              layout={layout}
              state={hud.minimap}
              onOpen={() => setMapOpen(true)}
              className="absolute bottom-20 left-6 z-20 w-44 md:w-52"
            />
          )}
        </>
      )}

      {mapOpen && hud && !paused && (
        <AlgiersMap layout={layout} state={hud.minimap} onClose={() => setMapOpen(false)} />
      )}

      {isTouch && !paused && !mapOpen && <TouchControls onControl={handleTouch} />}

      {paused && (
        <PauseMenu onResume={() => setPaused(false)} onEndShift={() => worldRef.current?.finishShift()} />
      )}
    </div>
  );
}
