export function renderHudMarkup({ gamepadName, playerMaxHealth }) {
  return `
    <div class="hud-panel hud edge-panel" id="hud-panel" data-side="left">
      <div class="panel-header">
        <strong>Controller Aim Trainer</strong>
        <button
          class="panel-toggle"
          id="hud-panel-toggle"
          type="button"
          aria-expanded="true"
          aria-label="Collapse Controller Aim Trainer panel"
        >
          <span aria-hidden="true">˅</span>
        </button>
      </div>
      <div class="panel-content">
        <div id="gamepad-status">Controller: ${gamepadName}</div>
        <div id="framerate">FPS: 0</div>
        <div id="health" class="hud-stat">Health: ${playerMaxHealth}</div>
        <div id="accuracy" class="hud-stat">Accuracy: 0%</div>
        <div id="hits" class="hud-stat">Hits: 0</div>
        <div id="misses" class="hud-stat">Misses: 0</div>
        <div id="score" class="hud-stat hud-stat-primary">Score: 0</div>
        <div id="status">Status: READY</div>
        <div id="raw-stick">Raw stick: X 0.00 | Y 0.00</div>
        <div id="input-delay">Pad delay: n/a</div>
        <div class="controls-note">Contribute on GitHub: <a href="https://github.com/cursedmerfolk/browser-controller-aim-trainer" target="_blank" rel="noreferrer">github.com/cursedmerfolk/browser-controller-aim-trainer</a></div>
        <div class="button-row">
          <button id="reset-button" type="button">Restart</button>
        </div>
      </div>
    </div>
    <div class="crosshair" id="crosshair" aria-hidden="true">
      <span class="crosshair-dot"></span>
      <span class="crosshair-tick crosshair-tick-top"></span>
      <span class="crosshair-tick crosshair-tick-right"></span>
      <span class="crosshair-tick crosshair-tick-bottom"></span>
      <span class="crosshair-tick crosshair-tick-left"></span>
      <span class="hit-marker hit-marker-top-left"></span>
      <span class="hit-marker hit-marker-top-right"></span>
      <span class="hit-marker hit-marker-bottom-right"></span>
      <span class="hit-marker hit-marker-bottom-left"></span>
    </div>
    <div class="damage-overlay" id="damage-overlay" aria-hidden="true"></div>
    <div class="game-over-overlay" id="game-over-overlay" aria-live="assertive" aria-hidden="true">
      <div class="game-over-card">
        <strong>Game Over</strong>
        <div>You ran out of health.</div>
        <div class="button-row">
          <button id="game-over-restart-button" type="button">Restart</button>
        </div>
        <div class="game-over-hint">Press Start, Enter, or Restart</div>
      </div>
    </div>
  `;
}

export function renderControlsMarkup() {
  return `
    <div class="hud-panel instructions edge-panel is-collapsed" id="controls-panel" data-side="left">
      <div class="panel-header">
        <strong>Controls</strong>
        <button
          class="panel-toggle"
          id="controls-panel-toggle"
          type="button"
          aria-expanded="false"
          aria-label="Collapse Controls panel"
        >
          <span aria-hidden="true">˄</span>
        </button>
      </div>
      <div class="panel-content">
        <div>Mouse or right stick: aim</div>
        <div>Click the game view to capture mouse look</div>
        <div>Left stick / A-D / left-right arrows: strafe</div>
        <div>Left trigger / L2: aim down sights</div>
        <div>Left click / Space / Right trigger / R2: fire continuously</div>
        <div>Right click: toggle aim down sights | Shift: hold aim down sights</div>
        <div>Targets strafe, shoot at your last seen position, and despawn after a short time.</div>
        <div class="controls-note">You may need to disconnect and reconnect your controller for the browser to register it.</div>
        <div class="button-row">
          <button id="discover-controller-button" type="button">Discover controller</button>
        </div>
      </div>
    </div>
  `;
}

export function getHudElements(root = document) {
  return {
    gamepadStatus: root.querySelector('#gamepad-status'),
    framerate: root.querySelector('#framerate'),
    health: root.querySelector('#health'),
    score: root.querySelector('#score'),
    accuracy: root.querySelector('#accuracy'),
    hits: root.querySelector('#hits'),
    misses: root.querySelector('#misses'),
    status: root.querySelector('#status'),
    rawStick: root.querySelector('#raw-stick'),
    inputDelay: root.querySelector('#input-delay'),
    crosshair: root.querySelector('#crosshair'),
    damageOverlay: root.querySelector('#damage-overlay'),
    gameOverOverlay: root.querySelector('#game-over-overlay'),
    hudPanel: root.querySelector('#hud-panel'),
    controlsPanel: root.querySelector('#controls-panel'),
    discoverControllerButton: root.querySelector('#discover-controller-button'),
    resetButton: root.querySelector('#reset-button'),
    gameOverRestartButton: root.querySelector('#game-over-restart-button')
  };
}

export function updateCrosshair(hudElements, state, getCurrentSpreadPx) {
  hudElements.crosshair.style.setProperty('--gap', `${getCurrentSpreadPx().toFixed(1)}px`);
  hudElements.crosshair.style.setProperty('--hit-opacity', state.hitConfirmFlash.toFixed(3));
  hudElements.crosshair.dataset.mode = state.isAimingDownSights ? 'ads' : 'hip';
  hudElements.damageOverlay.style.opacity = String(state.damageFlash * 0.16);
}

export function updateHud(hudElements, state) {
  const accuracy = state.shots === 0 ? 0 : Math.round((state.hits / state.shots) * 100);
  const misses = Math.max(0, state.shots - state.hits);
  const gamepadDelay =
    state.displayedGamepadRenderDelayMs === null ? 'n/a' : `${Math.round(state.displayedGamepadRenderDelayMs * 10) / 10}ms`;

  hudElements.gamepadStatus.textContent = `Controller: ${state.gamepadName}`;
  hudElements.framerate.textContent = `FPS: ${Math.round(state.fps)}`;
  hudElements.health.textContent = `Health: ${state.playerHealth}`;
  hudElements.accuracy.textContent = `Accuracy: ${accuracy}%`;
  hudElements.hits.textContent = `Hits: ${state.hits}`;
  hudElements.misses.textContent = `Misses: ${misses}`;
  hudElements.score.textContent = `Score: ${state.score}`;
  hudElements.status.textContent = state.isGameOver ? 'Status: LOST - press Restart' : 'Status: READY';
  hudElements.rawStick.textContent = `Raw stick: X ${state.rawStickX.toFixed(2)} | Y ${state.rawStickY.toFixed(2)}`;
  hudElements.inputDelay.textContent = `Pad delay: ${gamepadDelay}`;
  hudElements.gameOverOverlay.classList.toggle('is-visible', state.isGameOver);
  hudElements.gameOverOverlay.setAttribute('aria-hidden', String(!state.isGameOver));
}
