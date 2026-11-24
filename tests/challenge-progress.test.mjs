import assert from 'node:assert/strict';
import test from 'node:test';
import { buildChallengeProgress } from '../src/lib/challengeProgress.ts';

const targets = {
  today: '2026-11-24',
  week: '2026-11-23',
  dailyGoal: 3,
  dailyReward: 1200,
  weeklyGoal: 15,
  weeklyReward: 6000,
};

function profile(overrides = {}) {
  return {
    dailyDeliveries: 2,
    dailyChallengeDate: targets.today,
    dailyChallengeClaimed: false,
    weeklyDeliveries: 7,
    weeklyChallengeWeek: targets.week,
    weeklyChallengeClaimed: false,
    ...overrides,
  };
}

test('shows the live daily and weekly counts with their configured rewards', () => {
  const result = buildChallengeProgress(profile(), targets);
  assert.deepEqual(result.daily, {
    progress: 2, goal: 3, reward: 1200, claimed: false, claimReady: false,
  });
  assert.deepEqual(result.weekly, {
    progress: 7, goal: 15, reward: 6000, claimed: false, claimReady: false,
  });
});

test('marks a completed challenge as ready to claim without claiming it automatically', () => {
  const result = buildChallengeProgress(profile({ dailyDeliveries: 5 }), targets);
  assert.equal(result.daily.progress, 3);
  assert.equal(result.daily.claimReady, true);
  assert.equal(result.daily.claimed, false);
});

test('keeps an already claimed challenge complete but not claimable again', () => {
  const result = buildChallengeProgress(profile({
    dailyDeliveries: 3,
    dailyChallengeClaimed: true,
    weeklyDeliveries: 15,
    weeklyChallengeClaimed: true,
  }), targets);
  assert.equal(result.daily.claimed, true);
  assert.equal(result.daily.claimReady, false);
  assert.equal(result.weekly.claimed, true);
  assert.equal(result.weekly.claimReady, false);
});

test('resets progress and claim state when a calendar period changes', () => {
  const result = buildChallengeProgress(profile({
    dailyDeliveries: 3,
    dailyChallengeDate: '2026-11-23',
    dailyChallengeClaimed: true,
    weeklyDeliveries: 15,
    weeklyChallengeWeek: '2026-11-16',
    weeklyChallengeClaimed: true,
  }), targets);
  assert.equal(result.daily.progress, 0);
  assert.equal(result.daily.claimed, false);
  assert.equal(result.daily.claimReady, false);
  assert.equal(result.weekly.progress, 0);
  assert.equal(result.weekly.claimed, false);
});

test('clamps malformed counters, goals, and rewards to safe display values', () => {
  const result = buildChallengeProgress(profile({
    dailyDeliveries: Number.POSITIVE_INFINITY,
    weeklyDeliveries: -4,
  }), {
    ...targets,
    dailyGoal: Number.NaN,
    dailyReward: Number.POSITIVE_INFINITY,
    weeklyGoal: 0,
    weeklyReward: -100,
  });
  assert.equal(result.daily.progress, 0);
  assert.equal(result.daily.goal, 1);
  assert.equal(result.daily.reward, 0);
  assert.equal(result.weekly.progress, 0);
  assert.equal(result.weekly.goal, 1);
  assert.equal(result.weekly.reward, 0);
});
