import * as THREE from 'three';
import { DEBUG_VISUAL_OFFSET } from '../config/constants.js';

export function createDebugSystem({ scene, camera, settings, getCameraOrigin, getCameraForward, isAdsSnapActive }) {
  const group = new THREE.Group();
  scene.add(group);
  let magnetismCone;
  let adsSnapCylinder;
  let debugGeometryKey = '';

  function rebuildDebugGeometryIfNeeded() {
    const nextKey = `${settings.projectileMaxDistance}|${settings.bulletMagnetismConeAngle}|${settings.adsSnapRadius}`;
    if (nextKey === debugGeometryKey) {
      return;
    }

    group.clear();
    const lineLength = settings.projectileMaxDistance;
    magnetismCone = createDebugCone(THREE.MathUtils.degToRad(settings.bulletMagnetismConeAngle), lineLength, 0xffb347);
    adsSnapCylinder = createDebugCylinder(settings.adsSnapRadius, lineLength, 0xff4d6d);
    group.add(magnetismCone);
    group.add(adsSnapCylinder);
    debugGeometryKey = nextKey;
  }

  function updateAimAssistDebugVisuals() {
    rebuildDebugGeometryIfNeeded();
    const debugOrigin = getCameraOrigin().addScaledVector(getCameraForward(), DEBUG_VISUAL_OFFSET);
    group.position.copy(debugOrigin);
    group.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
    group.visible = settings.showDebugShapes;
    magnetismCone.visible = settings.showDebugShapes && settings.bulletMagnetism > 0;
    adsSnapCylinder.visible = settings.showDebugShapes && settings.adsSnap > 0 && isAdsSnapActive();
  }

  return {
    updateAimAssistDebugVisuals
  };
}

function createDebugLine(color, length) {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length)]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 12;
  return line;
}

function createDebugCone(angle, length, color) {
  const radius = Math.tan(angle) * length;
  const coneGroup = new THREE.Group();
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 24, 1, true), surfaceMaterial);
  cone.rotation.x = Math.PI / 2;
  cone.position.z = -length / 2;
  cone.renderOrder = 10;
  coneGroup.add(cone);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.ConeGeometry(radius, length, 24, 1, true)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  wireframe.rotation.x = Math.PI / 2;
  wireframe.position.z = -length / 2;
  wireframe.renderOrder = 12;
  coneGroup.add(wireframe);

  const baseRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 32 }, (_, index) => {
        const theta = (index / 32) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, -length);
      })
    ),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  baseRing.renderOrder = 12;
  coneGroup.add(baseRing);

  const centerLine = createDebugLine(color, length);
  coneGroup.add(centerLine);

  return coneGroup;
}

function createDebugCylinder(radius, length, color) {
  const cylinderGroup = new THREE.Group();
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24, 1, true), surfaceMaterial);
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.z = -length / 2;
  cylinder.renderOrder = 10;
  cylinderGroup.add(cylinder);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(radius, radius, length, 24, 1, true)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  wireframe.rotation.x = Math.PI / 2;
  wireframe.position.z = -length / 2;
  wireframe.renderOrder = 12;
  cylinderGroup.add(wireframe);

  const endRingMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const frontRing = createDebugRing(radius, 0, endRingMaterial);
  const backRing = createDebugRing(radius, -length, endRingMaterial);
  cylinderGroup.add(frontRing);
  cylinderGroup.add(backRing);

  const centerLine = createDebugLine(color, length);
  cylinderGroup.add(centerLine);

  return cylinderGroup;
}

function createDebugRing(radius, z, material) {
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 32 }, (_, index) => {
        const theta = (index / 32) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
      })
    ),
    material
  );
  ring.renderOrder = 12;
  return ring;
}
