import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { ScreenHeader } from '@/components/screens/ScreenHeader';
import { VEHICLES } from '@/game/config';
import { fetchLeaderboard, type LeaderboardRow } from '@/lib/leaderboard';

interface LeaderboardScreenProps {
  onBack: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rows: LeaderboardRow[] };

const RANK_TONE = ['text-amber-300', 'text-slate-200', 'text-orange-300'];

function vehicleName(id: string): string {
  return VEHICLES.find((vehicle) => vehicle.id === id)?.name ?? id;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((rows) => {
        if (!cancelled) setState({ status: 'ready', rows });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = () => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-white">
      <ScreenHeader title="الترتيب" onBack={onBack} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-8">
        {state.status === 'loading' && <p className="py-16 text-center text-sm text-slate-400">جاري تحميل أحسن الراكبين...</p>}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-slate-300">ما قدرناش نحمّلو الترتيب دابا. عاود جرب بعد شوية.</p>
            <button
              type="button"
              onClick={reload}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-600 active:scale-[0.98]"
            >
              عاود جرب
            </button>
          </div>
        )}

        {state.status === 'ready' && state.rows.length === 0 && (
          <p className="py-16 text-center text-sm text-slate-400">مازال ما فماش نقاط. خلّص وردية وانشر أول نتيجة.</p>
        )}

        {state.status === 'ready' && state.rows.length > 0 && (
          <ol className="flex flex-col gap-2.5 animate-rise-in">
            {state.rows.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center gap-4 rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10"
              >
                <span className={`w-8 text-center text-lg font-bold tabular-nums ${RANK_TONE[index] ?? 'text-slate-400'}`}>
                  {index < 3 ? <Trophy className="mx-auto h-5 w-5" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.name}</p>
                  <p className="text-xs text-slate-400">
                    {vehicleName(row.vehicle)} · {row.deliveries} طلبية موصّلة
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
