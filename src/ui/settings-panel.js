import {
  CREATE_NEW_PROFILE_VALUE,
  DEFAULT_GAME_PROFILE_NAME,
  DEFAULT_GUN_PROFILE_NAME,
  DEFAULT_SETTINGS,
  RESPONSE_CURVE_OPTIONS
} from '../config/constants.js';
import { sanitizeResponseCurve } from '../state/profile-state.js';
import { clampSetting } from '../utils/math.js';

export function renderSettingsPanelMarkup({ settings, profileController }) {
  return `
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
        options: getProfileOptions(profileController.getGameProfiles()),
        selectedValue: profileController.profileState.selectedGameProfileId,
        createLabel: 'Create new game...'
      })}
      <strong>Game settings</strong>
      ${renderNumericControl({ id: 'sensitivity', label: 'Controller sensitivity', min: 1, max: 10, step: 0.1, value: settings.lookSensitivity })}
      ${renderNumericControl({ id: 'mouse-sensitivity', label: 'Mouse sensitivity', min: 0.05, max: 1, step: 0.01, value: settings.mouseSensitivity })}
      ${renderNumericControl({ id: 'max-strafe-speed', label: 'Max strafe speed', min: 1, max: 20, step: 0.1, value: settings.maxStrafeSpeed })}
      ${renderNumericControl({ id: 'deadzone', label: 'Deadzone', min: 0, max: 0.35, step: 0.01, value: settings.deadzone })}
      ${renderNumericControl({ id: 'fov', label: 'FOV', min: 50, max: 110, step: 1, value: settings.fov })}
      ${renderNumericControl({ id: 'fps-max', label: 'FPS maximum (0 = uncapped)', min: 0, max: 240, step: 1, value: settings.fpsMax })}
      ${renderNumericControl({ id: 'aim-slow', label: 'Aim slow', min: 0, max: 1, step: 0.01, value: settings.aimSlow })}
      ${renderNumericControl({ id: 'aim-stickiness', label: 'Aim stickiness', min: 0, max: 1, step: 0.01, value: settings.aimStickiness })}
      ${renderNumericControl({ id: 'ads-snap', label: 'ADS snap', min: 0, max: 1, step: 0.01, value: settings.adsSnap })}
      ${renderNumericControl({ id: 'target-speed-min', label: 'Min target speed', min: 0.1, max: 5, step: 0.05, value: settings.targetHorizontalSpeedMin })}
      ${renderNumericControl({ id: 'target-speed-max', label: 'Max target speed', min: 0.1, max: 5, step: 0.05, value: settings.targetHorizontalSpeedMax })}
      ${renderNumericControl({ id: 'target-spawn-y-variance', label: 'Target Y spawn variance', min: 0, max: 3, step: 0.05, value: settings.targetSpawnYVariance })}
      ${renderNumericControl({ id: 'target-vertical-oscillation-amplitude', label: 'Target Y oscillation amp.', min: 0, max: 3, step: 0.05, value: settings.targetVerticalOscillationAmplitude })}
      ${renderNumericControl({ id: 'target-vertical-oscillation-speed', label: 'Target Y oscillation speed', min: 0, max: 6, step: 0.05, value: settings.targetVerticalOscillationSpeed })}
      ${renderNumericControl({ id: 'target-strafe-amount', label: 'Target strafe amount', min: 0, max: 3, step: 0.05, value: settings.targetStrafeAmount })}
      ${renderNumericControl({ id: 'target-strafe-oscillation-speed', label: 'Target strafe zigzag speed', min: 0, max: 6, step: 0.05, value: settings.targetStrafeOscillationSpeed })}
      <label class="control-group" for="response-curve-input">
        <span>Response curve</span>
        <select id="response-curve-input">
          ${renderOptions(RESPONSE_CURVE_OPTIONS, settings.responseCurve)}
        </select>
      </label>
      <label class="checkbox-row" for="invert-y-input">
        <input id="invert-y-input" type="checkbox" ${settings.invertY ? 'checked' : ''} />
        <span>Invert Y</span>
      </label>
      <label class="checkbox-row" for="show-debug-shapes-input">
        <input id="show-debug-shapes-input" type="checkbox" ${settings.showDebugShapes ? 'checked' : ''} />
        <span>Show debug shapes</span>
      </label>
      ${renderProfileSelect({
        id: 'gun-profile-select',
        label: 'Gun profile',
        options: getProfileOptions(profileController.getGunProfilesForCurrentGame()),
        selectedValue: profileController.profileState.selectedGunProfileId,
        createLabel: 'Create new gun...'
      })}
      <strong>Gun settings</strong>
      ${renderNumericControl({ id: 'projectile-rate', label: 'Projectile rate', min: 1, max: 15, step: 0.5, value: settings.projectileRate })}
      ${renderNumericControl({ id: 'bullet-magnetism', label: 'Bullet magnetism', min: 0, max: 3, step: 0.01, value: settings.bulletMagnetism })}
      ${renderNumericControl({ id: 'recoil-y-strength', label: 'Recoil Y strength', min: 0.05, max: 2.5, step: 0.05, value: settings.recoilYStrength })}
      ${renderNumericControl({ id: 'recoil-variance', label: 'Recoil variance', min: 0, max: 10, step: 0.05, value: settings.recoilVariance })}
      ${renderNumericControl({ id: 'recoil-horizontal-oscillation', label: 'Recoil horiz. oscillation', min: 0, max: 5, step: 0.05, value: settings.recoilHorizontalOscillationStrength })}
      ${renderNumericControl({ id: 'recoil-horizontal-oscillation-speed', label: 'Recoil horiz. osc. speed', min: 0.1, max: 3, step: 0.01, value: settings.recoilHorizontalOscillationSpeed })}
      ${renderNumericControl({ id: 'recoil-intensity-oscillator', label: 'Recoil intensity oscillator', min: 0, max: 1.5, step: 0.05, value: settings.recoilIntensityOscillator })}
      ${renderNumericControl({ id: 'recoil-intensity-oscillation-speed', label: 'Recoil intensity osc. speed', min: 0.1, max: 2, step: 0.05, value: settings.recoilIntensityOscillationSpeed })}
      <div class="button-row">
        <button id="export-profile-button" type="button">Export profile JSON</button>
      </div>
      </div>
    </div>
  `;
}

