import type { TouchControl } from './input.js';

export interface ControlSourceTracker {
  press(control: TouchControl, source: string): boolean;
  release(control: TouchControl, source: string): boolean;
  releaseKeyboard(control: TouchControl): void;
  releaseAll(): void;
}

export function createControlSourceTracker(
  onChange: (control: TouchControl, pressed: boolean) => void,
): ControlSourceTracker;
