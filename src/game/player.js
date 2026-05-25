import * as THREE from 'three';
import { PLAYER_EYE_HEIGHT, PLAYER_MAX_HEALTH } from '../config/constants.js';

export function createPlayerSystem({
  state,
  settings,
  camera,
  previousCameraOrigin,
  getCameraOrigin,
  updateCamera,
  resetTargets,
  clearProjectiles,
  clearEnemyProjectiles
}) {
  function restartGame() {
    state.score = 0;
    state.shots = 0;
    state.hits = 0;
    state.playerHealth = PLAYER_MAX_HEALTH;
    state.isGameOver = false;
    state.lastFrameTime = null;
    state.yaw = 0;
    state.pitch = 0;
    state.spreadKick = 0;
    state.weaponKick = 0;
    state.fireCooldown = 0;
    state.hasPlayerFiredShot = false;
    state.recoilShotIndex = 0;
    state.recoilPatternX = 0;
    state.recoilPatternY = 0;
    state.pendingMouseLookX = 0;
    state.pendingMouseLookY = 0;
    state.mouseShootPressed = false;
    state.mouseAdsToggled = false;
    state.damageFlash = 0;
    state.hitConfirmFlash = 0;
    state.damageFlinch = 0;
    state.restartPressedLastFrame = false;
    state.strafeVelocityX = 0;
    state.gamepadTimestampMs = null;
    state.gamepadRenderDelayMs = null;
    state.displayedGamepadRenderDelayMs = null;
    state.lastGamepadDelayDisplayUpdateMs = 0;
    camera.position.set(0, PLAYER_EYE_HEIGHT, 0);
    previousCameraOrigin.copy(camera.position);
    updateCamera();
    resetTargets();
    clearProjectiles();
    clearEnemyProjectiles();
  }

  function updateFrameDecay(delta) {
    state.spreadKick = Math.max(0, state.spreadKick - delta * 3.5);
    state.weaponKick = Math.max(0, state.weaponKick - delta * 6);
    state.damageFlash = Math.max(0, state.damageFlash - delta * 2.6);
    state.hitConfirmFlash = Math.max(0, state.hitConfirmFlash - delta * 16);
    state.damageFlinch = Math.max(0, state.damageFlinch - delta * 6.5);
    state.recoilPatternX = THREE.MathUtils.lerp(state.recoilPatternX, 0, 1 - Math.exp(-delta * 10));
    state.recoilPatternY = THREE.MathUtils.lerp(state.recoilPatternY, 0, 1 - Math.exp(-delta * 8));
  }

  function updateAimInputState(delta, adsPressed, shootPressed) {
    state.isAimingDownSights = adsPressed;
    state.aimBlend = THREE.MathUtils.lerp(state.aimBlend, adsPressed ? 1 : 0, 1 - Math.exp(-delta * 14));
    if (!shootPressed) {
      state.recoilShotIndex = 0;
    }
  }

  function applyPlayerMovement(moveX, delta) {
    const targetVelocityX = moveX * settings.maxStrafeSpeed;
    state.strafeVelocityX = THREE.MathUtils.damp(state.strafeVelocityX, targetVelocityX, settings.strafeAcceleration, delta);

    if (Math.abs(state.strafeVelocityX) < 0.001) {
      state.strafeVelocityX = 0;
    }

    camera.position.x += state.strafeVelocityX * delta;
    camera.position.y = PLAYER_EYE_HEIGHT;
  }

  function updatePlayerVelocity(delta) {
    if (delta <= 0) {
      state.playerVelocity.set(0, 0, 0);
      return;
    }

    const currentCameraOrigin = getCameraOrigin();
    state.playerVelocity.copy(currentCameraOrigin).sub(previousCameraOrigin).divideScalar(delta);
    previousCameraOrigin.copy(currentCameraOrigin);
  }

  return {
    restartGame,
    updateFrameDecay,
    updateAimInputState,
    applyPlayerMovement,
    updatePlayerVelocity
  };
}