export function getSettingsPanelElements(root = document) {
  return {
    settingsPanel: root.querySelector('#settings-panel'),
    gameProfileSelect: root.querySelector('#game-profile-select'),
    gunProfileSelect: root.querySelector('#gun-profile-select'),
    responseCurveInput: root.querySelector('#response-curve-input'),
    invertYInput: root.querySelector('#invert-y-input'),
    showDebugShapesInput: root.querySelector('#show-debug-shapes-input'),
    exportProfileButton: root.querySelector('#export-profile-button')
  };
}

export function createSettingsPanelController({
  elements,
  hudElements,
  settings,
  profileController,
  onResetTargets,
  onDiscoverController
}) {
  const panels = [hudElements.hudPanel, elements.settingsPanel, hudElements.controlsPanel];

  const numericBindings = [
    { id: 'sensitivity', min: 1, max: 10, fallback: DEFAULT_SETTINGS.lookSensitivity, onChange: (value) => { settings.lookSensitivity = value; } },
    { id: 'mouse-sensitivity', min: 0.05, max: 1, fallback: DEFAULT_SETTINGS.mouseSensitivity, onChange: (value) => { settings.mouseSensitivity = value; } },
    { id: 'deadzone', min: 0, max: 0.35, fallback: DEFAULT_SETTINGS.deadzone, onChange: (value) => { settings.deadzone = value; } },
    { id: 'max-strafe-speed', min: 1, max: 20, fallback: DEFAULT_SETTINGS.maxStrafeSpeed, onChange: (value) => { settings.maxStrafeSpeed = value; } },
    { id: 'fov', min: 50, max: 110, fallback: DEFAULT_SETTINGS.fov, onChange: (value) => { settings.fov = value; } },
    { id: 'fps-max', min: 0, max: 240, fallback: DEFAULT_SETTINGS.fpsMax, onChange: (value) => { settings.fpsMax = value; } },
    { id: 'projectile-rate', min: 1, max: 15, fallback: DEFAULT_SETTINGS.projectileRate, onChange: (value) => { settings.projectileRate = value; } },
    { id: 'bullet-magnetism', min: 0, max: 3, fallback: DEFAULT_SETTINGS.bulletMagnetism, onChange: (value) => { settings.bulletMagnetism = value; } },
    { id: 'aim-slow', min: 0, max: 1, fallback: DEFAULT_SETTINGS.aimSlow, onChange: (value) => { settings.aimSlow = value; } },
    { id: 'aim-stickiness', min: 0, max: 1, fallback: DEFAULT_SETTINGS.aimStickiness, onChange: (value) => { settings.aimStickiness = value; } },
    { id: 'ads-snap', min: 0, max: 1, fallback: DEFAULT_SETTINGS.adsSnap, onChange: (value) => { settings.adsSnap = value; } },
    {
      id: 'target-speed-min',
      min: 0.1,
      max: 5,
      fallback: DEFAULT_SETTINGS.targetHorizontalSpeedMin,
      onChange: (value) => {
        settings.targetHorizontalSpeedMin = value;
        if (settings.targetHorizontalSpeedMax < value) {
          settings.targetHorizontalSpeedMax = value;
          setNumericControlValue('target-speed-max', value);
        }
      }
    },
    {
      id: 'target-speed-max',
      min: 0.1,
      max: 5,
      fallback: DEFAULT_SETTINGS.targetHorizontalSpeedMax,
      onChange: (value) => {
        settings.targetHorizontalSpeedMax = value;
        if (settings.targetHorizontalSpeedMin > value) {
          settings.targetHorizontalSpeedMin = value;
          setNumericControlValue('target-speed-min', value);
        }
      }
    },
    {
      id: 'target-spawn-y-variance',
      min: 0,
      max: 3,
      fallback: DEFAULT_SETTINGS.targetSpawnYVariance,
      onChange: (value) => {
        settings.targetSpawnYVariance = value;
        onResetTargets();
      }
    },
    {
      id: 'target-vertical-oscillation-amplitude',
      min: 0,
      max: 3,
      fallback: DEFAULT_SETTINGS.targetVerticalOscillationAmplitude,
      onChange: (value) => {
        settings.targetVerticalOscillationAmplitude = value;
      }
    },
    {
      id: 'target-vertical-oscillation-speed',
      min: 0,
      max: 6,
      fallback: DEFAULT_SETTINGS.targetVerticalOscillationSpeed,
      onChange: (value) => {
        settings.targetVerticalOscillationSpeed = value;
      }
    },
    {
      id: 'target-strafe-amount',
      min: 0,
      max: 3,
      fallback: DEFAULT_SETTINGS.targetStrafeAmount,
      onChange: (value) => {
        settings.targetStrafeAmount = value;
      }
    },
    {
      id: 'target-strafe-oscillation-speed',
      min: 0,
      max: 6,
      fallback: DEFAULT_SETTINGS.targetStrafeOscillationSpeed,
      onChange: (value) => {
        settings.targetStrafeOscillationSpeed = value;
      }
    },
    { id: 'recoil-y-strength', min: 0.05, max: 2.5, fallback: DEFAULT_SETTINGS.recoilYStrength, onChange: (value) => { settings.recoilYStrength = value; } },
    { id: 'recoil-variance', min: 0, max: 10, fallback: DEFAULT_SETTINGS.recoilVariance, onChange: (value) => { settings.recoilVariance = value; } },
    {
      id: 'recoil-horizontal-oscillation',
      min: 0,
      max: 5,
      fallback: DEFAULT_SETTINGS.recoilHorizontalOscillationStrength,
      onChange: (value) => {
        settings.recoilHorizontalOscillationStrength = value;
      }
    },
    {
      id: 'recoil-horizontal-oscillation-speed',
      min: 0.1,
      max: 3,
      fallback: DEFAULT_SETTINGS.recoilHorizontalOscillationSpeed,
      onChange: (value) => {
        settings.recoilHorizontalOscillationSpeed = value;
      }
    },
    {
      id: 'recoil-intensity-oscillator',
      min: 0,
      max: 1.5,
      fallback: DEFAULT_SETTINGS.recoilIntensityOscillator,
      onChange: (value) => {
        settings.recoilIntensityOscillator = value;
      }
    },
    {
      id: 'recoil-intensity-oscillation-speed',
      min: 0.1,
      max: 2,
      fallback: DEFAULT_SETTINGS.recoilIntensityOscillationSpeed,
      onChange: (value) => {
        settings.recoilIntensityOscillationSpeed = value;
      }
    }
  ];

  for (const binding of numericBindings) {
    bindNumericSetting({ ...binding, onStore: profileController.storeSettings });
  }

  elements.gameProfileSelect.addEventListener('change', (event) => {
    handleGameProfileSelection(event.target.value);
  });

  elements.gunProfileSelect.addEventListener('change', (event) => {
    handleGunProfileSelection(event.target.value);
  });

  elements.responseCurveInput.addEventListener('change', (event) => {
    settings.responseCurve = sanitizeResponseCurve(event.target.value);
    profileController.storeSettings();
  });

  elements.invertYInput.addEventListener('change', (event) => {
    settings.invertY = event.target.checked;
    profileController.storeSettings();
  });

  elements.showDebugShapesInput.addEventListener('change', (event) => {
    settings.showDebugShapes = event.target.checked;
    profileController.storeSettings();
  });

  elements.exportProfileButton.addEventListener('click', () => {
    profileController.downloadProfileStateExport();
  });

  hudElements.discoverControllerButton.addEventListener('click', () => {
    onDiscoverController();
  });

  initializePanelToggles(panels);

  function handleGameProfileSelection(selectedValue) {
    if (selectedValue === CREATE_NEW_PROFILE_VALUE) {
      createGameProfileFromPrompt();
      return;
    }

    profileController.selectGameProfile(selectedValue);
    syncProfileUi();
    onResetTargets();
    profileController.storeSettings();
  }

  function handleGunProfileSelection(selectedValue) {
    if (selectedValue === CREATE_NEW_PROFILE_VALUE) {
      createGunProfileFromPrompt();
      return;
    }

    profileController.selectGunProfile(selectedValue);
    syncProfileUi();
    profileController.storeSettings();
  }

  function createGameProfileFromPrompt() {
    const name = window.prompt('Enter a name for the new game profile:', DEFAULT_GAME_PROFILE_NAME)?.trim();
    if (!name) {
      syncProfileSelectors();
      return;
    }

    profileController.createGameProfile(name);
    syncProfileUi();
    onResetTargets();
    profileController.storeSettings();
  }

  function createGunProfileFromPrompt() {
    const name = window.prompt('Enter a name for the new gun profile:', DEFAULT_GUN_PROFILE_NAME)?.trim();
    if (!name) {
      syncProfileSelectors();
      return;
    }

    profileController.createGunProfile(name);
    syncProfileUi();
    profileController.storeSettings();
  }

  function syncProfileUi() {
    syncProfileSelectors();
    syncSettingControls();
  }

  function syncProfileSelectors() {
    elements.gameProfileSelect.innerHTML = renderProfileOptions(
      getProfileOptions(profileController.getGameProfiles()),
      profileController.profileState.selectedGameProfileId,
      'Create new game...'
    );
    elements.gunProfileSelect.innerHTML = renderProfileOptions(
      getProfileOptions(profileController.getGunProfilesForCurrentGame()),
      profileController.profileState.selectedGunProfileId,
      'Create new gun...'
    );
    elements.gameProfileSelect.value = profileController.profileState.selectedGameProfileId;
    elements.gunProfileSelect.value = profileController.profileState.selectedGunProfileId;
  }

  function syncSettingControls() {
    setNumericControlValue('sensitivity', settings.lookSensitivity);
    setNumericControlValue('mouse-sensitivity', settings.mouseSensitivity);
    setNumericControlValue('max-strafe-speed', settings.maxStrafeSpeed);
    setNumericControlValue('deadzone', settings.deadzone);
    setNumericControlValue('fov', settings.fov);
    setNumericControlValue('fps-max', settings.fpsMax);
    setNumericControlValue('projectile-rate', settings.projectileRate);
    setNumericControlValue('bullet-magnetism', settings.bulletMagnetism);
    setNumericControlValue('aim-slow', settings.aimSlow);
    setNumericControlValue('aim-stickiness', settings.aimStickiness);
    setNumericControlValue('ads-snap', settings.adsSnap);
    setNumericControlValue('target-speed-min', settings.targetHorizontalSpeedMin);
    setNumericControlValue('target-speed-max', settings.targetHorizontalSpeedMax);
    setNumericControlValue('target-spawn-y-variance', settings.targetSpawnYVariance);
    setNumericControlValue('target-vertical-oscillation-amplitude', settings.targetVerticalOscillationAmplitude);
    setNumericControlValue('target-vertical-oscillation-speed', settings.targetVerticalOscillationSpeed);
    setNumericControlValue('target-strafe-amount', settings.targetStrafeAmount);
    setNumericControlValue('target-strafe-oscillation-speed', settings.targetStrafeOscillationSpeed);
    setNumericControlValue('recoil-y-strength', settings.recoilYStrength);
    setNumericControlValue('recoil-variance', settings.recoilVariance);
    setNumericControlValue('recoil-horizontal-oscillation', settings.recoilHorizontalOscillationStrength);
    setNumericControlValue('recoil-horizontal-oscillation-speed', settings.recoilHorizontalOscillationSpeed);
    setNumericControlValue('recoil-intensity-oscillator', settings.recoilIntensityOscillator);
    setNumericControlValue('recoil-intensity-oscillation-speed', settings.recoilIntensityOscillationSpeed);
    elements.responseCurveInput.value = settings.responseCurve;
    elements.invertYInput.checked = settings.invertY;
    elements.showDebugShapesInput.checked = settings.showDebugShapes;
  }

  return {
    syncProfileUi
  };
}

function bindNumericSetting({ id, min, max, fallback, onChange, onStore }) {
  const rangeInput = document.querySelector(`#${id}-range`);
  const numberInput = document.querySelector(`#${id}-number`);

  const applyValue = (rawValue) => {
    const value = clampSetting(Number(rawValue), min, max, fallback);
    onChange(value);
    rangeInput.value = String(value);
    numberInput.value = String(value);
    onStore();
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

function initializePanelToggles(panels) {
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

function getProfileOptions(profiles) {
  return profiles.map((profile) => ({ value: profile.id, label: profile.name }));
}
