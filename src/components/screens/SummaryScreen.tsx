import { useState } from 'react';
import { AlertCircle, Check, Coins, Flag, LoaderCircle, Play, Trophy } from 'lucide-react';
import { VEHICLES } from '@/game/config';
import type { ShiftSummary } from '@/game/types';
import { formatMoney } from '@/lib/money';
import { submitScore } from '@/lib/leaderboard';
import type { Profile } from '@/lib/profile';
import { SHIFT_TASKS } from '@/lib/tasks';

interface SummaryScreenProps {
  summary: ShiftSummary;
  profile: Profile;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onMenu: () => void;
}

type SubmitState = 'idle' | 'saving' | 'saved' | 'error';

const SECONDARY_BUTTON =
  'flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3.5 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]';

export function SummaryScreen({ summary, profile, onPlayAgain, onLeaderboard, onMenu }: SummaryScreenProps) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const displayName = profile.name.trim() || 'الراكب';
  const vehicle = VEHICLES.find((v) => v.id === profile.vehicle)?.name ?? profile.vehicle;

  const handlePost = async () => {
    setSubmitState('saving');
    try {
      await submitScore({
        name: displayName,
        score: summary.score,
        deliveries: summary.deliveries,
        vehicle: profile.vehicle,
      });
      setSubmitState('saved');
    } catch {
      setSubmitState('error');
    }
  };

  const stats = [
    { label: 'النقاط', value: summary.score.toString() },
    { label: 'الأرباح', value: formatMoney(summary.earnings) },
    { label: 'الطلبيات الموصّلة', value: summary.deliveries.toString() },
    { label: 'المتأخرة', value: summary.lateDeliveries.toString() },
  ];

  const postLabel =
    submitState === 'saved' ? 'تم نشر النقاط' : submitState === 'saving' ? 'جاري النشر...' : 'انشر النقاط في الترتيب';

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-950 p-5 text-white">
      <div className="w-full max-w-lg animate-rise-in">
        <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/30">
              <Flag className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-300">خلّصت الوردية</p>
              <h1 className="text-2xl font-bold">برافو يا {displayName}!</h1>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10">
                <dt className="text-xs font-semibold text-slate-400">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm font-bold">مهام الوردية</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {SHIFT_TASKS.map((task) => {
                const done = task.passed(summary);
                return (
                  <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className={done ? 'text-white' : 'text-slate-400'}>{task.title}</span>
                    <span className={`shrink-0 font-bold tabular-nums ${done ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {done ? `+${formatMoney(task.reward)}` : 'لم تكتمل'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <Coins className="h-4 w-4 shrink-0 text-amber-300" />
            <span>
              تزادو {formatMoney(summary.earnings)} لمحفظتك. راكب {vehicle}.
            </span>
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handlePost}
              disabled={submitState === 'saving' || submitState === 'saved'}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-300 disabled:shadow-none"
            >
              {submitState === 'saving' && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {submitState === 'saved' && <Check className="h-4 w-4" />}
              {postLabel}
            </button>
            {submitState === 'error' && (
              <p className="flex items-center gap-2 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                ما قدرناش ننشرو النقاط. شوف الإنترنت وعاود جرب.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onPlayAgain} className={SECONDARY_BUTTON}>
                <Play className="h-4 w-4" />
                وردية جديدة
              </button>
              <button type="button" onClick={onLeaderboard} className={SECONDARY_BUTTON}>
                <Trophy className="h-4 w-4" />
                الترتيب
              </button>
            </div>
            <button type="button" onClick={onMenu} className="py-2 text-sm font-semibold text-slate-400 transition hover:text-white">
              الرجوع للقائمة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
