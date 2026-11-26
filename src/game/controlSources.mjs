/** @typedef {'left' | 'right' | 'gas' | 'brake'} TouchControl */
/** @typedef {(control: TouchControl, pressed: boolean) => void} ControlChange */

/**
 * Tracks independent pointer and keyboard sources for each driving control.
 * A control changes state only when its first source is pressed or last source released.
 * @param {ControlChange} onChange
 */
export function createControlSourceTracker(onChange) {
  const activeSources = new Map();

  function press(control, source) {
    if (typeof source !== 'string' || source.length === 0) return false;

    let sources = activeSources.get(control);
    if (!sources) {
      sources = new Set();
      activeSources.set(control, sources);
    }

    if (sources.has(source)) return false;

    const wasInactive = sources.size === 0;
    sources.add(source);
    if (wasInactive) onChange(control, true);
    return true;
  }

  function release(control, source) {
    const sources = activeSources.get(control);
    if (!sources?.delete(source)) return false;

    if (sources.size === 0) {
      activeSources.delete(control);
      onChange(control, false);
    }
    return true;
  }

  function releaseKeyboard(control) {
    const sources = activeSources.get(control);
    if (!sources) return;

    for (const source of [...sources]) {
      if (source.startsWith('keyboard:')) release(control, source);
    }
  }

  function releaseAll() {
    for (const control of activeSources.keys()) {
      onChange(control, false);
    }
    activeSources.clear();
  }

  return { press, release, releaseKeyboard, releaseAll };
}
