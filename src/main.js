import './style.css';
import * as THREE from 'three';

const SETTINGS_STORAGE_KEY = 'browser-controller-aim-trainer.settings';

const DEFAULT_SETTINGS = {
  lookSensitivity: 2.8,
  deadzone: 0.12,
  invertY: false,
  targetCount: 8,
  targetRadius: 0.45,
  spawnZMin: -18,
  spawnZMax: -8,
  spawnXRange: 6.5,
  spawnYMin: 0.8,
  spawnYMax: 4.2
};

const SETTINGS = {
  ...DEFAULT_SETTINGS,
  ...loadStoredSettings()
};

const state = {
  score: 0,
  shots: 0,
  hits: 0,
  lastShotPressed: false,
  activeGamepadIndex: null,
  gamepadName: 'No controller detected',
  yaw: 0,
  pitch: 0,
  rawStickX: 0,
  rawStickY: 0
};

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="hud-panel hud">
    <strong>Controller Aim Trainer</strong>
    <div id="gamepad-status">Controller: ${state.gamepadName}</div>
    <div id="score">Score: 0</div>
    <div id="accuracy">Accuracy: 0%</div>
    <div id="shots">Shots: 0 | Hits: 0</div>
    <div id="raw-stick">Raw stick: X 0.00 | Y 0.00</div>
  </div>
  <div class="crosshair" aria-hidden="true"></div>
  <div class="hud-panel settings-panel" id="settings-panel">
    <strong>Controller settings</strong>
    <label class="control-group" for="sensitivity-input">
      <span>Sensitivity</span>
      <span id="sensitivity-value">2.8</span>
      <input id="sensitivity-input" type="range" min="0.5" max="6" step="0.1" value="${SETTINGS.lookSensitivity}" />
    </label>
    <label class="control-group" for="deadzone-input">
      <span>Deadzone</span>
      <span id="deadzone-value">0.12</span>
      <input id="deadzone-input" type="range" min="0" max="0.35" step="0.01" value="${SETTINGS.deadzone}" />
    </label>
    <label class="checkbox-row" for="invert-y-input">
      <input id="invert-y-input" type="checkbox" ${SETTINGS.invertY ? 'checked' : ''} />
      <span>Invert Y</span>
    </label>
  </div>
  <div class="hud-panel instructions">
    <div><strong>Controls</strong></div>
    <div>Right stick: aim</div>
    <div>Right trigger / R2: shoot</div>
    <div>Keyboard fallback: arrow keys/WASD aim, Space shoot</div>
    <button id="reset-button">Reset score</button>
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

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 0);

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

const targets = [];
const targetGeometry = new THREE.SphereGeometry(SETTINGS.targetRadius, 32, 32);
const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.35 });

for (let i = 0; i < SETTINGS.targetCount; i += 1) {
  const target = new THREE.Mesh(targetGeometry, targetMaterial.clone());
  target.castShadow = true;
  scene.add(target);
  targets.push(target);
  respawnTarget(target);
}

