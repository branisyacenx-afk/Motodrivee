export interface GamepadInput {
  throttle: number;
  brake: number;
  steer: number;
}

export function readGamepadInput(
  gamepads?: ArrayLike<Gamepad | null> | null,
): GamepadInput;
