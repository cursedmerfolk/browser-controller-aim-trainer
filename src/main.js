import './style.css';
import * as THREE from 'three';

const SETTINGS_STORAGE_KEY = 'browser-controller-aim-trainer.settings';
const SETTINGS_STORAGE_VERSION = 2;

const RESPONSE_CURVE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'inverse-s', label: 'Inverse S' }
];

const FULL_HEALTH_COLOR = new THREE.Color(0x2fd66b);
const LOW_HEALTH_COLOR = new THREE.Color(0xff4d6d);
const FULL_HEALTH_EMISSIVE = new THREE.Color(0x07150d);
const LOW_HEALTH_EMISSIVE = new THREE.Color(0x2a050a);
const PROJECTILE_UP_AXIS = new THREE.Vector3(0, 1, 0);
const WORLD_UP_AXIS = new THREE.Vector3(0, 1, 0);
const MUZZLE_SCALE = new THREE.Vector3(1, 1, 1);
const TARGET_BODY_BASE_HEIGHT = 0.96;
const TARGET_HEAD_RADIUS = 0.18;
const CENTER_SCREEN = new THREE.Vector2(0, 0);
const BULLET_MAGNETISM_CONE_ANGLE = THREE.MathUtils.degToRad(8);
const ADS_SNAP_CYLINDER_RADIUS = 1;
const DEBUG_VISUAL_OFFSET = 0.2;
const LEGACY_TARGET_SPEED_MIN = 0.45;
const LEGACY_TARGET_SPEED_MAX = 1.8;
const LEGACY_SETTINGS_ORDER = [
  'lookSensitivity',
  'deadzone',
  'fov',
  'projectileRate',
  'sphereSpeed',
  'recoilYStrength',
  'recoilVariance',
  'recoilHorizontalOscillationStrength',
  'recoilHorizontalOscillationSpeed',
  'recoilIntensityOscillator',
  'recoilIntensityOscillationSpeed',
  'responseCurve',
  'invertY'
];

const DEFAULT_SETTINGS = {
  lookSensitivity: 2.8,
  deadzone: 0.12,
  invertY: false,
  fov: 110,
  responseCurve: 'linear',
  projectileRate: 14,
  bulletMagnetism: 0,
  aimSlow: 0,
  aimStickiness: 0,
  adsSnap: 0,
  showDebugShapes: true,
  recoilYStrength: 0.6,
  recoilVariance: 0.18,
  recoilHorizontalOscillationStrength: 0.3,
  recoilHorizontalOscillationSpeed: 0.82,
  recoilIntensityOscillator: 0.35,
  recoilIntensityOscillationSpeed: 0.37,
  targetHorizontalSpeedMin: 0.61,
  targetHorizontalSpeedMax: 2.43,
  targetCount: 8,
  targetRadius: 0.45,
  targetMaxHealth: 12,
  spawnDistanceMin: 4,
  spawnDistanceMax: 36,
  targetLifetimeMin: 6,
  targetLifetimeMax: 9,
  adsFovMultiplier: 0.72,
  adsSensitivityMultiplier: 0.58,
  hipFireSpreadPx: 18,
  adsSpreadPx: 6,
  hipFireSpreadNdc: 0.018,
  adsSpreadNdc: 0.0035,
  shotSpreadKickPx: 4.5,
  shotSpreadKickNdc: 0.0055,
  projectileSpeed: 260,
  projectileMaxDistance: 40
};

const SETTINGS = {
  ...DEFAULT_SETTINGS,
  ...loadStoredSettings()
};

