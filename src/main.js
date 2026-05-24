import './style.css';
import * as THREE from 'three';

const SETTINGS_STORAGE_KEY = 'browser-controller-aim-trainer.settings';
const SETTINGS_STORAGE_VERSION = 3;

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
const MUZZLE_SCALE = new THREE.Vector3(1, 1, 1);
const TARGET_BODY_BASE_HEIGHT = 0.96;
const TARGET_HEAD_RADIUS = 0.18;
const CENTER_SCREEN = new THREE.Vector2(0, 0);
const BULLET_MAGNETISM_CONE_ANGLE = THREE.MathUtils.degToRad(1);
const ADS_SNAP_CYLINDER_RADIUS = 1;
const DEBUG_VISUAL_OFFSET = 0.2;
const LEGACY_TARGET_SPEED_MIN = 0.45;
const LEGACY_TARGET_SPEED_MAX = 1.8;
const DEFAULT_GAME_PROFILE_NAME = 'Marathon';
const DEFAULT_GUN_PROFILE_NAME = 'Overrun AR';
const CREATE_NEW_PROFILE_VALUE = '__create_new_profile__';
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
const GAME_SETTING_KEYS = [
  'lookSensitivity',
  'deadzone',
  'invertY',
  'fov',
  'responseCurve',
  'aimSlow',
  'aimStickiness',
  'adsSnap',
  'showDebugShapes',
  'targetHorizontalSpeedMin',
  'targetHorizontalSpeedMax',
  'targetCount',
  'targetRadius',
  'targetMaxHealth',
  'targetSpawnYVariance',
  'targetVerticalOscillationAmplitude',
  'targetVerticalOscillationSpeed',
  'spawnDistanceMin',
  'spawnDistanceMax',
  'targetLifetimeMin',
  'targetLifetimeMax',
  'adsFovMultiplier',
  'adsSensitivityMultiplier',
  'hipFireSpreadPx',
  'adsSpreadPx',
  'hipFireSpreadNdc',
  'adsSpreadNdc',
  'shotSpreadKickPx',
  'shotSpreadKickNdc',
  'projectileSpeed',
  'projectileMaxDistance'
];
const GUN_SETTING_KEYS = [
  'projectileRate',
  'bulletMagnetism',
  'recoilYStrength',
  'recoilVariance',
  'recoilHorizontalOscillationStrength',
  'recoilHorizontalOscillationSpeed',
  'recoilIntensityOscillator',
  'recoilIntensityOscillationSpeed'
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
  targetSpawnYVariance: 1.11,
  targetVerticalOscillationAmplitude: 0,
  targetVerticalOscillationSpeed: 1.5,
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

const profileState = loadProfileState();
const SETTINGS = createSettingsProxy(profileState);

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

const audioState = {
  context: null
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
      <div id="accuracy">Accuracy: 0%</div>
      <div id="hits">Hits: 0</div>
      <div id="misses">Misses: 0</div>
      <div id="score">Score (targets destroyed): 0</div>
      <div id="raw-stick">Raw stick: X 0.00 | Y 0.00</div>
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
    ${renderProfileSelect({
      id: 'game-profile-select',
      label: 'Game profile',
      options: getProfileOptions(getGameProfiles()),
      selectedValue: profileState.selectedGameProfileId,
      createLabel: 'Create new game...'
    })}
    <strong>Game settings</strong>
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
      id: 'target-spawn-y-variance',
      label: 'Target Y spawn variance',
      min: 0,
      max: 3,
      step: 0.05,
      value: SETTINGS.targetSpawnYVariance
    })}
    ${renderNumericControl({
      id: 'target-vertical-oscillation-amplitude',
      label: 'Target Y oscillation amp.',
      min: 0,
      max: 3,
      step: 0.05,
      value: SETTINGS.targetVerticalOscillationAmplitude
    })}
    ${renderNumericControl({
      id: 'target-vertical-oscillation-speed',
      label: 'Target Y oscillation speed',
      min: 0,
      max: 6,
      step: 0.05,
      value: SETTINGS.targetVerticalOscillationSpeed
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
    ${renderProfileSelect({
      id: 'gun-profile-select',
      label: 'Gun profile',
      options: getProfileOptions(getGunProfilesForCurrentGame()),
      selectedValue: profileState.selectedGunProfileId,
      createLabel: 'Create new gun...'
    })}
    <strong>Gun settings</strong>
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
floor.position.y = -0.12;
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
  hits: document.querySelector('#hits'),
  misses: document.querySelector('#misses'),
  rawStick: document.querySelector('#raw-stick'),
  crosshair: document.querySelector('#crosshair'),
  hudPanel: document.querySelector('#hud-panel'),
  settingsPanel: document.querySelector('#settings-panel'),
  controlsPanel: document.querySelector('#controls-panel'),
  gameProfileSelect: document.querySelector('#game-profile-select'),
  gunProfileSelect: document.querySelector('#gun-profile-select'),
  responseCurveInput: document.querySelector('#response-curve-input'),
  invertYInput: document.querySelector('#invert-y-input'),
  showDebugShapesInput: document.querySelector('#show-debug-shapes-input'),
  discoverControllerButton: document.querySelector('#discover-controller-button'),
  resetButton: document.querySelector('#reset-button')
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

window.addEventListener('pointerdown', unlockAudioOnInteraction, { passive: true });
window.addEventListener('keydown', unlockAudioOnInteraction);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

hudElements.resetButton.addEventListener('click', () => {
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
  id: 'target-spawn-y-variance',
  min: 0,
  max: 3,
  fallback: DEFAULT_SETTINGS.targetSpawnYVariance,
  onChange: (value) => {
    SETTINGS.targetSpawnYVariance = value;
    resetTargets();
  }
});

bindNumericSetting({
  id: 'target-vertical-oscillation-amplitude',
  min: 0,
  max: 3,
  fallback: DEFAULT_SETTINGS.targetVerticalOscillationAmplitude,
  onChange: (value) => {
    SETTINGS.targetVerticalOscillationAmplitude = value;
  }
});

bindNumericSetting({
  id: 'target-vertical-oscillation-speed',
  min: 0,
  max: 6,
  fallback: DEFAULT_SETTINGS.targetVerticalOscillationSpeed,
  onChange: (value) => {
    SETTINGS.targetVerticalOscillationSpeed = value;
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

hudElements.gameProfileSelect.addEventListener('change', (event) => {
  handleGameProfileSelection(event.target.value);
});

hudElements.gunProfileSelect.addEventListener('change', (event) => {
  handleGunProfileSelection(event.target.value);
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
  const firedThisFrame = updateFiring(delta, input.shootPressed);
  if (!firedThisFrame) {
    applyAimAssist(delta);
  }
  updateCamera();
  updateAimAssistDebugVisuals();
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
    return false;
  }

  const shotInterval = 1 / SETTINGS.projectileRate;
  let remainingShots = 4;
  let firedShots = 0;

  while (state.fireCooldown <= 0 && remainingShots > 0) {
    fireShot(delta);
    state.fireCooldown += shotInterval;
    remainingShots -= 1;
    firedShots += 1;
  }

  return firedShots > 0;
}

function fireShot(delta) {
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
  updateCamera();
  applyAimAssist(delta);
  updateCamera();

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
    getTriangleWave(step * SETTINGS.recoilIntensityOscillationSpeed) * SETTINGS.recoilIntensityOscillator;
  const intensityScale = Math.max(0, 1 + intensityOscillation);
  const expectedX =
    Math.sin(step * SETTINGS.recoilHorizontalOscillationSpeed) *
    SETTINGS.recoilHorizontalOscillationStrength *
    intensityScale;
  const varianceX = SETTINGS.recoilVariance <= 0 ? 0 : randomRange(-SETTINGS.recoilVariance, SETTINGS.recoilVariance);
  const varianceY = SETTINGS.recoilVariance <= 0 ? 0 : randomRange(-SETTINGS.recoilVariance, SETTINGS.recoilVariance);

  return new THREE.Vector2(
    expectedX + varianceX,
    Math.max(0, SETTINGS.recoilYStrength + varianceY)
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
  target.userData.verticalOscillationPhase = 0;
  target.userData.material = material;
  target.userData.totalHeight = TARGET_BODY_BASE_HEIGHT + TARGET_HEAD_RADIUS * 2;

  return target;
}

function applyHitToTarget(target) {
  state.hits += 1;
  target.userData.health -= 1;
  playHitTickSound();

  if (target.userData.health <= 0) {
    state.score += 1;
    respawnTarget(target);
    return;
  }

  applyTargetHealthVisuals(target);
}

function respawnTarget(target) {
  const distance = randomRange(SETTINGS.spawnDistanceMin, SETTINGS.spawnDistanceMax);
  const spawnBoxHalfWidth = (backWall.geometry.parameters.width * 0.32) / 2;
  const spawnBoxCenterX = camera.position.x;
  const worldPosition = new THREE.Vector3(
    randomRange(spawnBoxCenterX - spawnBoxHalfWidth, spawnBoxCenterX + spawnBoxHalfWidth),
    camera.position.y,
    camera.position.z - distance
  );
  if (Math.random() < 0.3) {
    worldPosition.y = target.userData.feetClearance;
  } else {
    worldPosition.y = randomRange(
      target.userData.feetClearance,
      target.userData.feetClearance + SETTINGS.targetSpawnYVariance
    );
  }

  const moveSpeed = getRandomTargetMoveSpeed();
  const horizontalVelocity = getHorizontalVelocity(moveSpeed, worldPosition.x, spawnBoxCenterX);

  target.userData.basePosition.copy(worldPosition);
  target.userData.horizontalVelocity.copy(horizontalVelocity);
  target.userData.moveSpeed = moveSpeed;
  target.userData.age = 0;
  target.userData.lifetime = randomRange(SETTINGS.targetLifetimeMin, SETTINGS.targetLifetimeMax);
  target.userData.verticalOscillationPhase = randomRange(0, Math.PI * 2);
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

  updateTargetPosition(target);

  applyTargetHealthVisuals(target);
}

function getRandomTargetMoveSpeed() {
  return randomRange(SETTINGS.targetHorizontalSpeedMin, SETTINGS.targetHorizontalSpeedMax);
}

function getHorizontalVelocity(moveSpeed, spawnX, centerX) {
  return new THREE.Vector3(spawnX >= centerX ? -moveSpeed : moveSpeed, 0, 0);
}

function getTargetVerticalOffset(target) {
  if (SETTINGS.targetVerticalOscillationAmplitude <= 0 || SETTINGS.targetVerticalOscillationSpeed <= 0) {
    return 0;
  }

  return (
    Math.sin(target.userData.age * SETTINGS.targetVerticalOscillationSpeed + target.userData.verticalOscillationPhase) *
    SETTINGS.targetVerticalOscillationAmplitude
  );
}

function updateTargetPosition(target) {
  target.position.copy(target.userData.basePosition);
  target.position.y = Math.max(
    target.userData.basePosition.y + getTargetVerticalOffset(target),
    target.userData.feetClearance
  );
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
    updateTargetPosition(target);

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
  const misses = Math.max(0, state.shots - state.hits);

  hudElements.gamepadStatus.textContent = `Controller: ${state.gamepadName}`;
  hudElements.modeStatus.textContent = `Aim mode: ${state.isAimingDownSights ? 'ADS' : 'HIP FIRE'}`;
  hudElements.curveStatus.textContent = `Curve: ${getResponseCurveLabel(SETTINGS.responseCurve)}`;
  hudElements.recoilStatus.textContent = `Recoil: Y ${SETTINGS.recoilYStrength.toFixed(2)} | Var ${SETTINGS.recoilVariance.toFixed(2)} | Osc ${SETTINGS.recoilHorizontalOscillationStrength.toFixed(2)} @ ${SETTINGS.recoilHorizontalOscillationSpeed.toFixed(2)} | Int ${SETTINGS.recoilIntensityOscillator.toFixed(2)} @ ${SETTINGS.recoilIntensityOscillationSpeed.toFixed(2)}`;
  hudElements.accuracy.textContent = `Accuracy: ${accuracy}%`;
  hudElements.hits.textContent = `Hits: ${state.hits}`;
  hudElements.misses.textContent = `Misses: ${misses}`;
  hudElements.score.textContent = `Score (targets destroyed): ${state.score}`;
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

function renderProfileSelect({ id, label, options, selectedValue, createLabel }) {
  return `
    <label class="control-group" for="${id}">
      <span>${label}</span>
      <select id="${id}">
        ${renderProfileOptions(options, selectedValue, createLabel)}
      </select>
    </label>
  `;
}

function renderOptions(options, selectedValue) {
  return options
    .map((option) => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`)
    .join('');
}

function renderProfileOptions(options, selectedValue, createLabel) {
  return `${renderOptions(options, selectedValue)}<option value="${CREATE_NEW_PROFILE_VALUE}">${createLabel}</option>`;
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

function getAudioContext() {
  if (audioState.context) {
    return audioState.context;
  }

  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  audioState.context = new AudioContextCtor();
  return audioState.context;
}

async function ensureAudioReady() {
  const context = getAudioContext();
  if (!context) {
    return null;
  }

  if (context.state === 'suspended') {
    await context.resume();
  }

  return context.state === 'running' ? context : null;
}

function unlockAudioOnInteraction() {
  void ensureAudioReady();
}

function playHitTickSound() {
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(1500, now);
  oscillator.frequency.exponentialRampToValueAtTime(950, now + 0.05);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.value = 2.5;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.015, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.055);
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect();
    filter.disconnect();
    gain.disconnect();
  });
}

function sanitizeResponseCurve(value) {
  return RESPONSE_CURVE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SETTINGS.responseCurve;
}

function createSettingsProxy() {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (GAME_SETTING_KEYS.includes(property)) {
          return getCurrentGameProfile().settings[property];
        }

        if (GUN_SETTING_KEYS.includes(property)) {
          return getCurrentGunProfile().settings[property];
        }

        return undefined;
      },
      set(_target, property, value) {
        if (typeof property !== 'string') {
          return false;
        }

        if (GAME_SETTING_KEYS.includes(property)) {
          getCurrentGameProfile().settings[property] = value;
          return true;
        }

        if (GUN_SETTING_KEYS.includes(property)) {
          getCurrentGunProfile().settings[property] = value;
          return true;
        }

        return false;
      },
      ownKeys() {
        return [...GAME_SETTING_KEYS, ...GUN_SETTING_KEYS];
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
      }
    }
  );
}

function loadProfileState() {
  const storedValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!storedValue) {
    return createDefaultProfileState(DEFAULT_SETTINGS);
  }

  try {
    const parsed = JSON.parse(storedValue);
    if (parsed?.version === SETTINGS_STORAGE_VERSION && parsed?.gameProfiles) {
      return sanitizeProfileState(parsed);
    }

    return createDefaultProfileState(getLegacyStoredSettingsMap(parsed));
  } catch (error) {
    console.error('Failed to parse stored controller settings.', error);
    return createDefaultProfileState(DEFAULT_SETTINGS);
  }
}

function storeSettings() {
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      version: SETTINGS_STORAGE_VERSION,
      selectedGameProfileId: profileState.selectedGameProfileId,
      selectedGunProfileId: profileState.selectedGunProfileId,
      gameProfiles: profileState.gameProfiles
    })
  );
}

function getLegacyStoredSettingsMap(parsed) {
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

function sanitizeProfileState(rawProfileState) {
  const gameProfiles = {};
  for (const [gameId, gameProfile] of Object.entries(rawProfileState.gameProfiles ?? {})) {
    const gunProfiles = {};
    for (const [gunId, gunProfile] of Object.entries(gameProfile.gunProfiles ?? {})) {
      gunProfiles[gunId] = {
        id: gunId,
        name: sanitizeProfileName(gunProfile.name, DEFAULT_GUN_PROFILE_NAME),
        settings: sanitizeGunSettings(gunProfile.settings ?? {})
      };
    }

    if (Object.keys(gunProfiles).length === 0) {
      const defaultGunId = createProfileId(DEFAULT_GUN_PROFILE_NAME, []);
      gunProfiles[defaultGunId] = {
        id: defaultGunId,
        name: DEFAULT_GUN_PROFILE_NAME,
        settings: sanitizeGunSettings(DEFAULT_SETTINGS)
      };
    }

    gameProfiles[gameId] = {
      id: gameId,
      name: sanitizeProfileName(gameProfile.name, DEFAULT_GAME_PROFILE_NAME),
      settings: sanitizeGameSettings(gameProfile.settings ?? {}),
      gunProfiles
    };
  }

  if (Object.keys(gameProfiles).length === 0) {
    return createDefaultProfileState(DEFAULT_SETTINGS);
  }

  const selectedGameProfileId = gameProfiles[rawProfileState.selectedGameProfileId]
    ? rawProfileState.selectedGameProfileId
    : Object.keys(gameProfiles)[0];
  const selectedGunProfileId = gameProfiles[selectedGameProfileId].gunProfiles[rawProfileState.selectedGunProfileId]
    ? rawProfileState.selectedGunProfileId
    : Object.keys(gameProfiles[selectedGameProfileId].gunProfiles)[0];

  return { selectedGameProfileId, selectedGunProfileId, gameProfiles };
}

function createDefaultProfileState(flatSettings) {
  const gameId = createProfileId(DEFAULT_GAME_PROFILE_NAME, []);
  const gunId = createProfileId(DEFAULT_GUN_PROFILE_NAME, []);
  return {
    selectedGameProfileId: gameId,
    selectedGunProfileId: gunId,
    gameProfiles: {
      [gameId]: {
        id: gameId,
        name: DEFAULT_GAME_PROFILE_NAME,
        settings: sanitizeGameSettings(flatSettings),
        gunProfiles: {
          [gunId]: {
            id: gunId,
            name: DEFAULT_GUN_PROFILE_NAME,
            settings: sanitizeGunSettings(flatSettings)
          }
        }
      }
    }
  };
}

function sanitizeGameSettings(rawSettings) {
  const legacySphereSpeed = clampSetting(rawSettings.sphereSpeed, 0.4, 2.5, 1.35);
  const targetHorizontalSpeedMin =
    typeof rawSettings.targetHorizontalSpeedMin === 'number'
      ? rawSettings.targetHorizontalSpeedMin
      : LEGACY_TARGET_SPEED_MIN * legacySphereSpeed;
  const targetHorizontalSpeedMax =
    typeof rawSettings.targetHorizontalSpeedMax === 'number'
      ? rawSettings.targetHorizontalSpeedMax
      : LEGACY_TARGET_SPEED_MAX * legacySphereSpeed;

  return {
    lookSensitivity: clampSetting(rawSettings.lookSensitivity, 1, 10, DEFAULT_SETTINGS.lookSensitivity),
    deadzone: clampSetting(rawSettings.deadzone, 0, 0.35, DEFAULT_SETTINGS.deadzone),
    invertY: typeof rawSettings.invertY === 'boolean' ? rawSettings.invertY : DEFAULT_SETTINGS.invertY,
    fov: clampSetting(rawSettings.fov, 50, 110, DEFAULT_SETTINGS.fov),
    responseCurve: sanitizeResponseCurve(rawSettings.responseCurve),
    aimSlow: clampSetting(rawSettings.aimSlow, 0, 1, DEFAULT_SETTINGS.aimSlow),
    aimStickiness: clampSetting(rawSettings.aimStickiness, 0, 1, DEFAULT_SETTINGS.aimStickiness),
    adsSnap: clampSetting(rawSettings.adsSnap, 0, 1, DEFAULT_SETTINGS.adsSnap),
    showDebugShapes:
      typeof rawSettings.showDebugShapes === 'boolean' ? rawSettings.showDebugShapes : DEFAULT_SETTINGS.showDebugShapes,
    targetHorizontalSpeedMin: clampSetting(targetHorizontalSpeedMin, 0.1, 5, DEFAULT_SETTINGS.targetHorizontalSpeedMin),
    targetHorizontalSpeedMax: clampSetting(targetHorizontalSpeedMax, 0.1, 5, DEFAULT_SETTINGS.targetHorizontalSpeedMax),
    targetCount: clampSetting(rawSettings.targetCount, 1, 32, DEFAULT_SETTINGS.targetCount),
    targetRadius: clampSetting(rawSettings.targetRadius, 0.1, 2, DEFAULT_SETTINGS.targetRadius),
    targetMaxHealth: clampSetting(rawSettings.targetMaxHealth, 1, 100, DEFAULT_SETTINGS.targetMaxHealth),
    targetSpawnYVariance: clampSetting(rawSettings.targetSpawnYVariance, 0, 3, DEFAULT_SETTINGS.targetSpawnYVariance),
    targetVerticalOscillationAmplitude: clampSetting(
      rawSettings.targetVerticalOscillationAmplitude,
      0,
      3,
      DEFAULT_SETTINGS.targetVerticalOscillationAmplitude
    ),
    targetVerticalOscillationSpeed: clampSetting(
      rawSettings.targetVerticalOscillationSpeed,
      0,
      6,
      DEFAULT_SETTINGS.targetVerticalOscillationSpeed
    ),
    spawnDistanceMin: clampSetting(rawSettings.spawnDistanceMin, 1, 60, DEFAULT_SETTINGS.spawnDistanceMin),
    spawnDistanceMax: clampSetting(rawSettings.spawnDistanceMax, 1, 120, DEFAULT_SETTINGS.spawnDistanceMax),
    targetLifetimeMin: clampSetting(rawSettings.targetLifetimeMin, 1, 60, DEFAULT_SETTINGS.targetLifetimeMin),
    targetLifetimeMax: clampSetting(rawSettings.targetLifetimeMax, 1, 60, DEFAULT_SETTINGS.targetLifetimeMax),
    adsFovMultiplier: clampSetting(rawSettings.adsFovMultiplier, 0.2, 1, DEFAULT_SETTINGS.adsFovMultiplier),
    adsSensitivityMultiplier: clampSetting(rawSettings.adsSensitivityMultiplier, 0.1, 1, DEFAULT_SETTINGS.adsSensitivityMultiplier),
    hipFireSpreadPx: clampSetting(rawSettings.hipFireSpreadPx, 0, 100, DEFAULT_SETTINGS.hipFireSpreadPx),
    adsSpreadPx: clampSetting(rawSettings.adsSpreadPx, 0, 100, DEFAULT_SETTINGS.adsSpreadPx),
    hipFireSpreadNdc: clampSetting(rawSettings.hipFireSpreadNdc, 0, 0.2, DEFAULT_SETTINGS.hipFireSpreadNdc),
    adsSpreadNdc: clampSetting(rawSettings.adsSpreadNdc, 0, 0.2, DEFAULT_SETTINGS.adsSpreadNdc),
    shotSpreadKickPx: clampSetting(rawSettings.shotSpreadKickPx, 0, 100, DEFAULT_SETTINGS.shotSpreadKickPx),
    shotSpreadKickNdc: clampSetting(rawSettings.shotSpreadKickNdc, 0, 0.2, DEFAULT_SETTINGS.shotSpreadKickNdc),
    projectileSpeed: clampSetting(rawSettings.projectileSpeed, 1, 500, DEFAULT_SETTINGS.projectileSpeed),
    projectileMaxDistance: clampSetting(rawSettings.projectileMaxDistance, 1, 200, DEFAULT_SETTINGS.projectileMaxDistance)
  };
}

function sanitizeGunSettings(rawSettings) {
  return {
    projectileRate: clampSetting(rawSettings.projectileRate, 1, 15, DEFAULT_SETTINGS.projectileRate),
    bulletMagnetism: clampSetting(rawSettings.bulletMagnetism, 0, 1, DEFAULT_SETTINGS.bulletMagnetism),
    recoilYStrength: clampSetting(
      rawSettings.recoilYStrength ?? rawSettings.recoilPatternStrength ?? rawSettings.sprayPatternStrength,
      0.05,
      2.5,
      DEFAULT_SETTINGS.recoilYStrength
    ),
    recoilVariance: clampSetting(rawSettings.recoilVariance, 0, 10, DEFAULT_SETTINGS.recoilVariance),
    recoilHorizontalOscillationStrength: clampSetting(
      rawSettings.recoilHorizontalOscillationStrength,
      0,
      5,
      DEFAULT_SETTINGS.recoilHorizontalOscillationStrength
    ),
    recoilHorizontalOscillationSpeed: clampSetting(
      rawSettings.recoilHorizontalOscillationSpeed,
      0.1,
      3,
      DEFAULT_SETTINGS.recoilHorizontalOscillationSpeed
    ),
    recoilIntensityOscillator: clampSetting(
      rawSettings.recoilIntensityOscillator,
      0,
      1.5,
      DEFAULT_SETTINGS.recoilIntensityOscillator
    ),
    recoilIntensityOscillationSpeed: clampSetting(
      rawSettings.recoilIntensityOscillationSpeed,
      0.1,
      2,
      DEFAULT_SETTINGS.recoilIntensityOscillationSpeed
    )
  };
}

function getGameProfiles() {
  return Object.values(profileState.gameProfiles);
}

function getCurrentGameProfile() {
  if (!profileState.gameProfiles[profileState.selectedGameProfileId]) {
    profileState.selectedGameProfileId = Object.keys(profileState.gameProfiles)[0];
  }

  return profileState.gameProfiles[profileState.selectedGameProfileId];
}

function getGunProfilesForCurrentGame() {
  return Object.values(getCurrentGameProfile().gunProfiles);
}

function getCurrentGunProfile() {
  const currentGameProfile = getCurrentGameProfile();
  if (!currentGameProfile.gunProfiles[profileState.selectedGunProfileId]) {
    profileState.selectedGunProfileId = Object.keys(currentGameProfile.gunProfiles)[0];
  }

  return currentGameProfile.gunProfiles[profileState.selectedGunProfileId];
}

function getProfileOptions(profiles) {
  return profiles.map((profile) => ({ value: profile.id, label: profile.name }));
}

function handleGameProfileSelection(selectedValue) {
  if (selectedValue === CREATE_NEW_PROFILE_VALUE) {
    createGameProfileFromPrompt();
    return;
  }

  profileState.selectedGameProfileId = selectedValue;
  profileState.selectedGunProfileId = Object.keys(getCurrentGameProfile().gunProfiles)[0];
  syncProfileUi();
  resetTargets();
  storeSettings();
}

function handleGunProfileSelection(selectedValue) {
  if (selectedValue === CREATE_NEW_PROFILE_VALUE) {
    createGunProfileFromPrompt();
    return;
  }

  profileState.selectedGunProfileId = selectedValue;
  syncProfileUi();
  storeSettings();
}

function createGameProfileFromPrompt() {
  const name = window.prompt('Enter a name for the new game profile:', DEFAULT_GAME_PROFILE_NAME)?.trim();
  if (!name) {
    syncProfileSelectors();
    return;
  }

  const gameId = createProfileId(name, Object.keys(profileState.gameProfiles));
  const currentGameProfile = getCurrentGameProfile();
  const currentGunProfile = getCurrentGunProfile();
  const gunId = createProfileId(currentGunProfile.name, []);
  profileState.gameProfiles[gameId] = {
    id: gameId,
    name,
    settings: { ...currentGameProfile.settings },
    gunProfiles: {
      [gunId]: {
        id: gunId,
        name: currentGunProfile.name,
        settings: { ...currentGunProfile.settings }
      }
    }
  };
  profileState.selectedGameProfileId = gameId;
  profileState.selectedGunProfileId = gunId;
  syncProfileUi();
  resetTargets();
  storeSettings();
}

function createGunProfileFromPrompt() {
  const name = window.prompt('Enter a name for the new gun profile:', DEFAULT_GUN_PROFILE_NAME)?.trim();
  if (!name) {
    syncProfileSelectors();
    return;
  }

  const currentGameProfile = getCurrentGameProfile();
  const gunId = createProfileId(name, Object.keys(currentGameProfile.gunProfiles));
  currentGameProfile.gunProfiles[gunId] = {
    id: gunId,
    name,
    settings: { ...getCurrentGunProfile().settings }
  };
  profileState.selectedGunProfileId = gunId;
  syncProfileUi();
  storeSettings();
}

function syncProfileUi() {
  syncProfileSelectors();
  syncSettingControls();
}

function syncProfileSelectors() {
  hudElements.gameProfileSelect.innerHTML = renderProfileOptions(
    getProfileOptions(getGameProfiles()),
    profileState.selectedGameProfileId,
    'Create new game...'
  );
  hudElements.gunProfileSelect.innerHTML = renderProfileOptions(
    getProfileOptions(getGunProfilesForCurrentGame()),
    profileState.selectedGunProfileId,
    'Create new gun...'
  );
  hudElements.gameProfileSelect.value = profileState.selectedGameProfileId;
  hudElements.gunProfileSelect.value = profileState.selectedGunProfileId;
}

function syncSettingControls() {
  setNumericControlValue('sensitivity', SETTINGS.lookSensitivity);
  setNumericControlValue('deadzone', SETTINGS.deadzone);
  setNumericControlValue('fov', SETTINGS.fov);
  setNumericControlValue('projectile-rate', SETTINGS.projectileRate);
  setNumericControlValue('bullet-magnetism', SETTINGS.bulletMagnetism);
  setNumericControlValue('aim-slow', SETTINGS.aimSlow);
  setNumericControlValue('aim-stickiness', SETTINGS.aimStickiness);
  setNumericControlValue('ads-snap', SETTINGS.adsSnap);
  setNumericControlValue('target-speed-min', SETTINGS.targetHorizontalSpeedMin);
  setNumericControlValue('target-speed-max', SETTINGS.targetHorizontalSpeedMax);
  setNumericControlValue('target-spawn-y-variance', SETTINGS.targetSpawnYVariance);
  setNumericControlValue('target-vertical-oscillation-amplitude', SETTINGS.targetVerticalOscillationAmplitude);
  setNumericControlValue('target-vertical-oscillation-speed', SETTINGS.targetVerticalOscillationSpeed);
  setNumericControlValue('recoil-y-strength', SETTINGS.recoilYStrength);
  setNumericControlValue('recoil-variance', SETTINGS.recoilVariance);
  setNumericControlValue('recoil-horizontal-oscillation', SETTINGS.recoilHorizontalOscillationStrength);
  setNumericControlValue('recoil-horizontal-oscillation-speed', SETTINGS.recoilHorizontalOscillationSpeed);
  setNumericControlValue('recoil-intensity-oscillator', SETTINGS.recoilIntensityOscillator);
  setNumericControlValue('recoil-intensity-oscillation-speed', SETTINGS.recoilIntensityOscillationSpeed);
  hudElements.responseCurveInput.value = SETTINGS.responseCurve;
  hudElements.invertYInput.checked = SETTINGS.invertY;
  hudElements.showDebugShapesInput.checked = SETTINGS.showDebugShapes;
}

function sanitizeProfileName(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function createProfileId(name, existingIds) {
  const baseId = sanitizeProfileName(name, 'profile')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'profile';
  let profileId = baseId;
  let suffix = 2;

  while (existingIds.includes(profileId)) {
    profileId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return profileId;
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

function getTriangleWave(value) {
  const normalizedCycle = ((value / (Math.PI * 2)) + 0.25) % 1;
  return 1 - 4 * Math.abs(normalizedCycle - 0.5);
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
