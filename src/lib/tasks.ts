import type { ShiftSummary } from '@/game/types';

export interface ShiftTask {
  id: string;
  title: string;
  reward: number;
  passed: (summary: ShiftSummary) => boolean;
}

export const SHIFT_TASKS: readonly ShiftTask[] = [
  {
    id: 'three-orders',
    title: 'وصّل 3 طلبيات في وردية وحدة',
    reward: 1500,
    passed: (summary) => summary.deliveries >= 3,
  },
  {
    id: 'five-thousand',
    title: 'اجمع 5000 نقطة',
    reward: 2500,
    passed: (summary) => summary.score >= 5000,
  },
  {
    id: 'on-time',
    title: 'وصّل 3 طلبيات بلا تأخير',
    reward: 2000,
    passed: (summary) => summary.deliveries >= 3 && summary.lateDeliveries === 0,
  },
];

export function completedTasks(summary: ShiftSummary): ShiftTask[] {
  return SHIFT_TASKS.filter((task) => task.passed(summary));
}
