import assert from 'node:assert/strict';
import test from 'node:test';
import { completedTasks, SHIFT_TASKS } from '../src/lib/tasks.ts';

const onTimeTask = SHIFT_TASKS.find((task) => task.id === 'on-time');

function summary(deliveries, lateDeliveries, score = 0) {
  return { score, earnings: 0, deliveries, lateDeliveries };
}

test('three on-time deliveries complete the task even if another delivery was late', () => {
  const result = summary(4, 1);
  assert.equal(onTimeTask?.progress(result), 3);
  assert.equal(onTimeTask?.passed(result), true);
  assert.ok(completedTasks(result).some((task) => task.id === 'on-time'));
});

test('the task remains incomplete until three deliveries are on time', () => {
  const result = summary(4, 2);
  assert.equal(onTimeTask?.progress(result), 2);
  assert.equal(onTimeTask?.passed(result), false);
  assert.ok(!completedTasks(result).some((task) => task.id === 'on-time'));
});

test('late delivery counts cannot make on-time progress negative', () => {
  const result = summary(1, 3);
  assert.equal(onTimeTask?.progress(result), 0);
  assert.equal(onTimeTask?.passed(result), false);
});

test('three on-time deliveries with no late deliveries still complete the task', () => {
  const result = summary(3, 0);
  assert.equal(onTimeTask?.passed(result), true);
});