const state = {
  score: 0,
  shots: 0,
  hits: 0,
  activeGamepadIndex: null,
  gamepadName: 'No controller detected',
  yaw: 0,
  pitch: 0,
  rawStickX: 0,
  rawStickY: 0,
  playerVelocity: new THREE.Vector3(),
  isAimingDownSights: false,
  aimBlend: 0,
  spreadKick: 0,
  weaponKick: 0,
  fireCooldown: 0,
  recoilShotIndex: 0,
  recoilPatternX: 0,
  recoilPatternY: 0
};

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="hud-panel hud edge-panel is-collapsed" id="hud-panel" data-side="left">
    <div class="panel-header">
      <strong>Controller Aim Trainer</strong>
      <button
        class="panel-toggle"
        id="hud-panel-toggle"
        type="button"
        aria-expanded="false"
        aria-label="Collapse Controller Aim Trainer panel"
      >
        <span aria-hidden="true">˄</span>
      </button>
    </div>
    <div class="panel-content">
      <div id="gamepad-status">Controller: ${state.gamepadName}</div>
      <div id="mode-status">Aim mode: HIP FIRE</div>
      <div id="curve-status">Curve: ${getResponseCurveLabel(SETTINGS.responseCurve)}</div>
      <div id="recoil-status">Recoil: Y ${SETTINGS.recoilYStrength.toFixed(2)} | Var ${SETTINGS.recoilVariance.toFixed(2)} | Osc ${SETTINGS.recoilHorizontalOscillationStrength.toFixed(2)} | Int ${SETTINGS.recoilIntensityOscillator.toFixed(2)}</div>
      <div id="score">Score: 0</div>
      <div id="accuracy">Accuracy: 0%</div>
      <div id="shots">Shots: 0 | Hits: 0</div>
      <div id="raw-stick">Raw stick: X 0.00 | Y 0.00</div>
    </div>
  </div>
  <div class="crosshair" id="crosshair" aria-hidden="true">
    <span class="crosshair-dot"></span>
    <span class="crosshair-tick crosshair-tick-top"></span>
    <span class="crosshair-tick crosshair-tick-right"></span>
    <span class="crosshair-tick crosshair-tick-bottom"></span>
    <span class="crosshair-tick crosshair-tick-left"></span>
  </div>
  <div class="hud-panel axis-legend" aria-live="polite">
    <strong>World axes</strong>
    <div>X+: right | X-: left</div>
    <div>Y+: up | Y-: down</div>
    <div>Z-: forward/range | Z+: behind player</div>
  </div>
  <div class="hud-panel settings-panel edge-panel is-collapsed" id="settings-panel" data-side="right">
    <div class="panel-header">
      <strong>Controller settings</strong>
      <button
        class="panel-toggle"
        id="settings-panel-toggle"
        type="button"
        aria-expanded="false"
        aria-label="Collapse Controller settings panel"
      >
        <span aria-hidden="true">˄</span>
      </button>
    </div>
    <div class="panel-content">
    ${renderNumericControl({
      id: 'sensitivity',
      label: 'Sensitivity',
      min: 1,
      max: 10,
      step: 0.1,
      value: SETTINGS.lookSensitivity
    })}
    ${renderNumericControl({
      id: 'deadzone',
      label: 'Deadzone',
      min: 0,
      max: 0.35,
      step: 0.01,
      value: SETTINGS.deadzone
    })}
    ${renderNumericControl({
      id: 'fov',
      label: 'FOV',
      min: 50,
      max: 110,
      step: 1,
      value: SETTINGS.fov
    })}
    ${renderNumericControl({
      id: 'projectile-rate',
      label: 'Projectile rate',
      min: 1,
      max: 15,
      step: 0.5,
      value: SETTINGS.projectileRate
    })}
    ${renderNumericControl({
      id: 'bullet-magnetism',
      label: 'Bullet magnetism',
      min: 0,
      max: 1,
      step: 0.01,
      value: SETTINGS.bulletMagnetism
    })}
    ${renderNumericControl({
      id: 'aim-slow',
      label: 'Aim slow',
      min: 0,
      max: 1,
      step: 0.01,
      value: SETTINGS.aimSlow
    })}
    ${renderNumericControl({
      id: 'aim-stickiness',
      label: 'Aim stickiness',
      min: 0,
      max: 1,
      step: 0.01,
      value: SETTINGS.aimStickiness
    })}
    ${renderNumericControl({
      id: 'ads-snap',
      label: 'ADS snap',
      min: 0,
      max: 1,
      step: 0.01,
      value: SETTINGS.adsSnap
    })}
    ${renderNumericControl({
      id: 'target-speed-min',
      label: 'Min target speed',
      min: 0.1,
      max: 5,
      step: 0.05,
      value: SETTINGS.targetHorizontalSpeedMin
    })}
    ${renderNumericControl({
      id: 'target-speed-max',
      label: 'Max target speed',
      min: 0.1,
      max: 5,
      step: 0.05,
      value: SETTINGS.targetHorizontalSpeedMax
    })}
    ${renderNumericControl({
      id: 'recoil-y-strength',
      label: 'Recoil Y strength',
      min: 0.05,
      max: 2.5,
      step: 0.05,
      value: SETTINGS.recoilYStrength
    })}
    ${renderNumericControl({
      id: 'recoil-variance',
      label: 'Recoil variance',
      min: 0,
      max: 10,
      step: 0.05,
      value: SETTINGS.recoilVariance
    })}
    ${renderNumericControl({
      id: 'recoil-horizontal-oscillation',
      label: 'Recoil horiz. oscillation',
      min: 0,
      max: 5,
      step: 0.05,
      value: SETTINGS.recoilHorizontalOscillationStrength
    })}
    ${renderNumericControl({
      id: 'recoil-horizontal-oscillation-speed',
      label: 'Recoil horiz. osc. speed',
      min: 0.1,
      max: 3,
      step: 0.01,
      value: SETTINGS.recoilHorizontalOscillationSpeed
    })}
    ${renderNumericControl({
      id: 'recoil-intensity-oscillator',
      label: 'Recoil intensity oscillator',
      min: 0,
      max: 1.5,
      step: 0.05,
      value: SETTINGS.recoilIntensityOscillator
    })}
    ${renderNumericControl({
      id: 'recoil-intensity-oscillation-speed',
      label: 'Recoil intensity osc. speed',
      min: 0.1,
      max: 2,
      step: 0.05,
      value: SETTINGS.recoilIntensityOscillationSpeed
    })}
    <label class="control-group" for="response-curve-input">
      <span>Response curve</span>
      <select id="response-curve-input">
        ${renderOptions(RESPONSE_CURVE_OPTIONS, SETTINGS.responseCurve)}
      </select>
    </label>
    <label class="checkbox-row" for="invert-y-input">
      <input id="invert-y-input" type="checkbox" ${SETTINGS.invertY ? 'checked' : ''} />
      <span>Invert Y</span>
    </label>
    <label class="checkbox-row" for="show-debug-shapes-input">
      <input id="show-debug-shapes-input" type="checkbox" ${SETTINGS.showDebugShapes ? 'checked' : ''} />
      <span>Show debug shapes</span>
    </label>
    </div>
  </div>
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
      <div>Right stick: aim</div>
      <div>Left trigger / L2: aim down sights</div>
      <div>Right trigger / R2: fire continuously</div>
      <div>Keyboard fallback: arrow keys/WASD aim, Shift ADS, Space fire</div>
      <div>Targets spawn on screen, drift sideways, and despawn after a short time.</div>
      <div class="button-row">
        <button id="discover-controller-button" type="button">Discover controller</button>
        <button id="reset-button" type="button">Reset run</button>
      </div>
    </div>
  </div>
