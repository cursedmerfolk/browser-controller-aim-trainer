import * as THREE from 'three';

export function createGamepadInput({ state, settings }) {
  function updateGamepadTimestamp(pad) {
    if (typeof pad.timestamp === 'number' && Number.isFinite(pad.timestamp) && pad.timestamp > 0) {
      state.gamepadTimestampMs = pad.timestamp;
      return;
    }

    state.gamepadTimestampMs = null;
  }

  function updateGamepadRenderDelay() {
    if (state.gamepadTimestampMs === null) {
      state.gamepadRenderDelayMs = null;
      state.displayedGamepadRenderDelayMs = null;
      state.lastGamepadDelayDisplayUpdateMs = 0;
      return;
    }

    const now = performance.now();
    state.gamepadRenderDelayMs = Math.max(0, now - state.gamepadTimestampMs);
    if (now - state.lastGamepadDelayDisplayUpdateMs >= 1000) {
      state.displayedGamepadRenderDelayMs = state.gamepadRenderDelayMs;
      state.lastGamepadDelayDisplayUpdateMs = now;
    }
  }

  function discoverController(showHint = false) {
    const firstPad = Array.from(navigator.getGamepads?.() ?? []).find(Boolean);

    if (firstPad) {
      state.activeGamepadIndex = firstPad.index;
      state.gamepadName = firstPad.id;
      return firstPad;
    }

    state.activeGamepadIndex = null;
    state.gamepadName = showHint ? 'No controller detected - press a controller button' : 'No controller detected';
    return null;
  }

  function getActiveGamepad() {
    const pads = navigator.getGamepads?.() ?? [];

    if (state.activeGamepadIndex !== null && pads[state.activeGamepadIndex]) {
      return pads[state.activeGamepadIndex];
    }

    return discoverController();
  }

  function processStickAxis(value) {
    return applyResponseCurve(applyDeadzone(value, settings.deadzone));
  }

  function applyDeadzone(value, deadzone) {
    if (Math.abs(value) < deadzone) {
      return 0;
    }

    const sign = Math.sign(value);
    return sign * ((Math.abs(value) - deadzone) / (1 - deadzone));
  }

  function applyResponseCurve(value) {
    const sign = Math.sign(value);
    const magnitude = Math.abs(value);

    switch (settings.responseCurve) {
      case 'relaxed':
        return sign * magnitude ** 4;
      case 'exponential':
        return sign * magnitude ** 2.2;
      case 'inverse-s':
        return sign * Math.sin((magnitude * Math.PI) / 2);
      case 'linear':
      default:
        return value;
    }
  }

  function getActionState() {
    let controllerLookX = 0;
    let controllerLookY = 0;
    let moveX = 0;
    let shootPressed = false;
    let adsPressed = false;
    let restartPressed = false;
    let usingGamepad = false;

    const pad = getActiveGamepad();
    if (pad) {
      usingGamepad = true;
      state.rawStickX = pad.axes[2] ?? 0;
      state.rawStickY = pad.axes[3] ?? 0;
      updateGamepadTimestamp(pad);

      controllerLookX = processStickAxis(state.rawStickX);
      controllerLookY = processStickAxis(state.rawStickY);
      moveX += processStickAxis(pad.axes[0] ?? 0);
      shootPressed = getGamepadShootPressed(pad);
      adsPressed = getGamepadAdsPressed(pad);
      restartPressed = getGamepadRestartPressed(pad);
    } else {
      state.rawStickX = 0;
      state.rawStickY = 0;
      state.gamepadTimestampMs = null;
      state.gamepadRenderDelayMs = null;
      state.displayedGamepadRenderDelayMs = null;
      state.lastGamepadDelayDisplayUpdateMs = 0;
    }

    return {
      controllerLookX,
      controllerLookY,
      moveX,
      shootPressed,
      adsPressed,
      restartPressed,
      usingGamepad,
      controllerAimAssistActive: usingGamepad
    };
  }

  function bindEvents() {
    window.addEventListener('gamepadconnected', (event) => {
      state.activeGamepadIndex = event.gamepad.index;
      state.gamepadName = event.gamepad.id;
    });

    window.addEventListener('gamepaddisconnected', (event) => {
      if (state.activeGamepadIndex === event.gamepad.index) {
        state.activeGamepadIndex = null;
        state.gamepadName = 'No controller detected';
        state.gamepadTimestampMs = null;
        state.gamepadRenderDelayMs = null;
        state.displayedGamepadRenderDelayMs = null;
        state.lastGamepadDelayDisplayUpdateMs = 0;
      }
    });
  }

  return {
    bindEvents,
    discoverController,
    getActionState,
    updateGamepadRenderDelay
  };
}

function getButtonValue(button) {
  return button?.value ?? (button?.pressed ? 1 : 0) ?? 0;
}

function getAxisTriggerValue(axisValue) {
  if (typeof axisValue !== 'number' || Number.isNaN(axisValue)) {
    return 0;
  }

  return THREE.MathUtils.clamp((axisValue + 1) / 2, 0, 1);
}

function getGamepadShootPressed(pad) {
  const alternateAxisTrigger =
    pad.mapping === 'standard'
      ? 0
      : Math.max(getAxisTriggerValue(pad.axes[2]), getAxisTriggerValue(pad.axes[5]));

  return (
    getButtonValue(pad.buttons[7]) > 0.05 ||
    getButtonValue(pad.buttons[5]) > 0.05 ||
    getButtonValue(pad.buttons[0]) > 0.05 ||
    getButtonValue(pad.buttons[1]) > 0.05 ||
    getAxisTriggerValue(pad.axes[5]) > 0.55 ||
    alternateAxisTrigger > 0.55
  );
}

function getGamepadAdsPressed(pad) {
  const alternateAxisTrigger =
    pad.mapping === 'standard'
      ? 0
      : Math.max(getAxisTriggerValue(pad.axes[1]), getAxisTriggerValue(pad.axes[4]));

  return (
    getButtonValue(pad.buttons[6]) > 0.05 ||
    getButtonValue(pad.buttons[4]) > 0.05 ||
    getButtonValue(pad.buttons[2]) > 0.05 ||
    getAxisTriggerValue(pad.axes[4]) > 0.55 ||
    alternateAxisTrigger > 0.55
  );
}

function getGamepadRestartPressed(pad) {
  return getButtonValue(pad.buttons[9]) > 0.05 || getButtonValue(pad.buttons[8]) > 0.05;
}
