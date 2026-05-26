import * as THREE from 'three';
import { MUZZLE_SCALE, PLAYER_EYE_HEIGHT } from '../config/constants.js';

const FLOOR_VISUAL_OFFSET = 0.16;

export function createSceneSystem({ app, settings, state }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  app.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 36, 110);

  const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, PLAYER_EYE_HEIGHT, 0);
  scene.add(camera);
  const previousCameraOrigin = camera.position.clone();

  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x223355, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
  directionalLight.position.set(3, 8, 4);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const floorTexture = createCheckerboardTexture();
  floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 180),
    new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.82 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -64;
  floor.receiveShadow = true;
  scene.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 22),
    new THREE.MeshStandardMaterial({ color: 0x182039, roughness: 0.8 })
  );
  backWall.position.set(0, 11, -88);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const weapon = createWeaponModel();
  camera.add(weapon);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function getCameraOrigin() {
    return camera.getWorldPosition(new THREE.Vector3());
  }

  function getCameraForward() {
    return camera.getWorldDirection(new THREE.Vector3()).normalize();
  }

  function updateCamera() {
    floor.position.y = settings.targetSpawnFloor - FLOOR_VISUAL_OFFSET;
    camera.rotation.order = 'YXZ';
    const flinchProgress = 1 - state.damageFlinch;
    const flinchYaw = Math.sin(flinchProgress * Math.PI * 3) * 0.014 * state.damageFlinchDirection * state.damageFlinch;
    const flinchPitch = Math.sin(flinchProgress * Math.PI * 4) * 0.01 * state.damageFlinch;
    const flinchRoll = Math.sin(flinchProgress * Math.PI * 3.5) * 0.02 * state.damageFlinchDirection * state.damageFlinch;

    camera.rotation.y = state.yaw + flinchYaw;
    camera.rotation.x = state.pitch + flinchPitch;
    camera.rotation.z = flinchRoll;

    const targetFov = THREE.MathUtils.lerp(settings.fov, getAdsFov(), state.aimBlend);
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }

  function getAdsFov() {
    return THREE.MathUtils.clamp(settings.fov * settings.adsFovMultiplier, 35, settings.fov);
  }

  function updateWeaponTransform() {
    const baseTransform = getBaseWeaponTransform();

    weapon.position.set(
      baseTransform.position.x + state.recoilPatternX * 0.01 * (1 - state.aimBlend * 0.85),
      baseTransform.position.y - state.weaponKick * 0.025 - state.recoilPatternY * 0.008,
      baseTransform.position.z + state.weaponKick * 0.05
    );

    weapon.rotation.set(
      baseTransform.rotation.x + state.weaponKick * 0.14 + state.recoilPatternY * 0.06,
      baseTransform.rotation.y,
      baseTransform.rotation.z - state.recoilPatternX * 0.09 * (1 - state.aimBlend * 0.85)
    );
  }

  function getBaseWeaponTransform() {
    return {
      position: new THREE.Vector3(
        THREE.MathUtils.lerp(0.24, 0, state.aimBlend),
        THREE.MathUtils.lerp(-0.2, -0.12, state.aimBlend),
        THREE.MathUtils.lerp(-0.16, -0.1, state.aimBlend)
      ),
      rotation: new THREE.Euler(
        THREE.MathUtils.lerp(-0.06, 0, state.aimBlend),
        THREE.MathUtils.lerp(-0.12, 0, state.aimBlend),
        THREE.MathUtils.lerp(-0.02, 0, state.aimBlend),
        'XYZ'
      ),
      scale: MUZZLE_SCALE
    };
  }

  function getProjectileStart() {
    const weaponTransform = getBaseWeaponTransform();
    const muzzleMatrix = new THREE.Matrix4()
      .makeRotationFromEuler(weaponTransform.rotation)
      .setPosition(weaponTransform.position);

    return camera.localToWorld(weapon.userData.barrelTipLocal.clone().applyMatrix4(muzzleMatrix));
  }

  return {
    renderer,
    scene,
    camera,
    backWall,
    weapon,
    previousCameraOrigin,
    getCameraOrigin,
    getCameraForward,
    updateCamera,
    updateWeaponTransform,
    getProjectileStart
  };
}

function createCheckerboardTexture() {
  const canvas = document.createElement('canvas');
  const tileCount = 8;
  const tileSize = 32;
  canvas.width = tileCount * tileSize;
  canvas.height = tileCount * tileSize;

  const context = canvas.getContext('2d');
  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? '#24304a' : '#121a2b';
      context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 30);
  return texture;
}

function createWeaponModel() {
  const rifle = new THREE.Group();

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111722, roughness: 0.8, metalness: 0.15 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3f57, roughness: 0.55, metalness: 0.2 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.34), darkMaterial);
  receiver.position.set(0, -0.02, -0.27);
  rifle.add(receiver);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), accentMaterial);
  stock.position.set(0, -0.02, 0);
  rifle.add(stock);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.28), accentMaterial);
  handguard.position.set(0, -0.02, -0.58);
  rifle.add(handguard);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 12), darkMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, -0.02, -1);
  rifle.add(barrel);
  rifle.userData.barrelTipLocal = new THREE.Vector3(0, -0.02, -1.5);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.16), accentMaterial);
  sight.position.set(0, 0.0475, -0.27);
  rifle.add(sight);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), darkMaterial);
  grip.position.set(0, -0.15, -0.16);
  rifle.add(grip);

  return rifle;
}
