import type { ShiftSummary } from '@/game/types';

export interface ShiftTask {
  id: string;
  title: string;
  reward: number;
  target: number;
  progress: (summary: ShiftSummary) => number;
  passed: (summary: ShiftSummary) => boolean;
}

export const SHIFT_TASKS: readonly ShiftTask[] = [
  {
    id: 'three-orders',
    title: 'وصّل 3 طلبيات في وردية وحدة',
    reward: 1500,
    target: 3,
    progress: (summary) => summary.deliveries,
    passed: (summary) => summary.deliveries >= 3,
  },
  {
    id: 'shift-score-1800',
    title: 'اجمع 1800 نقطة في وردية وحدة',
    reward: 2500,
    target: 1800,
    progress: (summary) => summary.score,
    // Shift score is awarded per completed delivery and capped by its remaining time.
    // The result screen shows the achieved score against this target.
    passed: (summary) => summary.score >= 1800,
  },
  {
    id: 'on-time',
    title: 'وصّل 3 طلبيات بلا تأخير',
    reward: 2000,
    target: 3,
    progress: (summary) => Math.max(0, summary.deliveries - summary.lateDeliveries),
    passed: (summary) => summary.deliveries >= 3 && summary.lateDeliveries === 0,
  },
];

export function completedTasks(summary: ShiftSummary): ShiftTask[] {
  return SHIFT_TASKS.filter((task) => task.passed(summary));
}
