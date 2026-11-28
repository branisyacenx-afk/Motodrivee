import assert from 'node:assert/strict';
import test from 'node:test';
import { readGamepadInput } from '../src/game/gamepadInput.mjs';

function button(value = 0) {
  return { value, pressed: value >= 0.5 };
}

function makeButtons(values = {}) {
  const buttons = Array.from({ length: 16 }, () => button());
  for (const [index, value] of Object.entries(values)) {
    buttons[Number(index)] = button(value);
  }
  return buttons;
}

function gamepad({ axes = [0, 0], buttons = makeButtons(), connected = true, mapping = 'standard' } = {}) {
  return { axes, buttons, connected, mapping };
}

const neutral = { throttle: 0, brake: 0, steer: 0 };

test('returns neutral input when no gamepad is available', () => {
  assert.deepEqual(readGamepadInput(undefined), neutral);
  assert.deepEqual(readGamepadInput([]), neutral);
});

test('skips disconnected and non-standard controllers', () => {
  assert.deepEqual(readGamepadInput([
    gamepad({ connected: false, axes: [-1, -1] }),
    gamepad({ mapping: 'unknown', axes: [1, 1] }),
  ]), neutral);
});

test('uses the left stick for steering with a per-axis deadzone', () => {
  assert.deepEqual(readGamepadInput([gamepad({ axes: [0.12, 0] })]), neutral);
  assert.deepEqual(readGamepadInput([gamepad({ axes: [-1, 0] })]), {
    throttle: 0,
    brake: 0,
    steer: -1,
  });
});

test('maps standard right and left triggers to throttle and brake', () => {
  assert.deepEqual(readGamepadInput([
    gamepad({ buttons: makeButtons({ 6: 0.35, 7: 0.82 }) }),
  ]), {
    throttle: 0.82,
    brake: 0.35,
    steer: 0,
  });
});

test('supports vertical stick throttle and brake as a fallback', () => {
  assert.deepEqual(readGamepadInput([gamepad({ axes: [0, -1] })]), {
    throttle: 1,
    brake: 0,
    steer: 0,
  });
  assert.deepEqual(readGamepadInput([gamepad({ axes: [0, 1] })]), {
    throttle: 0,
    brake: 1,
    steer: 0,
  });
});

test('prefers trigger pedals over the vertical-stick fallback', () => {
  assert.deepEqual(readGamepadInput([
    gamepad({ axes: [0, 0.8], buttons: makeButtons({ 7: 0.75 }) }),
  ]), {
    throttle: 0.75,
    brake: 0,
    steer: 0,
  });
});

test('supports standard D-pad steering and pedals', () => {
  assert.deepEqual(readGamepadInput([
    gamepad({ buttons: makeButtons({ 12: 1, 14: 1 }) }),
  ]), {
    throttle: 1,
    brake: 0,
    steer: -1,
  });
});

test('combines analog and D-pad steering without exceeding the input range', () => {
  assert.deepEqual(readGamepadInput([
    gamepad({ axes: [-1, 0], buttons: makeButtons({ 15: 1 }) }),
  ]), neutral);
  assert.deepEqual(readGamepadInput([
    gamepad({ axes: [1, 0], buttons: makeButtons({ 15: 1 }) }),
  ]), {
    throttle: 0,
    brake: 0,
    steer: 1,
  });
});

test('clamps malformed axes and trigger values safely', () => {
  assert.deepEqual(readGamepadInput([
    gamepad({ axes: [Number.NaN, Number.POSITIVE_INFINITY], buttons: makeButtons({ 6: -2, 7: 4 }) }),
  ]), {
    throttle: 1,
    brake: 0,
    steer: 0,
  });
});

test('uses the first connected standard controller', () => {
  assert.deepEqual(readGamepadInput([
    null,
    gamepad({ axes: [0.5, 0] }),
    gamepad({ axes: [-1, 0] }),
  ]), {
    throttle: 0,
    brake: 0,
    steer: (0.5 - 0.16) / (1 - 0.16),
  });
});
