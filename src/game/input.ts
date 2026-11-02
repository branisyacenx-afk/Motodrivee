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

export function createInputController(): InputController {
  const keys = new Set<string>();
  const touch = new Set<TouchControl>();

  const isActive = (control: keyof typeof KEY_BINDINGS) =>
    touch.has(control) || KEY_BINDINGS[control].some((code) => keys.has(code));

  const onKeyDown = (event: KeyboardEvent) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    keys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const onBlur = () => {
    keys.clear();
    touch.clear();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    read() {
      return {
        throttle: isActive('gas') ? 1 : 0,
        brake: isActive('brake') ? 1 : 0,
        steer: (isActive('left') ? 1 : 0) - (isActive('right') ? 1 : 0),
      };
    },
    setTouch(control, pressed) {
      if (pressed) touch.add(control);
      else touch.delete(control);
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
