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
export const BODY_SHOT_DAMAGE = 1;
export const HEAD_SHOT_DAMAGE = 1.5;
export const PLAYER_EYE_HEIGHT = 2.2;
export const PLAYER_MAX_HEALTH = 50;
export const PLAYER_STRAFE_ACCELERATION = 14;
export const PLAYER_STRAFE_DECELERATION = 12;
export const TARGET_FIRE_INTERVAL_MIN = 1.4;
export const TARGET_FIRE_INTERVAL_MAX = 2.6;
export const TARGET_PROJECTILES_PER_BURST = 2;
export const TARGET_PROJECTILE_BURST_SPREAD = 0.35;
export const TARGET_PROJECTILE_DAMAGE = 1;
export const TARGET_PROJECTILE_HIT_RADIUS = 0.4;
export const TARGET_PROJECTILE_SPEED = 72;
export const TARGET_SPAWN_WIDTH_FACTOR = 0.14;
export const CENTER_SCREEN = new THREE.Vector2(0, 0);
export const AIM_SLOW_CONE_ANGLE = THREE.MathUtils.degToRad(2);
export const BULLET_MAGNETISM_CONE_ANGLE = THREE.MathUtils.degToRad(1);
export const CONTROLLER_VERTICAL_SENSITIVITY_RATIO = 0.75;
export const ADS_SNAP_CYLINDER_RADIUS = 1;
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
  'targetStrafeAmount',
  'targetStrafeOscillationSpeed',
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
export const GUN_SETTING_KEYS = [
  'projectileRate',
  'bulletMagnetism',
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
  targetCount: 3,
  targetRadius: 0.45,
  targetMaxHealth: 12,
  targetSpawnYVariance: 1.11,
  targetVerticalOscillationAmplitude: 0,
  targetVerticalOscillationSpeed: 1.5,
  targetStrafeAmount: 0.9,
  targetStrafeOscillationSpeed: 1.8,
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
