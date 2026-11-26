import assert from 'node:assert/strict';
import test from 'node:test';
import { createControlSourceTracker } from '../src/game/controlSources.mjs';

function createHarness() {
  const changes = [];
  const tracker = createControlSourceTracker((control, pressed) => {
    changes.push({ control, pressed });
  });
  return { tracker, changes };
}

test('emits transitions only for the first press and final release', () => {
  const { tracker, changes } = createHarness();

  assert.equal(tracker.press('gas', 'pointer:1'), true);
  assert.equal(tracker.press('gas', 'pointer:2'), true);
  assert.equal(tracker.release('gas', 'pointer:1'), true);
  assert.equal(tracker.release('gas', 'pointer:2'), true);

  assert.deepEqual(changes, [
    { control: 'gas', pressed: true },
    { control: 'gas', pressed: false },
  ]);
});

test('ignores duplicate presses and unknown or repeated releases', () => {
  const { tracker, changes } = createHarness();

  assert.equal(tracker.press('brake', 'pointer:7'), true);
  assert.equal(tracker.press('brake', 'pointer:7'), false);
  assert.equal(tracker.release('brake', 'pointer:8'), false);
  assert.equal(tracker.release('brake', 'pointer:7'), true);
  assert.equal(tracker.release('brake', 'pointer:7'), false);

  assert.deepEqual(changes, [
    { control: 'brake', pressed: true },
    { control: 'brake', pressed: false },
  ]);
});

test('keeps a control active while pointer and keyboard sources overlap', () => {
  const { tracker, changes } = createHarness();

  tracker.press('left', 'pointer:2');
  tracker.press('left', 'keyboard:Space');
  tracker.release('left', 'pointer:2');
  tracker.release('left', 'keyboard:Space');

  assert.deepEqual(changes, [
    { control: 'left', pressed: true },
    { control: 'left', pressed: false },
  ]);
});

test('releasing keyboard sources does not cancel an active pointer', () => {
  const { tracker, changes } = createHarness();

  tracker.press('right', 'pointer:3');
  tracker.press('right', 'keyboard:Enter');
  tracker.releaseKeyboard('right');

  assert.deepEqual(changes, [{ control: 'right', pressed: true }]);

  tracker.release('right', 'pointer:3');
  assert.deepEqual(changes, [
    { control: 'right', pressed: true },
    { control: 'right', pressed: false },
  ]);
});

test('releaseAll clears each active control once and is idempotent', () => {
  const { tracker, changes } = createHarness();

  tracker.press('gas', 'pointer:1');
  tracker.press('gas', 'keyboard:Space');
  tracker.press('brake', 'pointer:2');
  tracker.releaseAll();
  tracker.releaseAll();

  assert.deepEqual(changes, [
    { control: 'gas', pressed: true },
    { control: 'brake', pressed: true },
    { control: 'gas', pressed: false },
    { control: 'brake', pressed: false },
  ]);
});

test('accepts new input after a focus-loss reset', () => {
  const { tracker, changes } = createHarness();

  tracker.press('gas', 'pointer:1');
  tracker.releaseAll();
  tracker.press('gas', 'pointer:1');
  tracker.release('gas', 'pointer:1');

  assert.deepEqual(changes, [
    { control: 'gas', pressed: true },
    { control: 'gas', pressed: false },
    { control: 'gas', pressed: true },
    { control: 'gas', pressed: false },
  ]);
});
