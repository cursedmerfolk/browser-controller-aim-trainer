import * as THREE from 'three';

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function getTriangleWave(value) {
  const normalizedCycle = ((value / (Math.PI * 2)) + 0.25) % 1;
  return 1 - 4 * Math.abs(normalizedCycle - 0.5);
}

export function clampSetting(value, min, max, fallback) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return THREE.MathUtils.clamp(value, min, max);
}

export function getDistanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 0.000001) {
    return point.distanceTo(start);
  }

  const projection = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  const closestPoint = start.clone().addScaledVector(segment, projection);
  return point.distanceTo(closestPoint);
}
