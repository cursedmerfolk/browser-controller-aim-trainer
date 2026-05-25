export function createMouseKeyboardInput({ state, rendererDomElement, onUnlockAudio }) {
  const keyboard = new Set();

  function consumeMouseLookInput() {
    const mouseLookX = state.pendingMouseLookX;
    const mouseLookY = state.pendingMouseLookY;
    state.pendingMouseLookX = 0;
    state.pendingMouseLookY = 0;
    return { mouseLookX, mouseLookY };
  }

  function getActionState() {
    let moveX = 0;

    if (keyboard.has('ArrowLeft') || keyboard.has('KeyA')) moveX -= 1;
    if (keyboard.has('ArrowRight') || keyboard.has('KeyD')) moveX += 1;

    return {
      moveX,
      shootPressed: keyboard.has('Space') || state.mouseShootPressed,
      adsPressed: keyboard.has('ShiftLeft') || keyboard.has('ShiftRight') || state.mouseAdsToggled,
      restartPressed: keyboard.has('Enter')
    };
  }

  function bindEvents() {
    rendererDomElement.addEventListener('mousedown', (event) => {
      if (document.pointerLockElement !== rendererDomElement) {
        rendererDomElement.requestPointerLock?.();
      }

      if (event.button === 0) {
        state.mouseShootPressed = true;
      }

      if (event.button === 2) {
        state.mouseAdsToggled = !state.mouseAdsToggled;
      }
    });

    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        state.mouseShootPressed = false;
      }
    });

    window.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== rendererDomElement) {
        return;
      }

      state.pendingMouseLookX += event.movementX;
      state.pendingMouseLookY += event.movementY;
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === rendererDomElement) {
        return;
      }

      state.pendingMouseLookX = 0;
      state.pendingMouseLookY = 0;
    });

    rendererDomElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    window.addEventListener('keydown', (event) => {
      if (isControlKey(event.code)) {
        event.preventDefault();
      }
      keyboard.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      if (isControlKey(event.code)) {
        event.preventDefault();
      }
      keyboard.delete(event.code);
    });

    window.addEventListener('pointerdown', onUnlockAudio, { passive: true });
    window.addEventListener('keydown', onUnlockAudio);
  }

  return {
    bindEvents,
    consumeMouseLookInput,
    getActionState
  };
}

function isControlKey(code) {
  return [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space'
  ].includes(code);
}
