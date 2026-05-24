import './style.css';
import * as THREE from 'three';

const SETTINGS_STORAGE_KEY = 'browser-controller-aim-trainer.settings';

const RESPONSE_CURVE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'inverse-s', label: 'Inverse S' }
];

const SPRAY_PATTERN_OPTIONS = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'zigzag', label: 'Zigzag' },
  { value: 'spiral', label: 'Spiral' }
];

const FULL_HEALTH_COLOR = new THREE.Color(0x2fd66b);
const LOW_HEALTH_COLOR = new THREE.Color(0xff4d6d);
const FULL_HEALTH_EMISSIVE = new THREE.Color(0x07150d);
const LOW_HEALTH_EMISSIVE = new THREE.Color(0x2a050a);
const PROJECTILE_UP_AXIS = new THREE.Vector3(0, 1, 0);

const DEFAULT_SETTINGS = {
  lookSensitivity: 2.8,
  deadzone: 0.12,
  invertY: false,
  fov: 75,
  responseCurve: 'linear',
  projectileRate: 14,
  sprayPatternShape: 'vertical',
  sprayPatternStrength: 0.45,
  sphereSpeed: 1.35,
  targetCount: 8,
  targetRadius: 0.45,
  targetMaxHealth: 4,
  spawnDistanceMin: 9,
  spawnDistanceMax: 16,
  targetLifetimeMin: 6,
  targetLifetimeMax: 9,
  targetHorizontalSpeedMin: 0.6,
  targetHorizontalSpeedMax: 1.2,
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
  isAimingDownSights: false,
  aimBlend: 0,
  spreadKick: 0,
  weaponKick: 0,
  fireCooldown: 0,
  sprayShotIndex: 0,
  recoilPatternX: 0,
  recoilPatternY: 0
};

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="hud-panel hud edge-panel" id="hud-panel" data-side="left">
    <button
      class="panel-toggle"
      id="hud-panel-toggle"
      type="button"
      aria-expanded="true"
      aria-label="Collapse Controller Aim Trainer panel"
    >
      <span aria-hidden="true">‹</span>
    </button>
    <strong>Controller Aim Trainer</strong>
    <div id="gamepad-status">Controller: ${state.gamepadName}</div>
    <div id="mode-status">Aim mode: HIP FIRE</div>
    <div id="curve-status">Curve: ${getResponseCurveLabel(SETTINGS.responseCurve)}</div>
    <div id="spray-status">Spray pattern: ${getSprayPatternLabel(SETTINGS.sprayPatternShape)}</div>
    <div id="score">Score: 0</div>
    <div id="accuracy">Accuracy: 0%</div>
    <div id="shots">Shots: 0 | Hits: 0</div>
    <div id="raw-stick">Raw stick: X 0.00 | Y 0.00</div>
  </div>
  <div class="crosshair" id="crosshair" aria-hidden="true">
    <span class="crosshair-dot"></span>
    <span class="crosshair-tick crosshair-tick-top"></span>
    <span class="crosshair-tick crosshair-tick-right"></span>
    <span class="crosshair-tick crosshair-tick-bottom"></span>
    <span class="crosshair-tick crosshair-tick-left"></span>
  </div>
  <div class="hud-panel settings-panel edge-panel" id="settings-panel" data-side="right">
    <button
      class="panel-toggle"
      id="settings-panel-toggle"
      type="button"
      aria-expanded="true"
      aria-label="Collapse Controller settings panel"
    >
      <span aria-hidden="true">›</span>
    </button>
    <strong>Controller settings</strong>
    ${renderNumericControl({
      id: 'sensitivity',
      label: 'Sensitivity',
      min: 0.5,
      max: 6,
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
      id: 'sphere-speed',
      label: 'Sphere speed',
      min: 0.4,
      max: 2.5,
      step: 0.05,
      value: SETTINGS.sphereSpeed
    })}
    ${renderNumericControl({
      id: 'spray-strength',
      label: 'Spray strength',
      min: 0.05,
      max: 1.2,
      step: 0.05,
      value: SETTINGS.sprayPatternStrength
    })}
    <label class="control-group" for="response-curve-input">
      <span>Response curve</span>
      <select id="response-curve-input">
        ${renderOptions(RESPONSE_CURVE_OPTIONS, SETTINGS.responseCurve)}
      </select>
    </label>
    <label class="control-group" for="spray-pattern-input">
      <span>Spray pattern</span>
      <select id="spray-pattern-input">
        ${renderOptions(SPRAY_PATTERN_OPTIONS, SETTINGS.sprayPatternShape)}
      </select>
    </label>
    <label class="checkbox-row" for="invert-y-input">
      <input id="invert-y-input" type="checkbox" ${SETTINGS.invertY ? 'checked' : ''} />
      <span>Invert Y</span>
    </label>
  </div>
  <div class="hud-panel instructions edge-panel" id="controls-panel" data-side="left">
    <button
      class="panel-toggle"
      id="controls-panel-toggle"
      type="button"
      aria-expanded="true"
      aria-label="Collapse Controls panel"
    >
      <span aria-hidden="true">‹</span>
    </button>
    <div><strong>Controls</strong></div>
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
`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 18, 40);

const camera = new THREE.PerspectiveCamera(SETTINGS.fov, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 0);
scene.add(camera);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x223355, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
directionalLight.position.set(3, 8, 4);
directionalLight.castShadow = true;
scene.add(directionalLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 60),
  new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.75 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.z = -20;
floor.receiveShadow = true;
scene.add(floor);

const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 8),
  new THREE.MeshStandardMaterial({ color: 0x182039, roughness: 0.8 })
);
backWall.position.set(0, 4, -22);
backWall.receiveShadow = true;
scene.add(backWall);

const weapon = createWeaponModel();
camera.add(weapon);

const targets = [];
const projectiles = [];
const targetGeometry = new THREE.SphereGeometry(SETTINGS.targetRadius, 32, 32);
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
  sprayStatus: document.querySelector('#spray-status'),
  score: document.querySelector('#score'),
  accuracy: document.querySelector('#accuracy'),
  shots: document.querySelector('#shots'),
  rawStick: document.querySelector('#raw-stick'),
  crosshair: document.querySelector('#crosshair'),
  hudPanel: document.querySelector('#hud-panel'),
  settingsPanel: document.querySelector('#settings-panel'),
  controlsPanel: document.querySelector('#controls-panel'),
  responseCurveInput: document.querySelector('#response-curve-input'),
  sprayPatternInput: document.querySelector('#spray-pattern-input'),
  invertYInput: document.querySelector('#invert-y-input'),
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
  state.sprayShotIndex = 0;
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
  min: 0.5,
  max: 6,
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
  id: 'sphere-speed',
  min: 0.4,
  max: 2.5,
  fallback: DEFAULT_SETTINGS.sphereSpeed,
  onChange: (value) => {
    SETTINGS.sphereSpeed = value;
  }
});

bindNumericSetting({
  id: 'spray-strength',
  min: 0.05,
  max: 1.2,
  fallback: DEFAULT_SETTINGS.sprayPatternStrength,
  onChange: (value) => {
    SETTINGS.sprayPatternStrength = value;
  }
});

hudElements.responseCurveInput.addEventListener('change', (event) => {
  SETTINGS.responseCurve = sanitizeResponseCurve(event.target.value);
  storeSettings();
});

hudElements.sprayPatternInput.addEventListener('change', (event) => {
  SETTINGS.sprayPatternShape = sanitizeSprayPattern(event.target.value);
  storeSettings();
});

hudElements.invertYInput.addEventListener('change', (event) => {
  SETTINGS.invertY = event.target.checked;
  storeSettings();
});

initializePanelToggles();

function loop() {
  const delta = clock.getDelta();
  const input = getInputState();

  updateAimState(delta, input.adsPressed, input.shootPressed);
  applyLookInput(input.lookX, input.lookY, delta);
  updateCamera();
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

  const pad = getActiveGamepad();
  if (pad) {
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

  return { lookX, lookY, shootPressed, adsPressed };
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

function applyLookInput(lookX, lookY, delta) {
  const sensitivityMultiplier = THREE.MathUtils.lerp(1, SETTINGS.adsSensitivityMultiplier, state.aimBlend);
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
    state.sprayShotIndex = 0;
  }
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

  const sprayPoint = getSprayPatternPoint(state.sprayShotIndex);
  const shotOffset = getShotOffset(sprayPoint.clone());
  state.sprayShotIndex += 1;

  state.spreadKick = Math.min(state.spreadKick + (state.isAimingDownSights ? 0.35 : 1), 3);
  state.weaponKick = Math.min(state.weaponKick + (state.isAimingDownSights ? 0.35 : 0.7), 1.2);
  state.recoilPatternX = THREE.MathUtils.clamp(
    state.recoilPatternX + sprayPoint.x * SETTINGS.sprayPatternStrength * 0.08,
    -1.5,
    1.5
  );
  state.recoilPatternY = THREE.MathUtils.clamp(
    state.recoilPatternY + sprayPoint.y * SETTINGS.sprayPatternStrength * 0.06,
    0,
    2
  );

  raycaster.setFromCamera(shotOffset, camera);
  const intersections = raycaster.intersectObjects(targets, false);
  const hitPoint = intersections[0]?.point ?? getMissPoint();

  if (intersections.length > 0) {
    applyHitToTarget(intersections[0].object);
  }

  createProjectileVisual(getProjectileStart(), hitPoint);
}

function getMissPoint() {
  return raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(SETTINGS.projectileMaxDistance));
}

function getProjectileStart() {
  return weapon.localToWorld(new THREE.Vector3(0.01, -0.01, -1.12));
}

function getShotOffset(sprayPoint) {
  const randomOffset = getRandomSpreadOffset();
  const patternScale = SETTINGS.sprayPatternStrength * THREE.MathUtils.lerp(0.0028, 0.0012, state.aimBlend);

  return randomOffset.add(sprayPoint.multiplyScalar(patternScale));
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

function getSprayPatternPoint(shotIndex) {
  const step = shotIndex + 1;

  switch (SETTINGS.sprayPatternShape) {
    case 'zigzag':
      return new THREE.Vector2(
        (step % 2 === 0 ? -1 : 1) * Math.min(0.3 + step * 0.08, 1.4),
        0.35 + step * 0.16
      );
    case 'spiral': {
      const radius = Math.min(0.25 + step * 0.07, 1.35);
      const angle = step * 0.8;
      return new THREE.Vector2(Math.cos(angle) * radius, 0.25 + step * 0.12 + Math.sin(angle) * radius * 0.25);
    }
    case 'vertical':
    default:
      return new THREE.Vector2(Math.sin(step * 0.4) * Math.min(0.18 + step * 0.03, 0.55), 0.3 + step * 0.16);
  }
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

  const target = new THREE.Mesh(targetGeometry, material);
  target.castShadow = true;
  target.userData.maxHealth = SETTINGS.targetMaxHealth;
  target.userData.health = SETTINGS.targetMaxHealth;
  target.userData.basePosition = new THREE.Vector3();
  target.userData.horizontalVelocity = new THREE.Vector3();
  target.userData.age = 0;
  target.userData.lifetime = SETTINGS.targetLifetimeMax;

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
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
  const halfWidth = halfHeight * camera.aspect;
  const localPosition = new THREE.Vector3(
    randomRange(-halfWidth * 0.55, halfWidth * 0.55),
    randomRange(-halfHeight * 0.2, halfHeight * 0.35),
    -distance
  );
  const worldPosition = camera.localToWorld(localPosition.clone());
  const horizontalVelocity = getHorizontalVelocity();

  target.userData.basePosition.copy(worldPosition);
  target.userData.horizontalVelocity.copy(horizontalVelocity);
  target.userData.age = 0;
  target.userData.lifetime = randomRange(SETTINGS.targetLifetimeMin, SETTINGS.targetLifetimeMax);
  target.userData.health = target.userData.maxHealth;
  target.userData.rotationSpeed = randomRange(0.8, 1.6);

  target.position.copy(worldPosition);
  target.scale.setScalar(randomRange(0.85, 1.2));

  applyTargetHealthVisuals(target);
}

function getHorizontalVelocity() {
  const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  direction.y = 0;

  if (direction.lengthSq() < 0.0001) {
    direction.set(1, 0, 0);
  } else {
    direction.normalize();
  }

  return direction.multiplyScalar(
    randomRange(SETTINGS.targetHorizontalSpeedMin, SETTINGS.targetHorizontalSpeedMax) *
      SETTINGS.sphereSpeed *
      (Math.random() < 0.5 ? -1 : 1)
  );
}

function resetTargets() {
  for (const target of targets) {
    respawnTarget(target);
  }
}

function applyTargetHealthVisuals(target) {
  const healthRatio = target.userData.health / target.userData.maxHealth;

  target.material.color.lerpColors(LOW_HEALTH_COLOR, FULL_HEALTH_COLOR, healthRatio);
  target.material.emissive.lerpColors(LOW_HEALTH_EMISSIVE, FULL_HEALTH_EMISSIVE, healthRatio);
}

function updateTargets(delta) {
  for (const target of targets) {
    target.userData.age += delta;
    target.userData.basePosition.addScaledVector(target.userData.horizontalVelocity, delta);
    target.position.copy(target.userData.basePosition);
    target.rotation.y += delta * target.userData.rotationSpeed;

    if (target.userData.age >= target.userData.lifetime) {
      respawnTarget(target);
    }
  }
}

function createWeaponModel() {
  const rifle = new THREE.Group();

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111722, roughness: 0.8, metalness: 0.15 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3f57, roughness: 0.55, metalness: 0.2 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.52), darkMaterial);
  receiver.position.set(0, -0.02, -0.24);
  rifle.add(receiver);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.2), accentMaterial);
  stock.position.set(-0.01, -0.02, 0.08);
  rifle.add(stock);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.26), accentMaterial);
  handguard.position.set(0.01, -0.015, -0.62);
  rifle.add(handguard);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.52, 12), darkMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.01, -0.01, -0.86);
  rifle.add(barrel);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.16), accentMaterial);
  sight.position.set(0.01, 0.08, -0.3);
  rifle.add(sight);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.08), darkMaterial);
  grip.position.set(0.03, -0.14, -0.1);
  grip.rotation.x = -0.25;
  rifle.add(grip);

  return rifle;
}

function updateWeaponTransform() {
  weapon.position.set(
    THREE.MathUtils.lerp(0.34, 0.02, state.aimBlend) + state.recoilPatternX * 0.01,
    THREE.MathUtils.lerp(-0.28, -0.2, state.aimBlend) - state.weaponKick * 0.025 - state.recoilPatternY * 0.008,
    THREE.MathUtils.lerp(-0.6, -0.43, state.aimBlend) + state.weaponKick * 0.05
  );

  weapon.rotation.set(
    THREE.MathUtils.lerp(-0.18, -0.04, state.aimBlend) + state.weaponKick * 0.14 + state.recoilPatternY * 0.06,
    THREE.MathUtils.lerp(-0.34, -0.02, state.aimBlend),
    THREE.MathUtils.lerp(-0.08, -0.02, state.aimBlend) - state.recoilPatternX * 0.09
  );
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
  hudElements.sprayStatus.textContent = `Spray pattern: ${getSprayPatternLabel(SETTINGS.sprayPatternShape)}`;
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

function initializePanelToggles() {
  const panels = [hudElements.hudPanel, hudElements.settingsPanel, hudElements.controlsPanel];

  for (const panel of panels) {
    const toggle = panel.querySelector('.panel-toggle');
    toggle.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('is-collapsed');
      const side = panel.dataset.side;
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.querySelector('span').textContent = getPanelToggleSymbol(side, collapsed);
    });
  }
}

function getPanelToggleSymbol(side, collapsed) {
  if (side === 'right') {
    return collapsed ? '‹' : '›';
  }

  return collapsed ? '›' : '‹';
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

function getSprayPatternLabel(value) {
  return SPRAY_PATTERN_OPTIONS.find((option) => option.value === value)?.label ?? 'Vertical';
}

function sanitizeResponseCurve(value) {
  return RESPONSE_CURVE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SETTINGS.responseCurve;
}

function sanitizeSprayPattern(value) {
  return SPRAY_PATTERN_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SETTINGS.sprayPatternShape;
}

function loadStoredSettings() {
  const storedValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue);

    return {
      lookSensitivity: clampSetting(parsed.lookSensitivity, 0.5, 6, DEFAULT_SETTINGS.lookSensitivity),
      deadzone: clampSetting(parsed.deadzone, 0, 0.35, DEFAULT_SETTINGS.deadzone),
      fov: clampSetting(parsed.fov, 50, 110, DEFAULT_SETTINGS.fov),
      projectileRate: clampSetting(parsed.projectileRate, 1, 15, DEFAULT_SETTINGS.projectileRate),
      sprayPatternStrength: clampSetting(parsed.sprayPatternStrength, 0.05, 1.2, DEFAULT_SETTINGS.sprayPatternStrength),
      sphereSpeed: clampSetting(parsed.sphereSpeed, 0.4, 2.5, DEFAULT_SETTINGS.sphereSpeed),
      responseCurve: sanitizeResponseCurve(parsed.responseCurve),
      sprayPatternShape: sanitizeSprayPattern(parsed.sprayPatternShape),
      invertY: typeof parsed.invertY === 'boolean' ? parsed.invertY : DEFAULT_SETTINGS.invertY
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
      lookSensitivity: SETTINGS.lookSensitivity,
      deadzone: SETTINGS.deadzone,
      fov: SETTINGS.fov,
      projectileRate: SETTINGS.projectileRate,
      sprayPatternStrength: SETTINGS.sprayPatternStrength,
      sphereSpeed: SETTINGS.sphereSpeed,
      responseCurve: SETTINGS.responseCurve,
      sprayPatternShape: SETTINGS.sprayPatternShape,
      invertY: SETTINGS.invertY
    })
  );
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
