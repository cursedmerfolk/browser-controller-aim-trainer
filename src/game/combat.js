import * as THREE from 'three';
import { PROJECTILE_UP_AXIS, TARGET_PROJECTILE_DAMAGE, TARGET_PROJECTILE_HIT_RADIUS } from '../config/constants.js';
import { getDistanceToSegment, getTriangleWave, randomRange } from '../utils/math.js';

export function createCombatSystem({
  scene,
  camera,
  rendererDomElement,
  state,
  settings,
  raycaster,
  targets,
  getCameraOrigin,
  getProjectileStart,
  updateCamera,
  getTargetRoot,
  applyHitToTarget,
  getNearestTargetInCone,
  getTargetAimPoint
}) {
  const projectiles = [];
  const enemyProjectiles = [];
  const projectileGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1, 10);
  const projectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff2b6,
    emissive: 0xffb347,
    emissiveIntensity: 1.2,
    roughness: 0.15
  });
  const enemyProjectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xff7a7a,
    emissive: 0xff3d3d,
    emissiveIntensity: 1,
    roughness: 0.25
  });

  function updateFiring(delta, shootPressed, allowAimAssist) {
    state.fireCooldown = Math.max(0, state.fireCooldown - delta);

    if (!shootPressed) {
      state.fireCooldown = 0;
      return false;
    }

    const shotInterval = 1 / settings.projectileRate;
    let remainingShots = 4;
    let firedShots = 0;

    while (state.fireCooldown <= 0 && remainingShots > 0) {
      fireShot(allowAimAssist);
      state.fireCooldown += shotInterval;
      remainingShots -= 1;
      firedShots += 1;
    }

    return firedShots > 0;
  }

  function fireShot(allowAimAssist) {
    state.shots += 1;
    state.hasPlayerFiredShot = true;

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

    const shotDirection = getShotDirection(shotOffset, allowAimAssist);
    const shotOrigin = getCameraOrigin();
    raycaster.set(shotOrigin, shotDirection);
    const intersections = raycaster.intersectObjects(targets, true);
    const magnetismRaycastHit = intersections[0] ? null : getMagnetismRaycastHit(shotOrigin, shotDirection, allowAimAssist);
    const hitPoint = intersections[0]?.point ?? magnetismRaycastHit?.hitPoint ?? getMissPoint();

    if (intersections.length > 0) {
      const hitObject = intersections[0].object;
      applyHitToTarget(getTargetRoot(hitObject), hitObject === getTargetRoot(hitObject).userData.head);
    } else if (magnetismRaycastHit) {
      applyHitToTarget(magnetismRaycastHit.target, magnetismRaycastHit.isHeadshot);
    }

    createProjectileVisual(getProjectileStart(), hitPoint);
  }

  function getMissPoint() {
    return raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(settings.projectileMaxDistance));
  }

  function getShotDirection(shotOffset, allowAimAssist) {
    raycaster.setFromCamera(shotOffset, camera);
    const baseDirection = raycaster.ray.direction.clone();

    if (!allowAimAssist || settings.bulletMagnetism <= 0) {
      return baseDirection;
    }

    const magnetismTarget = getNearestTargetInCone(
      getCameraOrigin(),
      baseDirection,
      THREE.MathUtils.degToRad(settings.bulletMagnetismConeAngle)
    );
    if (!magnetismTarget) {
      return baseDirection;
    }

    const magnetizedDirection = getTargetAimPoint(magnetismTarget).sub(getCameraOrigin()).normalize();
    return baseDirection.addScaledVector(magnetizedDirection, settings.bulletMagnetism).normalize();
  }

  function getMagnetismRaycastHit(origin, direction, allowAimAssist) {
    if (
      !allowAimAssist ||
      settings.bulletMagnetism <= 0 ||
      settings.bulletMagnetismConeAngle <= 0
    ) {
      return null;
    }

    const target = getNearestTargetInCone(
      origin,
      direction,
      THREE.MathUtils.degToRad(settings.bulletMagnetismConeAngle)
    );
    if (!target) {
      return null;
    }

    const hitCandidates = [
      {
        hitPoint: target.localToWorld(target.userData.head.position.clone()),
        isHeadshot: true
      },
      {
        hitPoint: target.localToWorld(target.userData.body.position.clone()),
        isHeadshot: false
      }
    ];
    let bestHit = null;
    let bestAngle = Number.POSITIVE_INFINITY;
    let bestDistance = Number.POSITIVE_INFINITY;
    const normalizedDirection = direction.clone().normalize();

    for (const candidate of hitCandidates) {
      const toHitPoint = candidate.hitPoint.clone().sub(origin);
      const distance = toHitPoint.length();
      if (distance <= 0.0001) {
        continue;
      }

      const angle = normalizedDirection.angleTo(toHitPoint.clone().normalize());
      if (angle < bestAngle || (Math.abs(angle - bestAngle) < 0.0001 && distance < bestDistance)) {
        bestHit = candidate;
        bestAngle = angle;
        bestDistance = distance;
      }
    }

    return bestHit ? { ...bestHit, target } : null;
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
    const baseSpread = THREE.MathUtils.lerp(settings.hipFireSpreadNdc, settings.adsSpreadNdc, state.aimBlend);
    return baseSpread + state.spreadKick * settings.shotSpreadKickNdc;
  }

  function getCurrentSpreadPx() {
    const baseSpread = THREE.MathUtils.lerp(settings.hipFireSpreadPx, settings.adsSpreadPx, state.aimBlend);
    return baseSpread + state.spreadKick * settings.shotSpreadKickPx;
  }

  function getRecoilPoint(shotIndex) {
    const step = shotIndex;
    const intensityOscillation =
      getTriangleWave(step * settings.recoilIntensityOscillationSpeed) * settings.recoilIntensityOscillator;
    const intensityScale = Math.max(0, 1 + intensityOscillation);
    const expectedX =
      Math.sin(step * settings.recoilHorizontalOscillationSpeed) *
      settings.recoilHorizontalOscillationStrength *
      intensityScale;
    const varianceX = settings.recoilVariance <= 0 ? 0 : randomRange(-settings.recoilVariance, settings.recoilVariance);
    const varianceY = settings.recoilVariance <= 0 ? 0 : randomRange(-settings.recoilVariance, settings.recoilVariance);

    return new THREE.Vector2(
      expectedX + varianceX,
      Math.max(0, settings.recoilYStrength + varianceY)
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
      duration: Math.max(distance / settings.projectileSpeed, 0.02)
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

  function fireTargetProjectile(target, aimOffsetX = 0) {
    const start = target.localToWorld(target.userData.head.position.clone());
    const aimedPoint = getCameraOrigin();
    aimedPoint.x += aimOffsetX;
    const toTargetPoint = aimedPoint.clone().sub(start);
    const distance = toTargetPoint.length();

    if (distance <= 0.0001) {
      return;
    }

    const mesh = new THREE.Mesh(projectileGeometry, enemyProjectileMaterial);
    const direction = toTargetPoint.normalize();
    mesh.position.copy(start);
    mesh.quaternion.setFromUnitVectors(PROJECTILE_UP_AXIS, direction);
    scene.add(mesh);

    enemyProjectiles.push({
      mesh,
      start,
      end: aimedPoint,
      direction,
      distance,
      previousHead: start.clone(),
      trailLength: Math.min(Math.max(distance * 0.3, 1.5), 4.5),
      progress: 0,
      duration: Math.max(distance / settings.enemyProjectileSpeed, 0.04)
    });
  }

  function updateEnemyProjectiles(delta) {
    const playerPoint = getCameraOrigin();

    for (let index = enemyProjectiles.length - 1; index >= 0; index -= 1) {
      const projectile = enemyProjectiles[index];
      projectile.progress += delta / projectile.duration;

      const clampedProgress = Math.min(projectile.progress, 1);
      const headDistance = projectile.distance * clampedProgress;
      const tailDistance = Math.max(0, headDistance - projectile.trailLength);
      const head = projectile.start.clone().addScaledVector(projectile.direction, headDistance);
      const tail = projectile.start.clone().addScaledVector(projectile.direction, tailDistance);
      const segment = head.clone().sub(tail);
      const segmentLength = Math.max(segment.length(), 0.001);
      const midpoint = tail.clone().addScaledVector(segment, 0.5);

      projectile.mesh.position.copy(midpoint);
      projectile.mesh.quaternion.setFromUnitVectors(PROJECTILE_UP_AXIS, projectile.direction);
      projectile.mesh.scale.set(1, segmentLength, 1);

      if (getDistanceToSegment(playerPoint, projectile.previousHead, head) <= TARGET_PROJECTILE_HIT_RADIUS) {
        applyDamageToPlayer(TARGET_PROJECTILE_DAMAGE);
        scene.remove(projectile.mesh);
        enemyProjectiles.splice(index, 1);
        continue;
      }

      projectile.previousHead.copy(head);

      if (projectile.progress >= 1) {
        scene.remove(projectile.mesh);
        enemyProjectiles.splice(index, 1);
      }
    }
  }

  function clearProjectiles() {
    for (const projectile of projectiles) {
      scene.remove(projectile.mesh);
    }
    projectiles.length = 0;
  }

  function clearEnemyProjectiles() {
    for (const projectile of enemyProjectiles) {
      scene.remove(projectile.mesh);
    }
    enemyProjectiles.length = 0;
  }

  function applyDamageToPlayer(amount) {
    if (state.isGameOver) {
      return;
    }

    state.playerHealth = Math.max(0, state.playerHealth - amount);
    state.damageFlash = 1;
    state.damageFlinch = 1;
    state.damageFlinchDirection = Math.random() < 0.5 ? -1 : 1;
    if (state.playerHealth > 0) {
      return;
    }

    state.isGameOver = true;
    state.mouseShootPressed = false;
    state.mouseAdsPressed = false;

    if (document.pointerLockElement === rendererDomElement) {
      document.exitPointerLock?.();
    }
  }

  return {
    updateFiring,
    getCurrentSpreadPx,
    updateProjectiles,
    fireTargetProjectile,
    updateEnemyProjectiles,
    clearProjectiles,
    clearEnemyProjectiles
  };
}
