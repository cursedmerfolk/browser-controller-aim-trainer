import * as THREE from 'three';
import { PLAYER_MAX_HEALTH } from '../config/constants.js';
import { createProfileStateController } from '../state/profile-state.js';
import { renderHudMarkup, renderControlsMarkup, getHudElements, updateCrosshair, updateHud } from '../ui/hud.js';
import { renderSettingsPanelMarkup, getSettingsPanelElements, createSettingsPanelController } from '../ui/settings-panel.js';
import { createGamepadInput } from '../input/gamepad.js';
import { createMouseKeyboardInput } from '../input/mouse-keyboard.js';
import { createPlayerSystem } from '../game/player.js';
import { createCombatSystem } from '../game/combat.js';
import { createTargetSystem } from '../game/targets.js';
import { createAimAssistSystem } from '../game/aim-assist.js';
import { createSceneSystem } from '../rendering/scene.js';
import { createDebugSystem } from '../rendering/debug.js';
import { createHitSoundController } from '../audio/hit-sounds.js';

export function bootstrapApp() {
  const profileController = createProfileStateController();
  const { settings } = profileController;
  const state = createInitialState();
  const raycaster = new THREE.Raycaster();

  const app = document.querySelector('#app');
  app.innerHTML =
    renderHudMarkup({ gamepadName: state.gamepadName, playerMaxHealth: PLAYER_MAX_HEALTH }) +
    renderSettingsPanelMarkup({ settings, profileController }) +
    renderControlsMarkup();

  const hudElements = getHudElements();
  const settingsElements = getSettingsPanelElements();
  const hitSoundController = createHitSoundController();
  const sceneSystem = createSceneSystem({ app, settings, state });
  const targetSystem = createTargetSystem({
    scene: sceneSystem.scene,
    camera: sceneSystem.camera,
    backWall: sceneSystem.backWall,
    state,
    settings,
    playHitTickSound: hitSoundController.playHitTickSound
  });
  const aimAssistSystem = createAimAssistSystem({
    state,
    settings,
    camera: sceneSystem.camera,
    targets: targetSystem.targets,
    raycaster,
    getCameraOrigin: sceneSystem.getCameraOrigin,
    getCameraForward: sceneSystem.getCameraForward
  });
  const debugSystem = createDebugSystem({
    scene: sceneSystem.scene,
    camera: sceneSystem.camera,
    settings,
    getCameraOrigin: sceneSystem.getCameraOrigin,
    getCameraForward: sceneSystem.getCameraForward,
    isAdsSnapActive: aimAssistSystem.isAdsSnapActive
  });
  const combatSystem = createCombatSystem({
    scene: sceneSystem.scene,
    camera: sceneSystem.camera,
    rendererDomElement: sceneSystem.renderer.domElement,
    state,
    settings,
    raycaster,
    targets: targetSystem.targets,
    getCameraOrigin: sceneSystem.getCameraOrigin,
    getProjectileStart: sceneSystem.getProjectileStart,
    updateCamera: sceneSystem.updateCamera,
    getTargetRoot: targetSystem.getTargetRoot,
    applyHitToTarget: targetSystem.applyHitToTarget,
    getNearestTargetInCone: aimAssistSystem.getNearestTargetInCone,
    getTargetAimPoint: aimAssistSystem.getTargetAimPoint
  });
  targetSystem.setFireTargetProjectile(combatSystem.fireTargetProjectile);

  const playerSystem = createPlayerSystem({
    state,
    settings,
    camera: sceneSystem.camera,
    previousCameraOrigin: sceneSystem.previousCameraOrigin,
    getCameraOrigin: sceneSystem.getCameraOrigin,
    updateCamera: sceneSystem.updateCamera,
    resetTargets: targetSystem.resetTargets,
    clearProjectiles: combatSystem.clearProjectiles,
    clearEnemyProjectiles: combatSystem.clearEnemyProjectiles
  });
  const gamepadInput = createGamepadInput({
    state,
    settings,
    onUnlockAudio: hitSoundController.unlockAudioOnInteraction
  });
  const mouseKeyboardInput = createMouseKeyboardInput({
    state,
    rendererDomElement: sceneSystem.renderer.domElement,
    onUnlockAudio: hitSoundController.unlockAudioOnInteraction
  });

  createSettingsPanelController({
    elements: settingsElements,
    hudElements,
    settings,
    profileController,
    onResetTargets: targetSystem.resetTargets,
    onDiscoverController: () => {
      gamepadInput.discoverController(true);
    }
  });

  hudElements.resetButton.addEventListener('click', playerSystem.restartGame);
  hudElements.gameOverRestartButton.addEventListener('click', playerSystem.restartGame);

  gamepadInput.bindEvents();
  mouseKeyboardInput.bindEvents();

  function getInputState() {
    const mouseKeyboardState = mouseKeyboardInput.getActionState();
    const gamepadState = gamepadInput.getActionState();
    const mouseLook = mouseKeyboardInput.consumeMouseLookInput();

    return {
      controllerLookX: gamepadState.controllerLookX,
      controllerLookY: gamepadState.controllerLookY,
      moveX: THREE.MathUtils.clamp(mouseKeyboardState.moveX + gamepadState.moveX, -1, 1),
      shootPressed: mouseKeyboardState.shootPressed || gamepadState.shootPressed,
      adsPressed: mouseKeyboardState.adsPressed || gamepadState.adsPressed,
      restartPressed: mouseKeyboardState.restartPressed || gamepadState.restartPressed,
      usingGamepad: gamepadState.usingGamepad,
      controllerAimAssistActive: gamepadState.controllerAimAssistActive,
      mouseLookX: mouseLook.mouseLookX,
      mouseLookY: mouseLook.mouseLookY
    };
  }

  function loop(frameTime = 0) {
    if (state.lastFrameTime === null) {
      state.lastFrameTime = frameTime;
      requestAnimationFrame(loop);
      return;
    }

    const frameInterval = settings.fpsMax > 0 ? 1000 / settings.fpsMax : 0;
    const elapsedMs = frameTime - state.lastFrameTime;

    if (frameInterval > 0 && elapsedMs < frameInterval) {
      requestAnimationFrame(loop);
      return;
    }

    const delta = Math.min(Math.max(elapsedMs, 0) / 1000, 0.1);
    state.lastFrameTime = frameTime;
    state.fps = delta > 0 ? 1 / delta : 0;
    playerSystem.updateFrameDecay(delta);
    const input = getInputState();
    if (state.isGameOver && input.restartPressed && !state.restartPressedLastFrame) {
      playerSystem.restartGame();
    }
    state.restartPressedLastFrame = input.restartPressed;
    const aimSlowTarget = input.controllerAimAssistActive ? aimAssistSystem.getAimSlowTarget() : null;

    playerSystem.updateAimInputState(delta, input.adsPressed, input.shootPressed);
    playerSystem.applyPlayerMovement(input.moveX, delta);
    aimAssistSystem.applyLookInput(
      input.controllerLookX,
      input.controllerLookY,
      delta,
      aimSlowTarget,
      input.controllerAimAssistActive
    );
    sceneSystem.updateCamera();
    if (input.controllerAimAssistActive && !state.isGameOver) {
      aimAssistSystem.applyAimAssist(delta);
      sceneSystem.updateCamera();
    }
    aimAssistSystem.applyMouseLookInput(input.mouseLookX, input.mouseLookY);
    sceneSystem.updateCamera();
    playerSystem.updatePlayerVelocity(delta);
    if (!state.isGameOver) {
      combatSystem.updateFiring(delta, input.shootPressed, input.controllerAimAssistActive);
    }
    debugSystem.updateAimAssistDebugVisuals();
    sceneSystem.updateWeaponTransform();
    targetSystem.updateTargets(delta);
    combatSystem.updateProjectiles(delta);
    combatSystem.updateEnemyProjectiles(delta);
    updateCrosshair(hudElements, state, combatSystem.getCurrentSpreadPx);
    updateHud(hudElements, state);

    sceneSystem.renderer.render(sceneSystem.scene, sceneSystem.camera);
    gamepadInput.updateGamepadRenderDelay();
    requestAnimationFrame(loop);
  }

  gamepadInput.discoverController();
  sceneSystem.updateWeaponTransform();
  updateCrosshair(hudElements, state, combatSystem.getCurrentSpreadPx);
  updateHud(hudElements, state);
  loop();
}

