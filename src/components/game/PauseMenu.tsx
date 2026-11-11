import { useState } from 'react';
import { AlertTriangle, Pause, Play, Flag } from 'lucide-react';
import { GLASS_CARD } from '@/components/game/HudCards';

interface PauseMenuProps {
  onResume: () => void;
  onEndShift: () => void;
}

export function PauseMenu({ onResume, onEndShift }: PauseMenuProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm">
      <div className={`${GLASS_CARD} animate-rise-in w-full max-w-sm p-6 text-center`}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Pause className="h-6 w-6 text-slate-700" />
        </span>
        <h2 className="mt-4 text-2xl font-bold">اللعبة متوقفة مؤقتاً</h2>
        <p className="mt-1 text-sm text-slate-500">العالم مفتوح؛ يمكنك العودة للقيادة في أي وقت.</p>

        {confirmEnd ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="font-extrabold">تأكيد إنهاء الجلسة</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              ستتوقف القيادة الحالية وسيظهر ملخص الجلسة. هل تريد إنهاء اللعب الآن؟
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onEndShift}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700 active:scale-[0.98]"
              >
                <Flag className="h-4 w-4" />
                نعم، أنهِ الجلسة
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100 active:scale-[0.98]"
              >
                لا، أريد مواصلة اللعب
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onResume}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-600 active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              كمّل
            </button>
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <Flag className="h-4 w-4" />
              إنهاء الجلسة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
