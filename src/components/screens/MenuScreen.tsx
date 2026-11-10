import { ChevronLeft, Coins, Flag, Gift, Store, Trophy, Target, CheckCircle2, CalendarDays } from 'lucide-react';
import { careerRank, dailyRewardPreview, dailyChallengeFor, weeklyChallengeFor, levelFor, levelProgress, todayKey, weekKey, type Profile } from '@/lib/profile';
import { formatMoney } from '@/lib/money';
import { VEHICLES } from '@/game/config';

interface MenuScreenProps {
  profile: Profile;
  onStart: () => void;
  onGarage: () => void;
  onLeaderboard: () => void;
  onClaimDaily: () => void;
  onClaimChallenge: () => void;
  onClaimWeekly: () => void;
}

const HERO_IMAGE = 'https://images.pexels.com/photos/16750771/pexels-photo-16750771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export function MenuScreen({ profile, onStart, onGarage, onLeaderboard, onClaimDaily, onClaimChallenge, onClaimWeekly }: MenuScreenProps) {
  const today = todayKey();
  const week = weekKey();
  const dailyChallenge = dailyChallengeFor(today);
  const weeklyChallenge = weeklyChallengeFor(week);
  const weeklyDeliveries = profile.weeklyChallengeWeek === week ? profile.weeklyDeliveries : 0;
  const weeklyClaimed = profile.weeklyChallengeWeek === week && profile.weeklyChallengeClaimed;
  const weeklyComplete = weeklyDeliveries >= weeklyChallenge.goal;
  const dailyClaimable = profile.lastDailyClaim !== today;
  const dailyReward = dailyRewardPreview(profile, today);
  const dailyDeliveries = profile.dailyChallengeDate === today ? profile.dailyDeliveries : 0;
  const challengeClaimed = profile.dailyChallengeDate === today && profile.dailyChallengeClaimed;
  const challengeComplete = dailyDeliveries >= dailyChallenge.goal;
  const level = levelFor(profile.xp);
  const progress = levelProgress(profile.xp);
  const rank = careerRank(level);

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-slate-900 text-white">
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/30" />
      <header className="relative flex items-center justify-between px-5 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/30"><Flag className="h-5 w-5 text-white" /></span>
          <span className="text-lg font-bold">سويفت <span className="text-brand-400">دروب</span></span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-md ring-1 ring-white/15">
          <Coins className="h-4 w-4 text-amber-300" /><span className="tabular-nums">{formatMoney(profile.wallet)}</span>
        </div>
      </header>
      <main className="relative flex flex-1 flex-col justify-end px-5 pb-10 sm:px-10 sm:pb-14">
        <div className="max-w-xl animate-rise-in">
          <p className="text-sm font-bold text-brand-300">تحدي توصيل الطلبيات في المدينة</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.2] sm:text-6xl">وصّل بسرعة.<br />سابق الوقت.</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">قبل الطلبيات، عدّي بين الزحام، ووصّل كل أكل في وقتو. كل ما تكون أسرع تربح أكثر، والتأخير يكلفك.</p>
        </div>
        <section aria-label="تقدم المسيرة" className="mt-6 max-w-xl rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-slate-300">المسيرة المهنية · المستوى {level}</p><p className="mt-1 text-lg font-extrabold">{rank}</p></div>
            <div className="text-left"><p className="text-sm font-bold tabular-nums">{profile.xp} XP</p><p className="text-xs text-slate-300">{500 - (profile.xp % 500)} XP للمستوى التالي</p></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${progress}%` }} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200 sm:grid-cols-3">
            <span>توصيلات: <b className="text-white">{profile.totalDeliveries}</b></span><span>إجمالي الأرباح: <b className="text-white">{formatMoney(profile.totalEarned)}</b></span><span>الدراجات المملوكة: <b className="text-white">{profile.owned.length}/{VEHICLES.length}</b></span>
          </div>
        </section>
        <section aria-label="تحدي اليوم" className="mt-4 max-w-xl rounded-2xl bg-slate-950/80 p-4 ring-1 ring-amber-300/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Target className="h-5 w-5 text-amber-300" /><div><p className="text-sm font-extrabold">تحدي اليوم</p><p className="text-xs text-slate-300">أكمل {dailyChallenge.goal} توصيلات قبل نهاية اليوم</p></div></div>
            <span className="text-sm font-extrabold text-amber-200">+{formatMoney(dailyChallenge.reward)}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.min(100, dailyDeliveries / dailyChallenge.goal * 100)}%` }} /></div>
            <span className="text-xs font-bold tabular-nums">{Math.min(dailyDeliveries, dailyChallenge.goal)}/{dailyChallenge.goal}</span>
          </div>
          {challengeComplete && !challengeClaimed && <button type="button" onClick={onClaimChallenge} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-slate-950"><CheckCircle2 className="h-4 w-4" />استلم مكافأة التحدي</button>}
          {challengeClaimed && <p className="mt-3 text-center text-xs font-bold text-emerald-300">اكتمل التحدي واستلمت المكافأة</p>}
        </section>
        <section aria-label="التحدي الأسبوعي" className="mt-3 max-w-xl rounded-2xl bg-slate-950/80 p-4 ring-1 ring-sky-300/25">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-300" /><div><p className="text-sm font-extrabold">تحدي الأسبوع</p><p className="text-xs text-slate-300">أكمل {weeklyChallenge.goal} توصيلة من الاثنين إلى الأحد</p></div></div><span className="text-sm font-extrabold text-sky-200">{`+${formatMoney(weeklyChallenge.reward)}`}</span></div>
          <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300" style={{ width: `${Math.min(100, weeklyDeliveries / weeklyChallenge.goal * 100)}%` }} /></div><span className="text-xs font-bold tabular-nums">{Math.min(weeklyDeliveries, weeklyChallenge.goal)}/{weeklyChallenge.goal}</span></div>
          {weeklyComplete && !weeklyClaimed && <button type="button" onClick={onClaimWeekly} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-extrabold text-slate-950"><CheckCircle2 className="h-4 w-4" />استلم مكافأة الأسبوع</button>}
          {weeklyClaimed && <p className="mt-3 text-center text-xs font-bold text-emerald-300">اكتمل التحدي واستلمت المكافأة</p>}
        </section>
        {dailyClaimable && <button type="button" onClick={onClaimDaily} className="mt-4 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-400/30"><Gift className="h-4 w-4" />استلم مكافأتك اليومية: {formatMoney(dailyReward)}</button>}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={onStart} className="group flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-7 py-4 text-base font-bold text-white shadow-xl shadow-brand-500/30 transition hover:bg-brand-600 active:scale-[0.98]">ابدأ الوردية<ChevronLeft className="h-5 w-5 transition group-hover:-translate-x-0.5" /></button>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <button type="button" onClick={onGarage} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]"><Store className="h-4 w-4" />الكراج</button>
            <button type="button" onClick={onLeaderboard} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]"><Trophy className="h-4 w-4" />الترتيب</button>
          </div>
        </div>
        <dl className="mt-6 grid max-w-md grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md"><dt className="text-slate-300">أحسن نقاط</dt><dd className="mt-1 text-xl font-bold tabular-nums">{profile.bestScore}</dd></div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md"><dt className="text-slate-300">سلسلة يومية</dt><dd className="mt-1 text-xl font-bold tabular-nums">{profile.dailyStreak} يوم</dd></div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md"><dt className="text-slate-300">الراكب</dt><dd className="mt-1 truncate text-xl font-bold">{profile.name}</dd></div>
        </dl>
      </main>
    </div>
  );
}
