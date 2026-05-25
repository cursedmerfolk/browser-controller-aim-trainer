import * as THREE from 'three';
import {
  FULL_HEALTH_COLOR,
  FULL_HEALTH_EMISSIVE,
  LOW_HEALTH_COLOR,
  LOW_HEALTH_EMISSIVE,
  TARGET_BODY_BASE_HEIGHT,
  TARGET_HEAD_RADIUS
} from '../config/constants.js';
import { getTriangleWave, randomRange } from '../utils/math.js';

const TARGET_FEET_CLEARANCE = 0.04;

export function createTargetSystem({ scene, camera, backWall, state, settings, playHitTickSound }) {
  const targets = [];
  const targetBodyGeometry = new THREE.BoxGeometry(0.36, TARGET_BODY_BASE_HEIGHT, 0.36);
  const targetHeadGeometry = new THREE.SphereGeometry(TARGET_HEAD_RADIUS, 24, 24);
  let fireTargetProjectile = () => {};

  for (let index = 0; index < settings.targetCount; index += 1) {
    const target = createTarget();
    targets.push(target);
    scene.add(target);
    respawnTarget(target);
  }

  function setFireTargetProjectile(callback) {
    fireTargetProjectile = callback;
  }

  function getTargetRoot(object) {
    return object.userData.targetRoot ?? object;
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
    target.userData.maxHealth = settings.targetMaxHealth;
    target.userData.health = settings.targetMaxHealth;
    target.userData.basePosition = new THREE.Vector3();
    target.userData.horizontalVelocity = new THREE.Vector3();
    target.userData.age = 0;
    target.userData.lifetime = settings.targetLifetimeMax;
    target.userData.settings = settings;
    target.userData.body = body;
    target.userData.head = head;
    target.userData.fireIntervalScale = settings.targetFireIntervalScaleMin;
    target.userData.strafePhase = 0;
    target.userData.feetClearance = TARGET_FEET_CLEARANCE;
    target.userData.verticalOscillationPhase = 0;
    target.userData.fireCooldown = 0;
    target.userData.material = material;
    target.userData.totalHeight = settings.targetHeight + settings.targetWidth;

    return target;
  }

  function applyHitToTarget(target, isHeadshot = false) {
    state.hits += 1;
    state.hitConfirmFlash = 1;
    target.userData.health -= isHeadshot ? settings.headShotDamage : settings.bodyShotDamage;
    playHitTickSound();

    if (target.userData.health <= 0) {
      state.score += 1;
      respawnTarget(target);
      return;
    }

    applyTargetHealthVisuals(target);
  }

  function respawnTarget(target) {
    const spawnBounds = getSpawnBounds();
    const worldPosition = new THREE.Vector3(
      randomRange(spawnBounds.minX, spawnBounds.maxX),
      spawnBounds.minY,
      randomRange(spawnBounds.minZ, spawnBounds.maxZ)
    );
    if (Math.random() < settings.targetGroundSpawnChance) {
      worldPosition.y = spawnBounds.minY;
    } else {
      worldPosition.y = randomRange(spawnBounds.minY, spawnBounds.maxY);
    }

    const moveSpeed = getRandomTargetMoveSpeed();
    const horizontalVelocity = getHorizontalVelocity(moveSpeed, worldPosition.x, (spawnBounds.minX + spawnBounds.maxX) / 2);

    target.userData.basePosition.copy(worldPosition);
    target.userData.horizontalVelocity.copy(horizontalVelocity);
    target.userData.moveSpeed = moveSpeed;
    target.userData.age = 0;
    target.userData.lifetime = randomRange(settings.targetLifetimeMin, settings.targetLifetimeMax);
    target.userData.verticalOscillationPhase = randomRange(0, Math.PI * 2);
    target.userData.fireIntervalScale = randomRange(settings.targetFireIntervalScaleMin, settings.targetFireIntervalScaleMax);
    target.userData.fireCooldown = getNextTargetFireCooldown(target, true);
    target.userData.strafePhase = randomRange(0, Math.PI * 2);
    target.userData.health = target.userData.maxHealth;
    target.userData.totalHeight = settings.targetHeight + settings.targetWidth;

    const bodyWidthScale = settings.targetWidth / 0.36;
    const bodyHeightScale = settings.targetHeight / TARGET_BODY_BASE_HEIGHT;
    const headScale = settings.targetWidth / (TARGET_HEAD_RADIUS * 2);

    target.userData.body.scale.set(bodyWidthScale, bodyHeightScale, bodyWidthScale);
    target.userData.body.position.y = settings.targetHeight / 2;
    target.userData.head.scale.setScalar(headScale);
    target.userData.head.position.y = settings.targetHeight + (TARGET_HEAD_RADIUS * 2 * headScale) / 2;

    updateTargetPosition(target);
    applyTargetHealthVisuals(target);
  }

  function getRandomTargetMoveSpeed() {
    return randomRange(settings.targetHorizontalSpeedMin, settings.targetHorizontalSpeedMax);
  }

  function getSpawnBounds() {
    const spawnBoxHalfWidth = (backWall.geometry.parameters.width * settings.targetSpawnWidthFactor) / 2;
    const spawnBoxCenterX = camera.position.x;
    return {
      minX: spawnBoxCenterX - spawnBoxHalfWidth,
      maxX: spawnBoxCenterX + spawnBoxHalfWidth,
      minY: TARGET_FEET_CLEARANCE,
      maxY: TARGET_FEET_CLEARANCE + settings.targetSpawnYVariance,
      minZ: camera.position.z - settings.spawnDistanceMax,
      maxZ: camera.position.z - settings.spawnDistanceMin
    };
  }

  function getHorizontalVelocity(moveSpeed, spawnX, centerX) {
    return new THREE.Vector3(spawnX >= centerX ? -moveSpeed : moveSpeed, 0, 0);
  }

  function getTargetVerticalOffset(target) {
    if (settings.targetVerticalOscillationAmplitude <= 0 || settings.targetVerticalOscillationSpeed <= 0) {
      return 0;
    }

    return (
      Math.sin(target.userData.age * settings.targetVerticalOscillationSpeed + target.userData.verticalOscillationPhase) *
      settings.targetVerticalOscillationAmplitude
    );
  }

  function updateTargetPosition(target) {
    target.position.copy(target.userData.basePosition);
    applyTargetStrafeOffset(target);
    target.position.y = Math.max(
      target.position.y + getTargetVerticalOffset(target),
      target.userData.feetClearance
    );
  }

  function applyTargetStrafeOffset(target) {
    const playerPosition = camera.position;
    const relativePosition = target.userData.basePosition.clone().sub(playerPosition).setY(0);
    if (relativePosition.lengthSq() <= 0.0001 || settings.targetStrafeAmount <= 0 || settings.targetStrafeOscillationSpeed <= 0) {
      return;
    }

    const perpendicular = new THREE.Vector3(relativePosition.z, 0, -relativePosition.x).normalize();
    const strafeOffset =
      getTriangleWave(target.userData.age * settings.targetStrafeOscillationSpeed + target.userData.strafePhase) *
      settings.targetStrafeAmount;
    target.position.addScaledVector(perpendicular, strafeOffset);
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
      if (state.hasPlayerFiredShot) {
        target.userData.fireCooldown = Math.max(0, target.userData.fireCooldown - delta);
      }
      target.userData.basePosition.addScaledVector(target.userData.horizontalVelocity, delta);
      target.userData.basePosition.y = Math.max(target.userData.basePosition.y, target.userData.feetClearance);
      updateTargetPosition(target);

      if (!state.isGameOver && state.hasPlayerFiredShot && target.userData.fireCooldown <= 0) {
        for (let burstIndex = 0; burstIndex < settings.targetProjectilesPerBurst; burstIndex += 1) {
          const burstCenterOffset = burstIndex - (settings.targetProjectilesPerBurst - 1) / 2;
          fireTargetProjectile(target, burstCenterOffset * settings.targetProjectileBurstSpread);
        }
        target.userData.fireCooldown = getNextTargetFireCooldown(target);
      }

      if (target.userData.age >= target.userData.lifetime) {
        respawnTarget(target);
      }
    }
  }

  return {
    targets,
    setFireTargetProjectile,
    getTargetRoot,
    applyHitToTarget,
    getSpawnBounds,
    resetTargets,
    updateTargets
  };
}

function getNextTargetFireCooldown(target, isInitialSpawn = false) {
  const settings = target.userData.settings;
  const baseInterval = randomRange(settings.targetFireIntervalMin, settings.targetFireIntervalMax) * target.userData.fireIntervalScale;
  const jitter = randomRange(settings.targetFireIntervalJitterMin, settings.targetFireIntervalJitterMax);
  const initialDelay = isInitialSpawn ? randomRange(0, settings.targetInitialFireDelayMax) : 0;
  return baseInterval + jitter + initialDelay;
}
