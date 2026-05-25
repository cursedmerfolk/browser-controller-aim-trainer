import * as THREE from 'three';
import { CENTER_SCREEN } from '../config/constants.js';

export function createAimAssistSystem({ state, settings, camera, targets, raycaster, getCameraOrigin, getCameraForward }) {
  function getTargetRoot(object) {
    return object.userData.targetRoot ?? object;
  }

  function applyLookInput(lookX, lookY, delta, aimSlowTarget, usingControllerAim) {
    let sensitivityMultiplier = THREE.MathUtils.lerp(1, settings.adsSensitivityMultiplier, state.aimBlend);
    if (usingControllerAim && aimSlowTarget && settings.aimSlow > 0) {
      sensitivityMultiplier *= THREE.MathUtils.lerp(1, 0.25, settings.aimSlow);
    }

    const horizontalLookSensitivity = settings.lookSensitivity * sensitivityMultiplier;
    const verticalLookSensitivity = horizontalLookSensitivity * settings.controllerVerticalSensitivityRatio;
    const verticalLook = settings.invertY ? -lookY : lookY;

    state.yaw -= lookX * horizontalLookSensitivity * delta;
    state.pitch -= verticalLook * verticalLookSensitivity * delta;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -0.85, 0.85);
  }

  function applyMouseLookInput(mouseLookX, mouseLookY) {
    if (mouseLookX === 0 && mouseLookY === 0) {
      return;
    }

    const sensitivityMultiplier = THREE.MathUtils.lerp(1, settings.adsSensitivityMultiplier, state.aimBlend);
    const lookSensitivity = settings.mouseSensitivity * sensitivityMultiplier * 0.0025;
    const verticalLook = settings.invertY ? -mouseLookY : mouseLookY;

    state.yaw -= mouseLookX * lookSensitivity;
    state.pitch -= verticalLook * lookSensitivity;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -0.85, 0.85);
  }

  function applyAimAssist(delta) {
    const directAimTarget = getDirectAimTarget();
    if (directAimTarget && settings.aimStickiness > 0) {
      state.yaw += getStickinessYawNudge(directAimTarget, delta) * settings.aimStickiness;
    }

    if (isAdsSnapActive() && settings.adsSnap > 0) {
      const nearbyTarget = getNearestTargetInCylinder(
        getCameraOrigin(),
        getCameraForward(),
        settings.adsSnapRadius,
        settings.projectileMaxDistance
      );
      if (nearbyTarget) {
        nudgeAimTowardTarget(nearbyTarget, 1 - Math.exp(-delta * settings.adsSnapPullSpeed * settings.adsSnap), false);
      }
    }
  }

  function isAdsSnapActive() {
    return state.isAimingDownSights && state.aimBlend <= settings.adsSnapBlendMax;
  }

  function getDirectAimTarget() {
    raycaster.setFromCamera(CENTER_SCREEN, camera);
    const intersections = raycaster.intersectObjects(targets, true);
    return intersections[0] ? getTargetRoot(intersections[0].object) : null;
  }

  function getAimSlowTarget() {
    return getNearestTargetInCone(getCameraOrigin(), getCameraForward(), THREE.MathUtils.degToRad(settings.aimSlowConeAngle));
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

  function getNearestTargetInCone(origin, direction, maxAngle = THREE.MathUtils.degToRad(settings.bulletMagnetismConeAngle)) {
    let nearestTarget = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestAngle = Number.POSITIVE_INFINITY;
    const normalizedDirection = direction.clone().normalize();

    for (const target of targets) {
      const toTarget = getTargetAimPoint(target, origin, normalizedDirection).sub(origin);
      const distance = toTarget.length();
      if (distance <= 0.0001 || distance > settings.projectileMaxDistance) {
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

  return {
    applyLookInput,
    applyMouseLookInput,
    applyAimAssist,
    isAdsSnapActive,
    getAimSlowTarget,
    getNearestTargetInCone,
    getTargetAimPoint
  };
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
