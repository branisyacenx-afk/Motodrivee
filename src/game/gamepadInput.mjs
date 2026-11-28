const DEADZONE = 0.16;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readAxis(value) {
  if (!Number.isFinite(value)) return 0;
  const axis = clamp(value, -1, 1);
  const magnitude = Math.abs(axis);
  if (magnitude <= DEADZONE) return 0;
  return Math.sign(axis) * ((magnitude - DEADZONE) / (1 - DEADZONE));
}

function readButton(button) {
  if (typeof button === 'number') return clamp(Number.isFinite(button) ? button : 0, 0, 1);
  if (!button || typeof button !== 'object') return 0;
  const value = Number.isFinite(button.value) ? button.value : (button.pressed ? 1 : 0);
  return clamp(value, 0, 1);
}

function readDpad(buttons) {
  const left = readButton(buttons?.[14]);
  const right = readButton(buttons?.[15]);
  const up = readButton(buttons?.[12]);
  const down = readButton(buttons?.[13]);
  return {
    steer: right - left,
    throttle: up,
    brake: down,
  };
}

/**
 * Read the first connected standard-mapped gamepad.
 * Left stick X steers, triggers control throttle/brake, and the D-pad
 * provides digital alternatives. Left stick Y is used for pedals only
 * when no trigger or D-pad pedal is active.
 */
export function readGamepadInput(gamepads) {
  if (!gamepads || !Number.isFinite(gamepads.length)) {
    return { throttle: 0, brake: 0, steer: 0 };
  }

  for (let index = 0; index < gamepads.length; index += 1) {
    const gamepad = gamepads[index];
    if (!gamepad?.connected || gamepad.mapping !== 'standard') continue;

    const axes = gamepad.axes;
    const buttons = gamepad.buttons;
    const vertical = readAxis(axes?.[1] ?? 0);
    const dpad = readDpad(buttons);
    const triggerThrottle = readButton(buttons?.[7]);
    const triggerBrake = readButton(buttons?.[6]);
    const hasPedalButtonInput = triggerThrottle > 0.05 || triggerBrake > 0.05 ||
      dpad.throttle > 0.05 || dpad.brake > 0.05;

    return {
      throttle: Math.max(triggerThrottle, dpad.throttle, hasPedalButtonInput ? 0 : Math.max(0, -vertical)),
      brake: Math.max(triggerBrake, dpad.brake, hasPedalButtonInput ? 0 : Math.max(0, vertical)),
      steer: clamp(readAxis(axes?.[0] ?? 0) + dpad.steer, -1, 1),
    };
  }

  return { throttle: 0, brake: 0, steer: 0 };
}
