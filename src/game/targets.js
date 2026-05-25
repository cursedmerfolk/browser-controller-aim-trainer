import * as THREE from 'three';
import {
  BODY_SHOT_DAMAGE,
  FULL_HEALTH_COLOR,
  FULL_HEALTH_EMISSIVE,
  HEAD_SHOT_DAMAGE,
  LOW_HEALTH_COLOR,
  LOW_HEALTH_EMISSIVE,
  TARGET_BODY_BASE_HEIGHT,
  TARGET_FIRE_INTERVAL_MAX,
  TARGET_FIRE_INTERVAL_MIN,
  TARGET_HEAD_RADIUS,
  TARGET_PROJECTILE_BURST_SPREAD,
  TARGET_PROJECTILES_PER_BURST,
  TARGET_SPAWN_WIDTH_FACTOR
} from '../config/constants.js';
import { getTriangleWave, randomRange } from '../utils/math.js';

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
    target.userData.body = body;
    target.userData.head = head;
    target.userData.fireIntervalScale = randomRange(0.8, 1.3);
    target.userData.fireIntervalJitter = randomRange(0.15, 0.85);
    target.userData.strafePhase = 0;
    target.userData.widthScale = 1;
    target.userData.bodyHeightScale = 1.45;
    target.userData.feetClearance = 0.04;
    target.userData.verticalOscillationPhase = 0;
    target.userData.fireCooldown = 0;
    target.userData.material = material;
    target.userData.totalHeight = TARGET_BODY_BASE_HEIGHT + TARGET_HEAD_RADIUS * 2;

    return target;
  }

  function applyHitToTarget(target, isHeadshot = false) {
    state.hits += 1;
    target.userData.health -= isHeadshot ? HEAD_SHOT_DAMAGE : BODY_SHOT_DAMAGE;
    playHitTickSound();

    if (target.userData.health <= 0) {
      state.score += 1;
      respawnTarget(target);
      return;
    }

    applyTargetHealthVisuals(target);
  }

  function respawnTarget(target) {
    const distance = randomRange(settings.spawnDistanceMin, settings.spawnDistanceMax);
    const spawnBoxHalfWidth = (backWall.geometry.parameters.width * TARGET_SPAWN_WIDTH_FACTOR) / 2;
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
        target.userData.feetClearance + settings.targetSpawnYVariance
      );
    }

    const moveSpeed = getRandomTargetMoveSpeed();
    const horizontalVelocity = getHorizontalVelocity(moveSpeed, worldPosition.x, spawnBoxCenterX);

    target.userData.basePosition.copy(worldPosition);
    target.userData.horizontalVelocity.copy(horizontalVelocity);
    target.userData.moveSpeed = moveSpeed;
    target.userData.age = 0;
    target.userData.lifetime = randomRange(settings.targetLifetimeMin, settings.targetLifetimeMax);
    target.userData.verticalOscillationPhase = randomRange(0, Math.PI * 2);
    target.userData.fireCooldown = getNextTargetFireCooldown(target, true);
    target.userData.strafePhase = randomRange(0, Math.PI * 2);
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
    return randomRange(settings.targetHorizontalSpeedMin, settings.targetHorizontalSpeedMax);
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
      target.userData.fireCooldown = Math.max(0, target.userData.fireCooldown - delta);
      target.userData.basePosition.addScaledVector(target.userData.horizontalVelocity, delta);
      target.userData.basePosition.y = Math.max(target.userData.basePosition.y, target.userData.feetClearance);
      updateTargetPosition(target);

      if (!state.isGameOver && target.userData.fireCooldown <= 0) {
        for (let burstIndex = 0; burstIndex < TARGET_PROJECTILES_PER_BURST; burstIndex += 1) {
          const burstCenterOffset = burstIndex - (TARGET_PROJECTILES_PER_BURST - 1) / 2;
          fireTargetProjectile(target, burstCenterOffset * TARGET_PROJECTILE_BURST_SPREAD);
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
    resetTargets,
    updateTargets
  };
}

function getNextTargetFireCooldown(target, isInitialSpawn = false) {
  const baseInterval = randomRange(TARGET_FIRE_INTERVAL_MIN, TARGET_FIRE_INTERVAL_MAX) * target.userData.fireIntervalScale;
  const jitter = randomRange(0, target.userData.fireIntervalJitter);
  const initialDelay = isInitialSpawn ? randomRange(0, 1.1) : 0;
  return baseInterval + jitter + initialDelay;
}
