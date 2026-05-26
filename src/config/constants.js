import * as THREE from 'three';

export const SETTINGS_STORAGE_KEY = 'browser-controller-aim-trainer.settings';
export const SETTINGS_EXPORT_STORAGE_KEY = 'browser-controller-aim-trainer.export';
export const SETTINGS_STORAGE_VERSION = 3;

export const RESPONSE_CURVE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'inverse-s', label: 'Inverse S' }
];

export const FULL_HEALTH_COLOR = new THREE.Color(0x2fd66b);
export const LOW_HEALTH_COLOR = new THREE.Color(0xff4d6d);
export const FULL_HEALTH_EMISSIVE = new THREE.Color(0x07150d);
export const LOW_HEALTH_EMISSIVE = new THREE.Color(0x2a050a);
export const PROJECTILE_UP_AXIS = new THREE.Vector3(0, 1, 0);
export const MUZZLE_SCALE = new THREE.Vector3(1, 1, 1);
export const TARGET_BODY_BASE_HEIGHT = 0.96;
export const TARGET_HEAD_RADIUS = 0.18;
export const PLAYER_EYE_HEIGHT = 2.2;
export const PLAYER_MAX_HEALTH = 50;
export const TARGET_PROJECTILE_DAMAGE = 1;
export const TARGET_PROJECTILE_HIT_RADIUS = 0.4;
export const CENTER_SCREEN = new THREE.Vector2(0, 0);
export const DEBUG_VISUAL_OFFSET = 0.2;
export const LEGACY_TARGET_SPEED_MIN = 0.45;
export const LEGACY_TARGET_SPEED_MAX = 1.8;
export const DEFAULT_GAME_PROFILE_NAME = 'Marathon';
export const DEFAULT_GUN_PROFILE_NAME = 'Overrun AR';
export const CREATE_NEW_PROFILE_VALUE = '__create_new_profile__';
export const LEGACY_SETTINGS_ORDER = [
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
export const GAME_SETTING_KEYS = [
  'lookSensitivity',
  'mouseSensitivity',
  'maxStrafeSpeed',
  'deadzone',
  'invertY',
  'fov',
  'fpsMax',
  'responseCurve',
  'aimSlow',
  'aimSlowConeAngle',
  'aimStickiness',
  'adsSnap',
  'adsSnapRadius',
  'adsSnapBlendMax',
  'adsSnapPullSpeed',
  'controllerVerticalSensitivityRatio',
  'strafeAcceleration',
  'showDebugShapes',
  'targetHorizontalSpeedMin',
  'targetHorizontalSpeedMax',
  'targetCount',
  'targetWidth',
  'targetHeight',
  'targetRadius',
  'targetMaxHealth',
  'targetSpawnFloor',
  'targetSpawnYVariance',
  'targetVerticalOscillationAmplitude',
  'targetVerticalOscillationSpeed',
  'targetStrafeAmount',
  'targetStrafeOscillationSpeed',
  'targetFireIntervalMin',
  'targetFireIntervalMax',
  'targetProjectilesPerBurst',
  'targetProjectileBurstSpread',
  'targetInitialFireDelayMax',
  'targetFireIntervalScaleMin',
  'targetFireIntervalScaleMax',
  'targetFireIntervalJitterMin',
  'targetFireIntervalJitterMax',
  'targetSpawnWidthFactor',
  'targetGroundSpawnChance',
  'spawnDistanceMin',
  'spawnDistanceMax',
  'targetLifetimeMin',
  'targetLifetimeMax',
  'enemyProjectileSpeed',
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
export const GUN_SETTING_KEYS = [
  'projectileRate',
  'hipFireSprayRadius',
  'bulletMagnetism',
  'bulletMagnetismConeAngle',
  'bodyShotDamage',
  'headShotDamage',
  'recoilYStrength',
  'recoilVariance',
  'recoilHorizontalOscillationStrength',
  'recoilHorizontalOscillationSpeed',
  'recoilIntensityOscillator',
  'recoilIntensityOscillationSpeed'
];

export const DEFAULT_SETTINGS = {
  lookSensitivity: 2.8,
  mouseSensitivity: 0.22,
  maxStrafeSpeed: 10.5,
  deadzone: 0.12,
  invertY: false,
  fov: 110,
  fpsMax: 0,
  responseCurve: 'linear',
  strafeAcceleration: 14,
  projectileRate: 14,
  hipFireSprayRadius: 18,
  bulletMagnetism: 0,
  bulletMagnetismConeAngle: 1,
  bodyShotDamage: 1,
  headShotDamage: 1.5,
  aimSlow: 0,
  aimSlowConeAngle: 2,
  aimStickiness: 0,
  adsSnap: 0,
  adsSnapRadius: 1,
  adsSnapBlendMax: 0.9,
  adsSnapPullSpeed: 14,
  controllerVerticalSensitivityRatio: 0.75,
  showDebugShapes: true,
  recoilYStrength: 0.6,
  recoilVariance: 0.18,
  recoilHorizontalOscillationStrength: 0.3,
  recoilHorizontalOscillationSpeed: 0.82,
  recoilIntensityOscillator: 0.35,
  recoilIntensityOscillationSpeed: 0.37,
  targetHorizontalSpeedMin: 0.61,
  targetHorizontalSpeedMax: 2.43,
  targetCount: 3,
  targetWidth: 0.36,
  targetHeight: 1.39,
  targetRadius: 0.45,
  targetMaxHealth: 12,
  targetSpawnFloor: 0.04,
  targetSpawnYVariance: 1.11,
  targetVerticalOscillationAmplitude: 0,
  targetVerticalOscillationSpeed: 1.5,
  targetStrafeAmount: 0.9,
  targetStrafeOscillationSpeed: 1.8,
  targetFireIntervalMin: 1.4,
  targetFireIntervalMax: 2.6,
  targetProjectilesPerBurst: 2,
  targetProjectileBurstSpread: 0.35,
  targetInitialFireDelayMax: 1.1,
  targetFireIntervalScaleMin: 0.8,
  targetFireIntervalScaleMax: 1.3,
  targetFireIntervalJitterMin: 0.15,
  targetFireIntervalJitterMax: 0.85,
  targetSpawnWidthFactor: 0.14,
  targetGroundSpawnChance: 0.3,
  spawnDistanceMin: 4,
  spawnDistanceMax: 36,
  targetLifetimeMin: 6,
  targetLifetimeMax: 9,
  enemyProjectileSpeed: 72,
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