`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 36, 110);

const camera = new THREE.PerspectiveCamera(SETTINGS.fov, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.2, 0);
scene.add(camera);
const previousCameraOrigin = camera.position.clone();

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x223355, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
directionalLight.position.set(3, 8, 4);
directionalLight.castShadow = true;
scene.add(directionalLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(64, 180),
  new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.75 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.z = -64;
floor.receiveShadow = true;
scene.add(floor);

const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(56, 22),
  new THREE.MeshStandardMaterial({ color: 0x182039, roughness: 0.8 })
);
backWall.position.set(0, 11, -88);
backWall.receiveShadow = true;
scene.add(backWall);

const weapon = createWeaponModel();
camera.add(weapon);
const aimAssistDebugVisuals = createAimAssistDebugVisuals();
scene.add(aimAssistDebugVisuals.group);

const targets = [];
const projectiles = [];
const targetBodyGeometry = new THREE.BoxGeometry(0.36, TARGET_BODY_BASE_HEIGHT, 0.36);
const targetHeadGeometry = new THREE.SphereGeometry(TARGET_HEAD_RADIUS, 24, 24);
const projectileGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1, 10);
const projectileMaterial = new THREE.MeshStandardMaterial({
  color: 0xfff2b6,
  emissive: 0xffb347,
  emissiveIntensity: 1.2,
  roughness: 0.15
});

for (let index = 0; index < SETTINGS.targetCount; index += 1) {
  const target = createTarget();
  targets.push(target);
  scene.add(target);
  respawnTarget(target);
}

const raycaster = new THREE.Raycaster();
const keyboard = new Set();
const clock = new THREE.Clock();
const hudElements = {
  gamepadStatus: document.querySelector('#gamepad-status'),
  modeStatus: document.querySelector('#mode-status'),
  curveStatus: document.querySelector('#curve-status'),
  recoilStatus: document.querySelector('#recoil-status'),
  score: document.querySelector('#score'),
  accuracy: document.querySelector('#accuracy'),
  shots: document.querySelector('#shots'),
  rawStick: document.querySelector('#raw-stick'),
  crosshair: document.querySelector('#crosshair'),
  hudPanel: document.querySelector('#hud-panel'),
  settingsPanel: document.querySelector('#settings-panel'),
  controlsPanel: document.querySelector('#controls-panel'),
  responseCurveInput: document.querySelector('#response-curve-input'),
  invertYInput: document.querySelector('#invert-y-input'),
  showDebugShapesInput: document.querySelector('#show-debug-shapes-input'),
  discoverControllerButton: document.querySelector('#discover-controller-button')
};

window.addEventListener('gamepadconnected', (event) => {
  state.activeGamepadIndex = event.gamepad.index;
  state.gamepadName = event.gamepad.id;
});

window.addEventListener('gamepaddisconnected', (event) => {
  if (state.activeGamepadIndex === event.gamepad.index) {
    state.activeGamepadIndex = null;
    state.gamepadName = 'No controller detected';
  }
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.querySelector('#reset-button').addEventListener('click', () => {
  state.score = 0;
  state.shots = 0;
  state.hits = 0;
  state.spreadKick = 0;
  state.weaponKick = 0;
  state.fireCooldown = 0;
  state.recoilShotIndex = 0;
  state.recoilPatternX = 0;
  state.recoilPatternY = 0;
  resetTargets();
  clearProjectiles();
});

hudElements.discoverControllerButton.addEventListener('click', () => {
  discoverController(true);
});

bindNumericSetting({
  id: 'sensitivity',
  min: 1,
  max: 10,
  fallback: DEFAULT_SETTINGS.lookSensitivity,
  onChange: (value) => {
    SETTINGS.lookSensitivity = value;
  }
});

bindNumericSetting({
  id: 'deadzone',
  min: 0,
  max: 0.35,
  fallback: DEFAULT_SETTINGS.deadzone,
  onChange: (value) => {
    SETTINGS.deadzone = value;
  }
});

bindNumericSetting({
  id: 'fov',
  min: 50,
  max: 110,
  fallback: DEFAULT_SETTINGS.fov,
  onChange: (value) => {
    SETTINGS.fov = value;
  }
});

bindNumericSetting({
  id: 'projectile-rate',
  min: 1,
  max: 15,
  fallback: DEFAULT_SETTINGS.projectileRate,
  onChange: (value) => {
    SETTINGS.projectileRate = value;
  }
});

bindNumericSetting({
  id: 'bullet-magnetism',
  min: 0,
  max: 1,
  fallback: DEFAULT_SETTINGS.bulletMagnetism,
  onChange: (value) => {
    SETTINGS.bulletMagnetism = value;
  }
});

bindNumericSetting({
  id: 'aim-slow',
  min: 0,
  max: 1,
  fallback: DEFAULT_SETTINGS.aimSlow,
  onChange: (value) => {
    SETTINGS.aimSlow = value;
  }
});

bindNumericSetting({
  id: 'aim-stickiness',
  min: 0,
  max: 1,
  fallback: DEFAULT_SETTINGS.aimStickiness,
  onChange: (value) => {
    SETTINGS.aimStickiness = value;
  }
});

bindNumericSetting({
  id: 'ads-snap',
  min: 0,
  max: 1,
  fallback: DEFAULT_SETTINGS.adsSnap,
  onChange: (value) => {
    SETTINGS.adsSnap = value;
  }
});

bindNumericSetting({
  id: 'target-speed-min',
  min: 0.1,
  max: 5,
  fallback: DEFAULT_SETTINGS.targetHorizontalSpeedMin,
  onChange: (value) => {
    SETTINGS.targetHorizontalSpeedMin = value;
    if (SETTINGS.targetHorizontalSpeedMax < value) {
      SETTINGS.targetHorizontalSpeedMax = value;
      setNumericControlValue('target-speed-max', value);
    }
  }
});

bindNumericSetting({
  id: 'target-speed-max',
  min: 0.1,
  max: 5,
  fallback: DEFAULT_SETTINGS.targetHorizontalSpeedMax,
  onChange: (value) => {
    SETTINGS.targetHorizontalSpeedMax = value;
    if (SETTINGS.targetHorizontalSpeedMin > value) {
      SETTINGS.targetHorizontalSpeedMin = value;
      setNumericControlValue('target-speed-min', value);
    }
  }
});

bindNumericSetting({
  id: 'recoil-y-strength',
  min: 0.05,
  max: 2.5,
  fallback: DEFAULT_SETTINGS.recoilYStrength,
  onChange: (value) => {
    SETTINGS.recoilYStrength = value;
  }
});

bindNumericSetting({
  id: 'recoil-variance',
  min: 0,
  max: 10,
  fallback: DEFAULT_SETTINGS.recoilVariance,
  onChange: (value) => {
    SETTINGS.recoilVariance = value;
  }
});

bindNumericSetting({
  id: 'recoil-horizontal-oscillation',
  min: 0,
  max: 5,
  fallback: DEFAULT_SETTINGS.recoilHorizontalOscillationStrength,
  onChange: (value) => {
    SETTINGS.recoilHorizontalOscillationStrength = value;
  }
});

bindNumericSetting({
  id: 'recoil-horizontal-oscillation-speed',
  min: 0.1,
  max: 3,
  fallback: DEFAULT_SETTINGS.recoilHorizontalOscillationSpeed,
  onChange: (value) => {
    SETTINGS.recoilHorizontalOscillationSpeed = value;
  }
});

bindNumericSetting({
  id: 'recoil-intensity-oscillator',
  min: 0,
  max: 1.5,
  fallback: DEFAULT_SETTINGS.recoilIntensityOscillator,
  onChange: (value) => {
    SETTINGS.recoilIntensityOscillator = value;
  }
});

bindNumericSetting({
  id: 'recoil-intensity-oscillation-speed',
  min: 0.1,
  max: 2,
  fallback: DEFAULT_SETTINGS.recoilIntensityOscillationSpeed,
  onChange: (value) => {
    SETTINGS.recoilIntensityOscillationSpeed = value;
  }
});

hudElements.responseCurveInput.addEventListener('change', (event) => {
  SETTINGS.responseCurve = sanitizeResponseCurve(event.target.value);
  storeSettings();
});

hudElements.invertYInput.addEventListener('change', (event) => {
  SETTINGS.invertY = event.target.checked;
  storeSettings();
});

hudElements.showDebugShapesInput.addEventListener('change', (event) => {
  SETTINGS.showDebugShapes = event.target.checked;
  storeSettings();
});

initializePanelToggles();

function loop() {
  const delta = clock.getDelta();
  const input = getInputState();
  const directAimTarget = getDirectAimTarget();

  updateAimState(delta, input.adsPressed, input.shootPressed);
  applyLookInput(input.lookX, input.lookY, delta, directAimTarget, input.usingGamepad);
  updateCamera();
  updatePlayerVelocity(delta);
  applyAimAssist(delta);
  updateCamera();
  updateAimAssistDebugVisuals();
  updateFiring(delta, input.shootPressed);
  updateWeaponTransform();
  updateTargets(delta);
  updateProjectiles(delta);
  updateCrosshair();
  updateHud();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function getInputState() {
  let lookX = 0;
  let lookY = 0;
  let shootPressed = keyboard.has('Space');
  let adsPressed = keyboard.has('ShiftLeft') || keyboard.has('ShiftRight');
  let usingGamepad = false;

  const pad = getActiveGamepad();
  if (pad) {
    usingGamepad = true;
    state.rawStickX = pad.axes[2] ?? 0;
    state.rawStickY = pad.axes[3] ?? 0;

    lookX = processStickAxis(state.rawStickX);
    lookY = processStickAxis(state.rawStickY);
    shootPressed = shootPressed || isButtonPressed(pad.buttons[7]) || isButtonPressed(pad.buttons[5]);
    adsPressed = adsPressed || isButtonPressed(pad.buttons[6]) || isButtonPressed(pad.buttons[4]);
  } else {
    state.rawStickX = 0;
    state.rawStickY = 0;
  }

  if (keyboard.has('ArrowLeft') || keyboard.has('KeyA')) lookX -= 0.7;
  if (keyboard.has('ArrowRight') || keyboard.has('KeyD')) lookX += 0.7;
  if (keyboard.has('ArrowUp') || keyboard.has('KeyW')) lookY -= 0.7;
  if (keyboard.has('ArrowDown') || keyboard.has('KeyS')) lookY += 0.7;

  return { lookX, lookY, shootPressed, adsPressed, usingGamepad };
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
  return applyResponseCurve(applyDeadzone(value, SETTINGS.deadzone));
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

  switch (SETTINGS.responseCurve) {
    case 'exponential':
      return sign * magnitude ** 2.2;
    case 'inverse-s':
      return sign * Math.sin((magnitude * Math.PI) / 2);
    case 'linear':
    default:
      return value;
  }
}

function getTargetRoot(object) {
  return object.userData.targetRoot ?? object;
}

function applyLookInput(lookX, lookY, delta, directAimTarget, usingGamepad) {
  let sensitivityMultiplier = THREE.MathUtils.lerp(1, SETTINGS.adsSensitivityMultiplier, state.aimBlend);
  if (usingGamepad && directAimTarget && SETTINGS.aimSlow > 0) {
    sensitivityMultiplier *= THREE.MathUtils.lerp(1, 0.25, SETTINGS.aimSlow);
  }

  const lookSensitivity = SETTINGS.lookSensitivity * sensitivityMultiplier;
  const verticalLook = SETTINGS.invertY ? -lookY : lookY;

  state.yaw -= lookX * lookSensitivity * delta;
  state.pitch -= verticalLook * lookSensitivity * delta;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -0.85, 0.85);
}

function updateAimState(delta, adsPressed, shootPressed) {
  state.isAimingDownSights = adsPressed;
  state.aimBlend = THREE.MathUtils.lerp(state.aimBlend, adsPressed ? 1 : 0, 1 - Math.exp(-delta * 14));
  state.spreadKick = Math.max(0, state.spreadKick - delta * 3.5);
  state.weaponKick = Math.max(0, state.weaponKick - delta * 6);
  state.recoilPatternX = THREE.MathUtils.lerp(state.recoilPatternX, 0, 1 - Math.exp(-delta * 10));
  state.recoilPatternY = THREE.MathUtils.lerp(state.recoilPatternY, 0, 1 - Math.exp(-delta * 8));

  if (!shootPressed) {
    state.recoilShotIndex = 0;
  }
}

function applyAimAssist(delta) {
  const directAimTarget = getDirectAimTarget();
  if (directAimTarget && SETTINGS.aimStickiness > 0) {
    state.yaw += getStickinessYawNudge(directAimTarget, delta) * SETTINGS.aimStickiness;
  }

  if (isAdsSnapActive() && SETTINGS.adsSnap > 0) {
    const nearbyTarget = getNearestTargetInCylinder(
      getCameraOrigin(),
      getCameraForward(),
      ADS_SNAP_CYLINDER_RADIUS,
      SETTINGS.projectileMaxDistance
    );
    if (nearbyTarget) {
      nudgeAimTowardTarget(nearbyTarget, 1 - Math.exp(-delta * 14 * SETTINGS.adsSnap), false);
    }
  }
}

function isAdsSnapActive() {
  return state.isAimingDownSights && state.aimBlend <= 0.9;
}

function updateCamera() {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  const targetFov = THREE.MathUtils.lerp(SETTINGS.fov, getAdsFov(), state.aimBlend);
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }
}

function getAdsFov() {
  return THREE.MathUtils.clamp(SETTINGS.fov * SETTINGS.adsFovMultiplier, 35, SETTINGS.fov);
}

function updateFiring(delta, shootPressed) {
  state.fireCooldown = Math.max(0, state.fireCooldown - delta);

  if (!shootPressed) {
    state.fireCooldown = 0;
    return;
  }

  const shotInterval = 1 / SETTINGS.projectileRate;
  let remainingShots = 4;

  while (state.fireCooldown <= 0 && remainingShots > 0) {
    fireShot();
    state.fireCooldown += shotInterval;
    remainingShots -= 1;
  }
}

function fireShot() {
  state.shots += 1;

  const recoilPoint = getRecoilPoint(state.recoilShotIndex);
  const shotOffset = getShotOffset(recoilPoint.clone());
  state.recoilShotIndex += 1;

  state.spreadKick = Math.min(state.spreadKick + (state.isAimingDownSights ? 0.35 : 1), 3);
  state.weaponKick = Math.min(state.weaponKick + (state.isAimingDownSights ? 0.35 : 0.7), 1.2);
  state.recoilPatternX = THREE.MathUtils.clamp(
    state.recoilPatternX + recoilPoint.x * 0.12,
    -1.5,
    1.5
  );
  state.recoilPatternY = THREE.MathUtils.clamp(
    state.recoilPatternY + recoilPoint.y * 0.08,
    0,
    2
  );
  applyAimRecoil(recoilPoint);

  const shotDirection = getShotDirection(shotOffset);
  raycaster.set(getCameraOrigin(), shotDirection);
  const intersections = raycaster.intersectObjects(targets, true);
  const hitPoint = intersections[0]?.point ?? getMissPoint();

  if (intersections.length > 0) {
    applyHitToTarget(getTargetRoot(intersections[0].object));
  }

  createProjectileVisual(getProjectileStart(), hitPoint);
}

function getMissPoint() {
  return raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(SETTINGS.projectileMaxDistance));
}

function getShotDirection(shotOffset) {
  raycaster.setFromCamera(shotOffset, camera);
  const baseDirection = raycaster.ray.direction.clone();

  if (SETTINGS.bulletMagnetism <= 0) {
    return baseDirection;
  }

  const magnetismTarget = getNearestTargetInCone(getCameraOrigin(), baseDirection, BULLET_MAGNETISM_CONE_ANGLE);
  if (!magnetismTarget) {
    return baseDirection;
  }

  const magnetizedDirection = getTargetAimPoint(magnetismTarget).sub(getCameraOrigin()).normalize();
  return baseDirection.addScaledVector(magnetizedDirection, SETTINGS.bulletMagnetism).normalize();
}

function getProjectileStart() {
  const weaponTransform = getBaseWeaponTransform();
  const muzzleMatrix = new THREE.Matrix4()
    .makeRotationFromEuler(weaponTransform.rotation)
    .setPosition(weaponTransform.position);

  return camera.localToWorld(weapon.userData.barrelTipLocal.clone().applyMatrix4(muzzleMatrix));
}

function applyAimRecoil(recoilPoint) {
  const horizontalKick = recoilPoint.x * THREE.MathUtils.lerp(0.013, 0.008, state.aimBlend);
  const verticalKick = recoilPoint.y * THREE.MathUtils.lerp(0.02, 0.013, state.aimBlend);

  state.yaw -= horizontalKick;
  state.pitch = THREE.MathUtils.clamp(state.pitch + verticalKick, -0.85, 0.85);
}

function getShotOffset(recoilPoint) {
  if (state.isAimingDownSights) {
    return new THREE.Vector2(0, 0);
  }

  const randomOffset = getRandomSpreadOffset();
  const recoilScale = THREE.MathUtils.lerp(0.0042, 0.0019, state.aimBlend);

  return randomOffset.add(recoilPoint.multiplyScalar(recoilScale));
}

function getRandomSpreadOffset() {
  const spread = getCurrentSpreadNdc();
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * spread;

  return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

function getCurrentSpreadNdc() {
  const baseSpread = THREE.MathUtils.lerp(SETTINGS.hipFireSpreadNdc, SETTINGS.adsSpreadNdc, state.aimBlend);
  return baseSpread + state.spreadKick * SETTINGS.shotSpreadKickNdc;
}

function getCurrentSpreadPx() {
  const baseSpread = THREE.MathUtils.lerp(SETTINGS.hipFireSpreadPx, SETTINGS.adsSpreadPx, state.aimBlend);
  return baseSpread + state.spreadKick * SETTINGS.shotSpreadKickPx;
}

function getRecoilPoint(shotIndex) {
  const step = shotIndex;
  const intensityOscillation =
    Math.sin(step * SETTINGS.recoilIntensityOscillationSpeed) * SETTINGS.recoilIntensityOscillator;
  const intensityScale = Math.max(0, 1 + intensityOscillation);
  const expectedX =
    Math.sin(step * SETTINGS.recoilHorizontalOscillationSpeed) *
    SETTINGS.recoilHorizontalOscillationStrength *
    intensityScale;
  const varianceX = SETTINGS.recoilVariance <= 0 ? 0 : randomRange(-SETTINGS.recoilVariance, SETTINGS.recoilVariance);
  const varianceY = SETTINGS.recoilVariance <= 0 ? 0 : randomRange(-SETTINGS.recoilVariance, SETTINGS.recoilVariance);

  return new THREE.Vector2(
    expectedX + varianceX,
    Math.max(0, SETTINGS.recoilYStrength * intensityScale + varianceY)
  );
}

function createProjectileVisual(start, end) {
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
  const distance = start.distanceTo(end);
  const direction = end.clone().sub(start).normalize();

  mesh.position.copy(start);
  mesh.quaternion.setFromUnitVectors(PROJECTILE_UP_AXIS, direction);
  scene.add(mesh);
  projectiles.push({
    mesh,
    start,
    end,
    direction,
    distance,
    trailLength: Math.min(Math.max(distance * 0.4, 3.5), 8),
    progress: 0,
    duration: Math.max(distance / SETTINGS.projectileSpeed, 0.02)
  });
}

function updateProjectiles(delta) {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    projectile.progress += delta / projectile.duration;

    if (projectile.progress >= 1) {
      scene.remove(projectile.mesh);
      projectiles.splice(index, 1);
      continue;
    }

    const headDistance = projectile.distance * projectile.progress;
    const tailDistance = Math.max(0, headDistance - projectile.trailLength);
    const head = projectile.start.clone().addScaledVector(projectile.direction, headDistance);
    const tail = projectile.start.clone().addScaledVector(projectile.direction, tailDistance);
    const segment = head.clone().sub(tail);
    const segmentLength = Math.max(segment.length(), 0.001);
    const midpoint = tail.clone().addScaledVector(segment, 0.5);

    projectile.mesh.position.copy(midpoint);
    projectile.mesh.quaternion.setFromUnitVectors(PROJECTILE_UP_AXIS, projectile.direction);
    projectile.mesh.scale.set(1, segmentLength, 1);
  }
}

function clearProjectiles() {
  for (const projectile of projectiles) {
    scene.remove(projectile.mesh);
  }
  projectiles.length = 0;
}

function createTarget() {
  const material = new THREE.MeshStandardMaterial({
    color: FULL_HEALTH_COLOR.clone(),
    roughness: 0.3,
    emissive: FULL_HEALTH_EMISSIVE.clone(),
    emissiveIntensity: 0.35
  });

  const target = new THREE.Group();
  const body = new THREE.Mesh(targetBodyGeometry, material);
  const head = new THREE.Mesh(targetHeadGeometry, material);

  body.castShadow = true;
  head.castShadow = true;
  body.userData.targetRoot = target;
  head.userData.targetRoot = target;
  target.add(body);
  target.add(head);
  target.userData.maxHealth = SETTINGS.targetMaxHealth;
  target.userData.health = SETTINGS.targetMaxHealth;
  target.userData.basePosition = new THREE.Vector3();
  target.userData.horizontalVelocity = new THREE.Vector3();
  target.userData.age = 0;
  target.userData.lifetime = SETTINGS.targetLifetimeMax;
  target.userData.body = body;
  target.userData.head = head;
  target.userData.widthScale = 1;
  target.userData.bodyHeightScale = 1.45;
  target.userData.feetClearance = 0.04;
  target.userData.material = material;
  target.userData.totalHeight = TARGET_BODY_BASE_HEIGHT + TARGET_HEAD_RADIUS * 2;

  return target;
}

function applyHitToTarget(target) {
  state.hits += 1;
  state.score += 25;
  target.userData.health -= 1;

  if (target.userData.health <= 0) {
    respawnTarget(target);
    return;
  }

  applyTargetHealthVisuals(target);
}

function respawnTarget(target) {
  const distance = randomRange(SETTINGS.spawnDistanceMin, SETTINGS.spawnDistanceMax);
  const horizontalForward = camera.getWorldDirection(new THREE.Vector3());
  horizontalForward.y = 0;
  if (horizontalForward.lengthSq() < 0.0001) {
    horizontalForward.set(0, 0, -1);
  } else {
    horizontalForward.normalize();
  }

  const horizontalRight = new THREE.Vector3().crossVectors(horizontalForward, WORLD_UP_AXIS).normalize();
  const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance * camera.aspect;
  const lateralOffset = randomRange(-halfWidth * 0.32, halfWidth * 0.32);
  const worldPosition = camera.position
    .clone()
    .addScaledVector(horizontalForward, distance)
    .addScaledVector(horizontalRight, lateralOffset);
  if (Math.random() < 0.3) {
    worldPosition.y = target.userData.feetClearance;
  } else {
    worldPosition.y = randomRange(target.userData.feetClearance, 1.15);
  }

  const moveSpeed = getRandomTargetMoveSpeed();
  const horizontalVelocity = getHorizontalVelocity(moveSpeed);

  target.userData.basePosition.copy(worldPosition);
  target.userData.horizontalVelocity.copy(horizontalVelocity);
  target.userData.moveSpeed = moveSpeed;
  target.userData.age = 0;
  target.userData.lifetime = randomRange(SETTINGS.targetLifetimeMin, SETTINGS.targetLifetimeMax);
  target.userData.health = target.userData.maxHealth;
  target.userData.widthScale = randomRange(0.92, 1.12);
  target.userData.bodyHeightScale = randomRange(1.2, 1.55);
  target.userData.totalHeight =
    TARGET_BODY_BASE_HEIGHT * target.userData.bodyHeightScale + TARGET_HEAD_RADIUS * 2 * target.userData.widthScale;

  target.userData.body.scale.set(
    target.userData.widthScale,
    target.userData.bodyHeightScale,
    target.userData.widthScale
  );
  target.userData.body.position.y = (TARGET_BODY_BASE_HEIGHT * target.userData.bodyHeightScale) / 2;
  target.userData.head.scale.setScalar(target.userData.widthScale);
  target.userData.head.position.y =
    TARGET_BODY_BASE_HEIGHT * target.userData.bodyHeightScale + TARGET_HEAD_RADIUS * target.userData.widthScale;

  target.position.copy(worldPosition);

  applyTargetHealthVisuals(target);
}

function getRandomTargetMoveSpeed() {
  return randomRange(SETTINGS.targetHorizontalSpeedMin, SETTINGS.targetHorizontalSpeedMax);
}

function getHorizontalVelocity(moveSpeed) {
  const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  direction.y = 0;

  if (direction.lengthSq() < 0.0001) {
    direction.set(1, 0, 0);
  } else {
    direction.normalize();
  }

  return direction.multiplyScalar(moveSpeed * (Math.random() < 0.5 ? -1 : 1));
}

function resetTargets() {
  for (const target of targets) {
    respawnTarget(target);
  }
}

function applyTargetHealthVisuals(target) {
  const healthRatio = target.userData.health / target.userData.maxHealth;

  target.userData.material.color.lerpColors(LOW_HEALTH_COLOR, FULL_HEALTH_COLOR, healthRatio);
  target.userData.material.emissive.lerpColors(LOW_HEALTH_EMISSIVE, FULL_HEALTH_EMISSIVE, healthRatio);
}

function updateTargets(delta) {
  for (const target of targets) {
    target.userData.age += delta;
    target.userData.basePosition.addScaledVector(target.userData.horizontalVelocity, delta);
    target.userData.basePosition.y = Math.max(target.userData.basePosition.y, target.userData.feetClearance);
    target.position.copy(target.userData.basePosition);

    if (target.userData.age >= target.userData.lifetime) {
      respawnTarget(target);
    }
  }
}

function createWeaponModel() {
  const rifle = new THREE.Group();

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111722, roughness: 0.8, metalness: 0.15 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3f57, roughness: 0.55, metalness: 0.2 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.34), darkMaterial);
  receiver.position.set(0, -0.02, -0.27);
  rifle.add(receiver);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), accentMaterial);
  stock.position.set(0, -0.02, 0);
  rifle.add(stock);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.28), accentMaterial);
  handguard.position.set(0, -0.02, -0.58);
  rifle.add(handguard);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 12), darkMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, -0.02, -1);
  rifle.add(barrel);
  rifle.userData.barrelTipLocal = new THREE.Vector3(0, -0.02, -1.5);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.16), accentMaterial);
  sight.position.set(0, 0.0475, -0.27);
  rifle.add(sight);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), darkMaterial);
  grip.position.set(0, -0.15, -0.16);
  rifle.add(grip);

  return rifle;
}

function createAimAssistDebugVisuals() {
  const group = new THREE.Group();
  const lineLength = SETTINGS.projectileMaxDistance;
  const magnetismCone = createDebugCone(BULLET_MAGNETISM_CONE_ANGLE, lineLength, 0xffb347);
  group.add(magnetismCone);

  const adsSnapCylinder = createDebugCylinder(ADS_SNAP_CYLINDER_RADIUS, lineLength, 0xff4d6d);
  group.add(adsSnapCylinder);

  return { group, magnetismCone, adsSnapCylinder };
}

function createDebugLine(color, length) {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length)]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 12;
  return line;
}

function createDebugCone(angle, length, color) {
  const radius = Math.tan(angle) * length;
  const coneGroup = new THREE.Group();
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 24, 1, true), surfaceMaterial);
  cone.rotation.x = Math.PI / 2;
  cone.position.z = -length / 2;
  cone.renderOrder = 10;
  coneGroup.add(cone);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.ConeGeometry(radius, length, 24, 1, true)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  wireframe.rotation.x = Math.PI / 2;
  wireframe.position.z = -length / 2;
  wireframe.renderOrder = 12;
  coneGroup.add(wireframe);

  const baseRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 32 }, (_, index) => {
        const theta = (index / 32) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, -length);
      })
    ),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  baseRing.renderOrder = 12;
  coneGroup.add(baseRing);

  const centerLine = createDebugLine(color, length);
  coneGroup.add(centerLine);

  return coneGroup;
}

function createDebugCylinder(radius, length, color) {
  const cylinderGroup = new THREE.Group();
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24, 1, true), surfaceMaterial);
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.z = -length / 2;
  cylinder.renderOrder = 10;
  cylinderGroup.add(cylinder);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(radius, radius, length, 24, 1, true)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  wireframe.rotation.x = Math.PI / 2;
  wireframe.position.z = -length / 2;
  wireframe.renderOrder = 12;
  cylinderGroup.add(wireframe);

  const endRingMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const frontRing = createDebugRing(radius, 0, endRingMaterial);
  const backRing = createDebugRing(radius, -length, endRingMaterial);
  cylinderGroup.add(frontRing);
  cylinderGroup.add(backRing);

  const centerLine = createDebugLine(color, length);
  cylinderGroup.add(centerLine);

  return cylinderGroup;
}

function createDebugRing(radius, z, material) {
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 32 }, (_, index) => {
        const theta = (index / 32) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
      })
    ),
    material
  );
  ring.renderOrder = 12;
  return ring;
}

function updateAimAssistDebugVisuals() {
  const debugOrigin = getCameraOrigin().addScaledVector(getCameraForward(), DEBUG_VISUAL_OFFSET);
  aimAssistDebugVisuals.group.position.copy(debugOrigin);
  aimAssistDebugVisuals.group.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
  aimAssistDebugVisuals.group.visible = SETTINGS.showDebugShapes;
  aimAssistDebugVisuals.magnetismCone.visible = SETTINGS.showDebugShapes && SETTINGS.bulletMagnetism > 0;
  aimAssistDebugVisuals.adsSnapCylinder.visible = SETTINGS.showDebugShapes && SETTINGS.adsSnap > 0 && isAdsSnapActive();
}

function updateWeaponTransform() {
  const baseTransform = getBaseWeaponTransform();

  weapon.position.set(
    baseTransform.position.x + state.recoilPatternX * 0.01 * (1 - state.aimBlend * 0.85),
    baseTransform.position.y - state.weaponKick * 0.025 - state.recoilPatternY * 0.008,
    baseTransform.position.z + state.weaponKick * 0.05
  );

  weapon.rotation.set(
    baseTransform.rotation.x + state.weaponKick * 0.14 + state.recoilPatternY * 0.06,
    baseTransform.rotation.y,
    baseTransform.rotation.z - state.recoilPatternX * 0.09 * (1 - state.aimBlend * 0.85)
  );
}

function getBaseWeaponTransform() {
  return {
    position: new THREE.Vector3(
      THREE.MathUtils.lerp(0.24, 0, state.aimBlend),
      THREE.MathUtils.lerp(-0.2, -0.12, state.aimBlend),
      THREE.MathUtils.lerp(-0.16, -0.1, state.aimBlend)
    ),
    rotation: new THREE.Euler(
      THREE.MathUtils.lerp(-0.06, 0, state.aimBlend),
      THREE.MathUtils.lerp(-0.12, 0, state.aimBlend),
      THREE.MathUtils.lerp(-0.02, 0, state.aimBlend),
      'XYZ'
    ),
    scale: MUZZLE_SCALE
  };
}

function updateCrosshair() {
  hudElements.crosshair.style.setProperty('--gap', `${getCurrentSpreadPx().toFixed(1)}px`);
  hudElements.crosshair.dataset.mode = state.isAimingDownSights ? 'ads' : 'hip';
}

function updateHud() {
  const accuracy = state.shots === 0 ? 0 : Math.round((state.hits / state.shots) * 100);

  hudElements.gamepadStatus.textContent = `Controller: ${state.gamepadName}`;
  hudElements.modeStatus.textContent = `Aim mode: ${state.isAimingDownSights ? 'ADS' : 'HIP FIRE'}`;
  hudElements.curveStatus.textContent = `Curve: ${getResponseCurveLabel(SETTINGS.responseCurve)}`;
  hudElements.recoilStatus.textContent = `Recoil: Y ${SETTINGS.recoilYStrength.toFixed(2)} | Var ${SETTINGS.recoilVariance.toFixed(2)} | Osc ${SETTINGS.recoilHorizontalOscillationStrength.toFixed(2)} @ ${SETTINGS.recoilHorizontalOscillationSpeed.toFixed(2)} | Int ${SETTINGS.recoilIntensityOscillator.toFixed(2)} @ ${SETTINGS.recoilIntensityOscillationSpeed.toFixed(2)}`;
  hudElements.score.textContent = `Score: ${state.score}`;
  hudElements.accuracy.textContent = `Accuracy: ${accuracy}%`;
  hudElements.shots.textContent = `Shots: ${state.shots} | Hits: ${state.hits}`;
  hudElements.rawStick.textContent = `Raw stick: X ${state.rawStickX.toFixed(2)} | Y ${state.rawStickY.toFixed(2)}`;
}

function bindNumericSetting({ id, min, max, fallback, onChange }) {
  const rangeInput = document.querySelector(`#${id}-range`);
  const numberInput = document.querySelector(`#${id}-number`);

  const applyValue = (rawValue) => {
    const value = clampSetting(Number(rawValue), min, max, fallback);
    onChange(value);
    rangeInput.value = String(value);
    numberInput.value = String(value);
    storeSettings();
  };

  rangeInput.addEventListener('input', (event) => {
    applyValue(event.target.value);
  });

  numberInput.addEventListener('change', (event) => {
    applyValue(event.target.value);
  });

  numberInput.addEventListener('blur', (event) => {
    applyValue(event.target.value);
  });
}

