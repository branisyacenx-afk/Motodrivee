export interface ChallengeProgressSource {
  dailyDeliveries: number;
  dailyChallengeDate: string;
  dailyChallengeClaimed: boolean;
  weeklyDeliveries: number;
  weeklyChallengeWeek: string;
  weeklyChallengeClaimed: boolean;
}

export interface ChallengeProgressItem {
  progress: number;
  goal: number;
  reward: number;
  claimed: boolean;
  claimReady: boolean;
}

export interface ChallengeProgressSnapshot {
  daily: ChallengeProgressItem;
  weekly: ChallengeProgressItem;
}

export interface ChallengePeriodTargets {
  today: string;
  week: string;
  dailyGoal: number;
  dailyReward: number;
  weeklyGoal: number;
  weeklyReward: number;
}

function safeGoal(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : 1;
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function safeReward(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function createProgress(
  isCurrentPeriod: boolean,
  count: number,
  claimed: boolean,
  goalValue: number,
  rewardValue: number,
): ChallengeProgressItem {
  const goal = safeGoal(goalValue);
  const progress = isCurrentPeriod ? Math.min(goal, safeCount(count)) : 0;
  const hasClaimed = isCurrentPeriod && claimed === true;
  return {
    progress,
    goal,
    reward: safeReward(rewardValue),
    claimed: hasClaimed,
    claimReady: progress >= goal && !hasClaimed,
  };
}

/** Builds display-safe daily and weekly progress from the player's current profile. */
export function buildChallengeProgress(
  source: ChallengeProgressSource,
  targets: ChallengePeriodTargets,
): ChallengeProgressSnapshot {
  return {
    daily: createProgress(
      source.dailyChallengeDate === targets.today,
      source.dailyDeliveries,
      source.dailyChallengeClaimed,
      targets.dailyGoal,
      targets.dailyReward,
    ),
    weekly: createProgress(
      source.weeklyChallengeWeek === targets.week,
      source.weeklyDeliveries,
      source.weeklyChallengeClaimed,
      targets.weeklyGoal,
      targets.weeklyReward,
    ),
  };
}