const raycaster = new THREE.Raycaster();
const keyboard = new Set();
const clock = new THREE.Clock();
const hudElements = {
  gamepadStatus: document.querySelector('#gamepad-status'),
  score: document.querySelector('#score'),
  accuracy: document.querySelector('#accuracy'),
  shots: document.querySelector('#shots'),
  rawStick: document.querySelector('#raw-stick'),
  sensitivityInput: document.querySelector('#sensitivity-input'),
  sensitivityValue: document.querySelector('#sensitivity-value'),
  deadzoneInput: document.querySelector('#deadzone-input'),
  deadzoneValue: document.querySelector('#deadzone-value'),
  invertYInput: document.querySelector('#invert-y-input')
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

document.querySelector('#reset-button').addEventListener('click', () => {
  state.score = 0;
  state.shots = 0;
  state.hits = 0;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

hudElements.sensitivityInput.addEventListener('input', (event) => {
  SETTINGS.lookSensitivity = Number(event.target.value);
  storeSettings();
});

hudElements.deadzoneInput.addEventListener('input', (event) => {
  SETTINGS.deadzone = Number(event.target.value);
  storeSettings();
});

hudElements.invertYInput.addEventListener('change', (event) => {
  SETTINGS.invertY = event.target.checked;
  storeSettings();
});

function loop() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  handleInput(delta);
  updateCamera();
  animateTargets(delta, elapsed);
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function handleInput(delta) {
  let lookX = 0;
  let lookY = 0;
  let shootPressed = keyboard.has('Space');

  const pad = getActiveGamepad();
  if (pad) {
    state.rawStickX = pad.axes[2] ?? 0;
    state.rawStickY = pad.axes[3] ?? 0;

    // Standard mapping: right stick is usually axes 2 and 3, right trigger is button 7.
    lookX = applyDeadzone(state.rawStickX, SETTINGS.deadzone);
    lookY = applyDeadzone(state.rawStickY, SETTINGS.deadzone);
    shootPressed = shootPressed || Boolean(pad.buttons[7]?.pressed || pad.buttons[5]?.pressed);
  } else {
    state.rawStickX = 0;
    state.rawStickY = 0;
  }

  if (keyboard.has('ArrowLeft') || keyboard.has('KeyA')) lookX -= 0.7;
  if (keyboard.has('ArrowRight') || keyboard.has('KeyD')) lookX += 0.7;
  if (keyboard.has('ArrowUp') || keyboard.has('KeyW')) lookY -= 0.7;
  if (keyboard.has('ArrowDown') || keyboard.has('KeyS')) lookY += 0.7;

  state.yaw -= lookX * SETTINGS.lookSensitivity * delta;
  state.pitch -= (SETTINGS.invertY ? -lookY : lookY) * SETTINGS.lookSensitivity * delta;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -0.85, 0.85);

  if (shootPressed && !state.lastShotPressed) {
    shoot();
  }
  state.lastShotPressed = shootPressed;
}

function getActiveGamepad() {
  const pads = navigator.getGamepads?.() ?? [];

  if (state.activeGamepadIndex !== null && pads[state.activeGamepadIndex]) {
    return pads[state.activeGamepadIndex];
  }

  const firstPad = Array.from(pads).find(Boolean);
  if (firstPad) {
    state.activeGamepadIndex = firstPad.index;
    state.gamepadName = firstPad.id;
  } else if (state.gamepadName !== 'No controller detected') {
    state.gamepadName = 'No controller detected';
    state.activeGamepadIndex = null;
  }

  return firstPad;
}

function applyDeadzone(value, deadzone) {
  if (Math.abs(value) < deadzone) return 0;
  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - deadzone) / (1 - deadzone));
}

function updateCamera() {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
}

function shoot() {
  state.shots += 1;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(targets, false);

  if (hits.length > 0) {
    const hitTarget = hits[0].object;
    state.hits += 1;
    state.score += 100;
    respawnTarget(hitTarget);
  }

}

function respawnTarget(target) {
  const baseY = randomRange(SETTINGS.spawnYMin, SETTINGS.spawnYMax);

  target.position.set(
    randomRange(-SETTINGS.spawnXRange, SETTINGS.spawnXRange),
    baseY,
    randomRange(SETTINGS.spawnZMin, SETTINGS.spawnZMax)
  );
  target.scale.setScalar(randomRange(0.85, 1.2));
  target.userData.baseY = baseY;
  target.userData.bobAmplitude = randomRange(0.12, 0.35);
  target.userData.bobPhase = randomRange(0, Math.PI * 2);
  target.userData.bobSpeed = randomRange(1.2, 2.2);
  target.userData.rotationSpeed = randomRange(0.8, 1.6);
}

function animateTargets(delta, elapsed) {
  for (const target of targets) {
    target.rotation.y += delta * target.userData.rotationSpeed;
    target.position.y =
      target.userData.baseY +
      Math.sin(elapsed * target.userData.bobSpeed + target.userData.bobPhase) * target.userData.bobAmplitude;
  }
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

function updateHud() {
  const accuracy = state.shots === 0 ? 0 : Math.round((state.hits / state.shots) * 100);
  hudElements.gamepadStatus.textContent = `Controller: ${state.gamepadName}`;
  hudElements.score.textContent = `Score: ${state.score}`;
  hudElements.accuracy.textContent = `Accuracy: ${accuracy}%`;
  hudElements.shots.textContent = `Shots: ${state.shots} | Hits: ${state.hits}`;
  hudElements.rawStick.textContent = `Raw stick: X ${state.rawStickX.toFixed(2)} | Y ${state.rawStickY.toFixed(2)}`;
  hudElements.sensitivityValue.textContent = SETTINGS.lookSensitivity.toFixed(1);
  hudElements.deadzoneValue.textContent = SETTINGS.deadzone.toFixed(2);
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

updateHud();
loop();