function setNumericControlValue(id, value) {
  const rangeInput = document.querySelector(`#${id}-range`);
  const numberInput = document.querySelector(`#${id}-number`);
  const stringValue = String(value);

  if (rangeInput) {
    rangeInput.value = stringValue;
  }

  if (numberInput) {
    numberInput.value = stringValue;
  }
}

function initializePanelToggles() {
  const panels = [hudElements.hudPanel, hudElements.settingsPanel, hudElements.controlsPanel];

  for (const panel of panels) {
    const toggle = panel.querySelector('.panel-toggle');
    toggle.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('is-collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.querySelector('span').textContent = getPanelToggleSymbol(collapsed);
    });
  }
}

function getPanelToggleSymbol(collapsed) {
  return collapsed ? '˄' : '˅';
}

function renderNumericControl({ id, label, min, max, step, value }) {
  return `
    <label class="control-group" for="${id}-range">
      <span>${label}</span>
      <div class="control-inputs">
        <input id="${id}-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" />
        <input
          id="${id}-number"
          class="control-number"
          type="number"
          inputmode="decimal"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
        />
      </div>
    </label>
  `;
}

function renderOptions(options, selectedValue) {
  return options
    .map((option) => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`)
    .join('');
}

function isButtonPressed(button) {
  return Boolean(button?.pressed || (button?.value ?? 0) > 0.25);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
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

function getResponseCurveLabel(value) {
  return RESPONSE_CURVE_OPTIONS.find((option) => option.value === value)?.label ?? 'Linear';
}

function sanitizeResponseCurve(value) {
  return RESPONSE_CURVE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SETTINGS.responseCurve;
}

function loadStoredSettings() {
  const storedValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue);
    const storedSettings = getStoredSettingsMap(parsed);
    const legacySphereSpeed = clampSetting(storedSettings.sphereSpeed, 0.4, 2.5, 1.35);
    const targetHorizontalSpeedMin =
      typeof storedSettings.targetHorizontalSpeedMin === 'number'
        ? storedSettings.targetHorizontalSpeedMin
        : LEGACY_TARGET_SPEED_MIN * legacySphereSpeed;
    const targetHorizontalSpeedMax =
      typeof storedSettings.targetHorizontalSpeedMax === 'number'
        ? storedSettings.targetHorizontalSpeedMax
        : LEGACY_TARGET_SPEED_MAX * legacySphereSpeed;

    return {
      lookSensitivity: clampSetting(storedSettings.lookSensitivity, 1, 10, DEFAULT_SETTINGS.lookSensitivity),
      deadzone: clampSetting(storedSettings.deadzone, 0, 0.35, DEFAULT_SETTINGS.deadzone),
      fov: clampSetting(storedSettings.fov, 50, 110, DEFAULT_SETTINGS.fov),
      projectileRate: clampSetting(storedSettings.projectileRate, 1, 15, DEFAULT_SETTINGS.projectileRate),
      bulletMagnetism: clampSetting(storedSettings.bulletMagnetism, 0, 1, DEFAULT_SETTINGS.bulletMagnetism),
      aimSlow: clampSetting(storedSettings.aimSlow, 0, 1, DEFAULT_SETTINGS.aimSlow),
      aimStickiness: clampSetting(storedSettings.aimStickiness, 0, 1, DEFAULT_SETTINGS.aimStickiness),
      adsSnap: clampSetting(storedSettings.adsSnap, 0, 1, DEFAULT_SETTINGS.adsSnap),
      showDebugShapes:
        typeof storedSettings.showDebugShapes === 'boolean' ? storedSettings.showDebugShapes : DEFAULT_SETTINGS.showDebugShapes,
      recoilYStrength: clampSetting(
        storedSettings.recoilYStrength ?? storedSettings.recoilPatternStrength ?? storedSettings.sprayPatternStrength,
        0.05,
        2.5,
        DEFAULT_SETTINGS.recoilYStrength
      ),
      recoilVariance: clampSetting(storedSettings.recoilVariance, 0, 10, DEFAULT_SETTINGS.recoilVariance),
      recoilHorizontalOscillationStrength: clampSetting(
        storedSettings.recoilHorizontalOscillationStrength,
        0,
        5,
        DEFAULT_SETTINGS.recoilHorizontalOscillationStrength
      ),
      recoilHorizontalOscillationSpeed: clampSetting(
        storedSettings.recoilHorizontalOscillationSpeed,
        0.1,
        3,
        DEFAULT_SETTINGS.recoilHorizontalOscillationSpeed
      ),
      recoilIntensityOscillator: clampSetting(
        storedSettings.recoilIntensityOscillator,
        0,
        1.5,
        DEFAULT_SETTINGS.recoilIntensityOscillator
      ),
      recoilIntensityOscillationSpeed: clampSetting(
        storedSettings.recoilIntensityOscillationSpeed,
        0.1,
        2,
        DEFAULT_SETTINGS.recoilIntensityOscillationSpeed
      ),
      targetHorizontalSpeedMin: clampSetting(targetHorizontalSpeedMin, 0.1, 5, DEFAULT_SETTINGS.targetHorizontalSpeedMin),
      targetHorizontalSpeedMax: clampSetting(targetHorizontalSpeedMax, 0.1, 5, DEFAULT_SETTINGS.targetHorizontalSpeedMax),
      responseCurve: sanitizeResponseCurve(storedSettings.responseCurve),
      invertY: typeof storedSettings.invertY === 'boolean' ? storedSettings.invertY : DEFAULT_SETTINGS.invertY
    };
  } catch (error) {
    console.error('Failed to parse stored controller settings.', error);
    return {};
  }
}

function storeSettings() {
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      version: SETTINGS_STORAGE_VERSION,
      values: {
        lookSensitivity: SETTINGS.lookSensitivity,
        deadzone: SETTINGS.deadzone,
        fov: SETTINGS.fov,
        projectileRate: SETTINGS.projectileRate,
        bulletMagnetism: SETTINGS.bulletMagnetism,
        aimSlow: SETTINGS.aimSlow,
        aimStickiness: SETTINGS.aimStickiness,
        adsSnap: SETTINGS.adsSnap,
        showDebugShapes: SETTINGS.showDebugShapes,
        recoilYStrength: SETTINGS.recoilYStrength,
        recoilVariance: SETTINGS.recoilVariance,
        recoilHorizontalOscillationStrength: SETTINGS.recoilHorizontalOscillationStrength,
        recoilHorizontalOscillationSpeed: SETTINGS.recoilHorizontalOscillationSpeed,
        recoilIntensityOscillator: SETTINGS.recoilIntensityOscillator,
        recoilIntensityOscillationSpeed: SETTINGS.recoilIntensityOscillationSpeed,
        targetHorizontalSpeedMin: SETTINGS.targetHorizontalSpeedMin,
        targetHorizontalSpeedMax: SETTINGS.targetHorizontalSpeedMax,
        responseCurve: SETTINGS.responseCurve,
        invertY: SETTINGS.invertY
      }
    })
  );
}

function getStoredSettingsMap(parsed) {
  if (Array.isArray(parsed)) {
    return LEGACY_SETTINGS_ORDER.reduce((settingsMap, key, index) => {
      if (index < parsed.length) {
        settingsMap[key] = parsed[index];
      }

      return settingsMap;
    }, {});
  }

  if (parsed && typeof parsed === 'object' && parsed.values && typeof parsed.values === 'object' && !Array.isArray(parsed.values)) {
    return parsed.values;
  }

  if (parsed && typeof parsed === 'object') {
    return parsed;
  }

  return {};
}

function getCameraOrigin() {
  return camera.getWorldPosition(new THREE.Vector3());
}

function getCameraForward() {
  return camera.getWorldDirection(new THREE.Vector3()).normalize();
}

function updatePlayerVelocity(delta) {
  if (delta <= 0) {
    state.playerVelocity.set(0, 0, 0);
    return;
  }

  const currentCameraOrigin = getCameraOrigin();
  state.playerVelocity.copy(currentCameraOrigin).sub(previousCameraOrigin).divideScalar(delta);
  previousCameraOrigin.copy(currentCameraOrigin);
}

function getDirectAimTarget() {
  raycaster.setFromCamera(CENTER_SCREEN, camera);
  const intersections = raycaster.intersectObjects(targets, true);
  return intersections[0] ? getTargetRoot(intersections[0].object) : null;
}

function getTargetAimPoint(target, origin = getCameraOrigin(), direction = getCameraForward()) {
  const samplePoints = getTargetSamplePoints(target);
  let bestPoint = samplePoints[0];
  let bestAngle = Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const samplePoint of samplePoints) {
    const toPoint = samplePoint.clone().sub(origin);
    const distance = toPoint.length();
    if (distance <= 0.0001) {
      continue;
    }

    const angle = direction.angleTo(toPoint.clone().normalize());
    if (angle < bestAngle || (Math.abs(angle - bestAngle) < 0.0001 && distance < bestDistance)) {
      bestPoint = samplePoint;
      bestAngle = angle;
      bestDistance = distance;
    }
  }

  return bestPoint;
}

function getTargetSamplePoints(target) {
  return [
    target.localToWorld(target.userData.body.position.clone()),
    target.localToWorld(target.userData.head.position.clone())
  ];
}

function getNearestTargetInCone(origin, direction, maxAngle) {
  let nearestTarget = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestAngle = Number.POSITIVE_INFINITY;
  const normalizedDirection = direction.clone().normalize();

  for (const target of targets) {
    const toTarget = getTargetAimPoint(target, origin, normalizedDirection).sub(origin);
    const distance = toTarget.length();
    if (distance <= 0.0001 || distance > SETTINGS.projectileMaxDistance) {
      continue;
    }

    const angle = normalizedDirection.angleTo(toTarget.clone().normalize());
    if (angle > maxAngle) {
      continue;
    }

    if (distance < nearestDistance || (Math.abs(distance - nearestDistance) < 0.001 && angle < nearestAngle)) {
      nearestTarget = target;
      nearestDistance = distance;
      nearestAngle = angle;
    }
  }

  return nearestTarget;
}

function getNearestTargetInCylinder(origin, direction, radius, maxDistance) {
  let nearestTarget = null;
  let nearestAlongDistance = Number.POSITIVE_INFINITY;
  let nearestRadialDistance = Number.POSITIVE_INFINITY;
  const normalizedDirection = direction.clone().normalize();

  for (const target of targets) {
    const toTarget = getTargetAimPoint(target, origin, normalizedDirection).sub(origin);
    const alongDistance = toTarget.dot(normalizedDirection);
    if (alongDistance <= 0 || alongDistance > maxDistance) {
      continue;
    }

    const radialVector = toTarget.sub(normalizedDirection.clone().multiplyScalar(alongDistance));
    const radialDistance = radialVector.length();
    if (radialDistance > radius) {
      continue;
    }

    if (
      alongDistance < nearestAlongDistance ||
      (Math.abs(alongDistance - nearestAlongDistance) < 0.001 && radialDistance < nearestRadialDistance)
    ) {
      nearestTarget = target;
      nearestAlongDistance = alongDistance;
      nearestRadialDistance = radialDistance;
    }
  }

  return nearestTarget;
}

function nudgeAimTowardTarget(target, amount, adjustPitch = true) {
  const targetDirection = getTargetAimPoint(target, getCameraOrigin(), getCameraForward()).sub(getCameraOrigin()).normalize();
  const desiredYaw = Math.atan2(-targetDirection.x, -targetDirection.z);

  state.yaw += getShortestAngleDelta(state.yaw, desiredYaw) * amount;

  if (adjustPitch) {
    const desiredPitch = Math.asin(THREE.MathUtils.clamp(targetDirection.y, -1, 1));
    state.pitch = THREE.MathUtils.clamp(state.pitch + (desiredPitch - state.pitch) * amount, -0.85, 0.85);
  }
}

function getStickinessYawNudge(target, delta) {
  const origin = getCameraOrigin();
  const currentTargetPoint = getHorizontalStickinessPoint(getTargetAimPoint(target, origin, getCameraForward()), origin.y);
  const predictedTargetPoint = currentTargetPoint.clone().addScaledVector(getRelativeTargetVelocity(target), delta);
  const currentYaw = getYawToPoint(origin, currentTargetPoint);
  const predictedYaw = getYawToPoint(origin, predictedTargetPoint);
  return getShortestAngleDelta(currentYaw, predictedYaw);
}

function getRelativeTargetVelocity(target) {
  return target.userData.horizontalVelocity.clone().sub(state.playerVelocity.clone().setY(0)).setY(0);
}

function getHorizontalStickinessPoint(point, originY) {
  return new THREE.Vector3(point.x, originY, point.z);
}

function getYawToPoint(origin, point) {
  return Math.atan2(-(point.x - origin.x), -(point.z - origin.z));
}

function getShortestAngleDelta(fromAngle, toAngle) {
  return Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));
}

function clampSetting(value, min, max, fallback) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return THREE.MathUtils.clamp(value, min, max);
}

discoverController();
updateWeaponTransform();
updateCrosshair();
updateHud();
loop();
