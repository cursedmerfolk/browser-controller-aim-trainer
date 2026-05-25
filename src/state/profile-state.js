import bundledProfileState from '../profiles/marathon-profile.json';
import {
  CREATE_NEW_PROFILE_VALUE,
  DEFAULT_GAME_PROFILE_NAME,
  DEFAULT_GUN_PROFILE_NAME,
  DEFAULT_SETTINGS,
  GAME_SETTING_KEYS,
  GUN_SETTING_KEYS,
  LEGACY_SETTINGS_ORDER,
  LEGACY_TARGET_SPEED_MAX,
  LEGACY_TARGET_SPEED_MIN,
  RESPONSE_CURVE_OPTIONS,
  SETTINGS_EXPORT_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION
} from '../config/constants.js';
import { clampSetting } from '../utils/math.js';

export function createProfileStateController() {
  const profileState = loadProfileState();
  const settings = createSettingsProxy(profileState);

  publishProfileStateExport(true);

  function storeSettings() {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, getSerializedProfileState());
    publishProfileStateExport();
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

  function selectGameProfile(selectedValue) {
    if (selectedValue === CREATE_NEW_PROFILE_VALUE) {
      return false;
    }

    profileState.selectedGameProfileId = selectedValue;
    profileState.selectedGunProfileId = Object.keys(getCurrentGameProfile().gunProfiles)[0];
    return true;
  }

  function selectGunProfile(selectedValue) {
    if (selectedValue === CREATE_NEW_PROFILE_VALUE) {
      return false;
    }

    profileState.selectedGunProfileId = selectedValue;
    return true;
  }

  function createGameProfile(name) {
    const normalizedName = sanitizeProfileName(name, '').trim();
    if (!normalizedName) {
      return false;
    }

    const gameId = createProfileId(normalizedName, Object.keys(profileState.gameProfiles));
    const currentGameProfile = getCurrentGameProfile();
    const currentGunProfile = getCurrentGunProfile();
    const gunId = createProfileId(currentGunProfile.name, []);
    profileState.gameProfiles[gameId] = {
      id: gameId,
      name: normalizedName,
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
    return true;
  }

  function createGunProfile(name) {
    const normalizedName = sanitizeProfileName(name, '').trim();
    if (!normalizedName) {
      return false;
    }

    const currentGameProfile = getCurrentGameProfile();
    const gunId = createProfileId(normalizedName, Object.keys(currentGameProfile.gunProfiles));
    currentGameProfile.gunProfiles[gunId] = {
      id: gunId,
      name: normalizedName,
      settings: { ...getCurrentGunProfile().settings }
    };
    profileState.selectedGunProfileId = gunId;
    return true;
  }

  function downloadProfileStateExport() {
    const serializedProfileState = getSerializedProfileState(2);
    publishProfileStateExport();
    const blob = new Blob([serializedProfileState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'browser-controller-aim-trainer-profile.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function getSerializableProfileState() {
    return {
      version: SETTINGS_STORAGE_VERSION,
      selectedGameProfileId: profileState.selectedGameProfileId,
      selectedGunProfileId: profileState.selectedGunProfileId,
      gameProfiles: profileState.gameProfiles
    };
  }

  function getSerializedProfileState(spaces = 0) {
    return JSON.stringify(getSerializableProfileState(), null, spaces);
  }

  function publishProfileStateExport(logToConsole = false) {
    const serializedProfileState = getSerializedProfileState(2);
    window.localStorage.setItem(SETTINGS_EXPORT_STORAGE_KEY, serializedProfileState);
    window.__AIM_TRAINER_PROFILE_EXPORT__ = serializedProfileState;
    if (logToConsole) {
      console.info('Aim trainer profile JSON exported to window.__AIM_TRAINER_PROFILE_EXPORT__');
    }
  }

  return {
    profileState,
    settings,
    storeSettings,
    getGameProfiles,
    getCurrentGameProfile,
    getGunProfilesForCurrentGame,
    getCurrentGunProfile,
    selectGameProfile,
    selectGunProfile,
    createGameProfile,
    createGunProfile,
    downloadProfileStateExport
  };
}

export function sanitizeResponseCurve(value) {
  return RESPONSE_CURVE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SETTINGS.responseCurve;
}

function createSettingsProxy(profileState) {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (GAME_SETTING_KEYS.includes(property)) {
          return getCurrentGameProfile(profileState).settings[property];
        }

        if (GUN_SETTING_KEYS.includes(property)) {
          return getCurrentGunProfile(profileState).settings[property];
        }

        return undefined;
      },
      set(_target, property, value) {
        if (typeof property !== 'string') {
          return false;
        }

        if (GAME_SETTING_KEYS.includes(property)) {
          getCurrentGameProfile(profileState).settings[property] = value;
          return true;
        }

        if (GUN_SETTING_KEYS.includes(property)) {
          getCurrentGunProfile(profileState).settings[property] = value;
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
    return getBundledProfileState();
  }

  try {
    const parsed = JSON.parse(storedValue);
    if (parsed?.version === SETTINGS_STORAGE_VERSION && parsed?.gameProfiles) {
      return sanitizeProfileState(parsed);
    }

    return createDefaultProfileState(getLegacyStoredSettingsMap(parsed));
  } catch (error) {
    console.error('Failed to parse stored controller settings.', error);
    return getBundledProfileState();
  }
}

function getBundledProfileState() {
  return sanitizeProfileState(bundledProfileState);
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
  const targetFireIntervalMin = clampSetting(
    rawSettings.targetFireIntervalMin,
    0.1,
    10,
    DEFAULT_SETTINGS.targetFireIntervalMin
  );
  const targetFireIntervalMax = clampSetting(
    rawSettings.targetFireIntervalMax,
    targetFireIntervalMin,
    10,
    DEFAULT_SETTINGS.targetFireIntervalMax
  );
  const targetFireIntervalScaleMin = clampSetting(
    rawSettings.targetFireIntervalScaleMin,
    0.1,
    3,
    DEFAULT_SETTINGS.targetFireIntervalScaleMin
  );
  const targetFireIntervalScaleMax = clampSetting(
    rawSettings.targetFireIntervalScaleMax,
    targetFireIntervalScaleMin,
    3,
    DEFAULT_SETTINGS.targetFireIntervalScaleMax
  );
  const targetFireIntervalJitterMin = clampSetting(
    rawSettings.targetFireIntervalJitterMin,
    0,
    3,
    DEFAULT_SETTINGS.targetFireIntervalJitterMin
  );
  const targetFireIntervalJitterMax = clampSetting(
    rawSettings.targetFireIntervalJitterMax,
    targetFireIntervalJitterMin,
    3,
    DEFAULT_SETTINGS.targetFireIntervalJitterMax
  );

  return {
    lookSensitivity: clampSetting(rawSettings.lookSensitivity, 1, 10, DEFAULT_SETTINGS.lookSensitivity),
    mouseSensitivity: clampSetting(rawSettings.mouseSensitivity, 0.05, 1, DEFAULT_SETTINGS.mouseSensitivity),
    maxStrafeSpeed: clampSetting(rawSettings.maxStrafeSpeed, 1, 20, DEFAULT_SETTINGS.maxStrafeSpeed),
    strafeAcceleration: clampSetting(rawSettings.strafeAcceleration, 1, 30, DEFAULT_SETTINGS.strafeAcceleration),
    deadzone: clampSetting(rawSettings.deadzone, 0, 0.35, DEFAULT_SETTINGS.deadzone),
    invertY: typeof rawSettings.invertY === 'boolean' ? rawSettings.invertY : DEFAULT_SETTINGS.invertY,
    fov: clampSetting(rawSettings.fov, 50, 110, DEFAULT_SETTINGS.fov),
    fpsMax: clampSetting(rawSettings.fpsMax, 0, 240, DEFAULT_SETTINGS.fpsMax),
    responseCurve: sanitizeResponseCurve(rawSettings.responseCurve),
    aimSlow: clampSetting(rawSettings.aimSlow, 0, 1, DEFAULT_SETTINGS.aimSlow),
    aimSlowConeAngle: clampSetting(rawSettings.aimSlowConeAngle, 0, 10, DEFAULT_SETTINGS.aimSlowConeAngle),
    aimStickiness: clampSetting(rawSettings.aimStickiness, 0, 1, DEFAULT_SETTINGS.aimStickiness),
    adsSnap: clampSetting(rawSettings.adsSnap, 0, 1, DEFAULT_SETTINGS.adsSnap),
    adsSnapRadius: clampSetting(rawSettings.adsSnapRadius, 0, 5, DEFAULT_SETTINGS.adsSnapRadius),
    adsSnapBlendMax: clampSetting(rawSettings.adsSnapBlendMax, 0, 1, DEFAULT_SETTINGS.adsSnapBlendMax),
    adsSnapPullSpeed: clampSetting(rawSettings.adsSnapPullSpeed, 1, 30, DEFAULT_SETTINGS.adsSnapPullSpeed),
    controllerVerticalSensitivityRatio: clampSetting(
      rawSettings.controllerVerticalSensitivityRatio,
      0.1,
      2,
      DEFAULT_SETTINGS.controllerVerticalSensitivityRatio
    ),
    showDebugShapes:
      typeof rawSettings.showDebugShapes === 'boolean' ? rawSettings.showDebugShapes : DEFAULT_SETTINGS.showDebugShapes,
    targetHorizontalSpeedMin: clampSetting(targetHorizontalSpeedMin, 0.1, 5, DEFAULT_SETTINGS.targetHorizontalSpeedMin),
    targetHorizontalSpeedMax: clampSetting(targetHorizontalSpeedMax, 0.1, 5, DEFAULT_SETTINGS.targetHorizontalSpeedMax),
    targetCount: clampSetting(rawSettings.targetCount, 1, 3, DEFAULT_SETTINGS.targetCount),
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
    targetStrafeAmount: clampSetting(rawSettings.targetStrafeAmount, 0, 3, DEFAULT_SETTINGS.targetStrafeAmount),
    targetStrafeOscillationSpeed: clampSetting(
      rawSettings.targetStrafeOscillationSpeed,
      0,
      6,
      DEFAULT_SETTINGS.targetStrafeOscillationSpeed
    ),
    targetFireIntervalMin,
    targetFireIntervalMax,
    targetProjectilesPerBurst: Math.round(
      clampSetting(rawSettings.targetProjectilesPerBurst, 1, 8, DEFAULT_SETTINGS.targetProjectilesPerBurst)
    ),
    targetProjectileBurstSpread: clampSetting(
      rawSettings.targetProjectileBurstSpread,
      0,
      3,
      DEFAULT_SETTINGS.targetProjectileBurstSpread
    ),
    targetInitialFireDelayMax: clampSetting(
      rawSettings.targetInitialFireDelayMax,
      0,
      5,
      DEFAULT_SETTINGS.targetInitialFireDelayMax
    ),
    targetFireIntervalScaleMin,
    targetFireIntervalScaleMax,
    targetFireIntervalJitterMin,
    targetFireIntervalJitterMax,
    targetSpawnWidthFactor: clampSetting(
      rawSettings.targetSpawnWidthFactor,
      0.02,
      0.5,
      DEFAULT_SETTINGS.targetSpawnWidthFactor
    ),
    targetGroundSpawnChance: clampSetting(
      rawSettings.targetGroundSpawnChance,
      0,
      1,
      DEFAULT_SETTINGS.targetGroundSpawnChance
    ),
    spawnDistanceMin: clampSetting(rawSettings.spawnDistanceMin, 1, 60, DEFAULT_SETTINGS.spawnDistanceMin),
    spawnDistanceMax: clampSetting(rawSettings.spawnDistanceMax, 1, 120, DEFAULT_SETTINGS.spawnDistanceMax),
    targetLifetimeMin: clampSetting(rawSettings.targetLifetimeMin, 1, 60, DEFAULT_SETTINGS.targetLifetimeMin),
    targetLifetimeMax: clampSetting(rawSettings.targetLifetimeMax, 1, 60, DEFAULT_SETTINGS.targetLifetimeMax),
    enemyProjectileSpeed: clampSetting(
      rawSettings.enemyProjectileSpeed,
      1,
      200,
      DEFAULT_SETTINGS.enemyProjectileSpeed
    ),
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
    bulletMagnetism: clampSetting(rawSettings.bulletMagnetism, 0, 3, DEFAULT_SETTINGS.bulletMagnetism),
    bulletMagnetismConeAngle: clampSetting(
      rawSettings.bulletMagnetismConeAngle,
      0,
      10,
      DEFAULT_SETTINGS.bulletMagnetismConeAngle
    ),
    bodyShotDamage: clampSetting(rawSettings.bodyShotDamage, 0.1, 10, DEFAULT_SETTINGS.bodyShotDamage),
    headShotDamage: clampSetting(rawSettings.headShotDamage, 0.1, 10, DEFAULT_SETTINGS.headShotDamage),
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

function getCurrentGameProfile(profileState) {
  if (!profileState.gameProfiles[profileState.selectedGameProfileId]) {
    profileState.selectedGameProfileId = Object.keys(profileState.gameProfiles)[0];
  }

  return profileState.gameProfiles[profileState.selectedGameProfileId];
}

function getCurrentGunProfile(profileState) {
  const currentGameProfile = getCurrentGameProfile(profileState);
  if (!currentGameProfile.gunProfiles[profileState.selectedGunProfileId]) {
    profileState.selectedGunProfileId = Object.keys(currentGameProfile.gunProfiles)[0];
  }

  return currentGameProfile.gunProfiles[profileState.selectedGunProfileId];
}
