import { readGamepadInput } from '@/game/gamepadInput.mjs';
import type { BikeInput } from '@/game/sim/bike';

export type TouchControl = 'left' | 'right' | 'gas' | 'brake';

export interface InputController {
  read: () => BikeInput;
  setTouch: (control: TouchControl, pressed: boolean) => void;
  dispose: () => void;
}

const KEY_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  gas: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS', 'Space'],
} as const;

const GAME_KEYS = new Set<string>(Object.values(KEY_BINDINGS).flat());
const NEUTRAL_GAMEPAD_INPUT = { throttle: 0, brake: 0, steer: 0 };

function readConnectedGamepad() {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return NEUTRAL_GAMEPAD_INPUT;
  }

  try {
    return readGamepadInput(navigator.getGamepads());
  } catch {
    // Some browsers restrict gamepad access until a user gesture. Keep
    // keyboard and touch input available when polling is unavailable.
    return NEUTRAL_GAMEPAD_INPUT;
  }
}

export function createInputController(): InputController {
  const keys = new Set<string>();
  const touch = new Set<TouchControl>();

  const clearInput = () => {
    keys.clear();
    touch.clear();
  };
  const isActive = (control: keyof typeof KEY_BINDINGS) =>
    touch.has(control) || KEY_BINDINGS[control].some((code) => keys.has(code));

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    const isInteractive = target instanceof HTMLElement &&
      (target.isContentEditable || target.matches('input, textarea, select, button, a, [role="button"], [role="textbox"]'));
    if (isInteractive || event.defaultPrevented) return;
    if (GAME_KEYS.has(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const onBlur = () => clearInput();
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') clearInput();
  };
  const onPageHide = () => clearInput();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    read() {
      const gamepad = readConnectedGamepad();
      const digitalSteer = (isActive('left') ? 1 : 0) - (isActive('right') ? 1 : 0);
      return {
        throttle: Math.max(isActive('gas') ? 1 : 0, gamepad.throttle),
        brake: Math.max(isActive('brake') ? 1 : 0, gamepad.brake),
        // Digital steering remains immediate; analog input adds precision
        // while the final clamp keeps the bike input within its normal range.
        steer: Math.max(-1, Math.min(1, digitalSteer + gamepad.steer)),
      };
    },
    setTouch(control, pressed) {
      if (pressed) touch.add(control);
      else touch.delete(control);
    },
    dispose() {
      clearInput();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