function createInitialState() {
  return {
    score: 0,
    shots: 0,
    hits: 0,
    fps: 0,
    lastFrameTime: null,
    playerHealth: PLAYER_MAX_HEALTH,
    isGameOver: false,
    activeGamepadIndex: null,
    gamepadName: 'No controller detected',
    gamepadTimestampMs: null,
    gamepadRenderDelayMs: null,
    displayedGamepadRenderDelayMs: null,
    lastGamepadDelayDisplayUpdateMs: 0,
    yaw: 0,
    pitch: 0,
    rawStickX: 0,
    rawStickY: 0,
    pendingMouseLookX: 0,
    pendingMouseLookY: 0,
    mouseShootPressed: false,
    mouseAdsToggled: false,
    damageFlash: 0,
    hitConfirmFlash: 0,
    damageFlinch: 0,
    damageFlinchDirection: 1,
    restartPressedLastFrame: false,
    strafeVelocityX: 0,
    playerVelocity: new THREE.Vector3(),
    isAimingDownSights: false,
    aimBlend: 0,
    spreadKick: 0,
    weaponKick: 0,
    fireCooldown: 0,
    hasPlayerFiredShot: false,
    recoilShotIndex: 0,
    recoilPatternX: 0,
    recoilPatternY: 0
  };
}
