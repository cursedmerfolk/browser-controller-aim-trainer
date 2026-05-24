# Project Plan: Browser Controller FPS Aim Trainer

## Project goal

Build a simple in-browser first-person shooter aim trainer focused on controller input. The first version should be intentionally small: simple 3D graphics, basic target shooting, score tracking, and controller aiming through the browser Gamepad API.

This project is meant to become a foundation for experimenting with controller-specific aim training features such as dead zones, sensitivity curves, response curves, aim acceleration, target tracking, flick drills, recoil practice, and analytics.

## Current implementation scope

The initial implementation includes:

- A Vite web app.
- A Three.js 3D scene.
- A first-person camera.
- Several floating spherical targets.
- A centered crosshair.
- Controller support using the Gamepad API.
- Right-stick aiming.
- Right-trigger shooting.
- Keyboard fallback controls.
- Score, shots, hits, and accuracy display.
- A VS Code Dev Container setup.

## Intended development environment

The project is designed for VS Code Dev Containers.

Important files:

- `.devcontainer/devcontainer.json` defines the Node.js development container.
- `package.json` defines scripts and dependencies.
- `src/main.js` contains the current game logic.
- `src/style.css` contains HUD and crosshair styling.
- `index.html` loads the app.

To start development:

```bash
npm install
npm run dev
```

Inside the dev container, `npm install` should run automatically from `postCreateCommand`.

## Architecture overview

### Rendering

Three.js renders a very simple 3D shooting range. The scene currently contains:

- A floor plane.
- A back wall.
- Hemisphere and directional lighting.
- Multiple sphere targets.
- A perspective camera that acts as the player view.

### Input

Controller input is read through:

```js
navigator.getGamepads()
```

The app polls the active gamepad every animation frame. This is important because gamepad input is generally not event-driven like keyboard input.

Current default mapping:

- Right stick X: `axes[2]`
- Right stick Y: `axes[3]`
- Right trigger / R2: `buttons[7]`
- Right bumper fallback: `buttons[5]`

The current mapping is Xbox-style / standard-layout oriented. Future work should add a controller calibration screen because PlayStation, Switch, and generic controllers may expose slightly different axes or button indexes.

### Aiming model

The right stick modifies camera yaw and pitch.

Current tuning constants are in `src/main.js` under the `SETTINGS` object:

```js
const SETTINGS = {
  lookSensitivity: 2.8,
  deadzone: 0.12,
  targetCount: 8,
  targetRadius: 0.45,
  spawnZMin: -18,
  spawnZMax: -8,
  spawnXRange: 6.5,
  spawnYMin: 0.8,
  spawnYMax: 4.2
};
```

The first useful improvements should probably focus on this area.

### Shooting

Shooting uses a Three.js `Raycaster` from the center of the screen. If the ray intersects a target, the target is respawned and the score increases.

This means the crosshair is always the aim point.

## Recommended next milestones

### Milestone 1: Make controller feel better

Add a small settings panel with:

- Sensitivity slider.
- Deadzone slider.
- Invert Y toggle.
- Response curve selector.
- Raw stick debug display.

A good first implementation would support these response curves:

- Linear.
- Quadratic.
- Cubic.

This would let the project begin testing how controller aim actually feels.

### Milestone 2: Add controller calibration

Create a calibration screen that lets the user identify:

- Left stick axes.
- Right stick axes.
- Fire button / trigger.
- Pause/menu button.

Store the mapping in `localStorage`.

### Milestone 3: Add training modes

Add multiple simple drills:

1. Static targets.
2. Moving horizontal targets.
3. Vertical tracking targets.
4. Random pop-up targets.
5. Timed 60-second score challenge.

Each mode should report accuracy, hits, shots, and average time-to-hit.

### Milestone 4: Add analytics

Track useful metrics:

- Accuracy.
- Hits per minute.
- Average time-to-hit.
- Miss distance estimate.
- Stick movement before shot.
- Overshoot/undershoot patterns.

Start simple. Store a local session history in `localStorage`.

### Milestone 5: Improve 3D feel

The visual style can remain simple, but the range should become easier to read:

- Better target materials.
- Hit effects.
- Shot sound.
- Respawn animation.
- Optional grid wall/floor.
- Optional target distance labels.

## Suggested first task for the VS Code AI

Start by adding a settings panel to the existing app.

Requirements:

- Add visible controls for sensitivity and deadzone.
- Update `SETTINGS.lookSensitivity` and `SETTINGS.deadzone` live when sliders change.
- Show raw right-stick X/Y values in the HUD.
- Add an invert-Y checkbox.
- Keep the current keyboard fallback working.

This task is small, improves usability immediately, and prepares the project for controller tuning experiments.

## Important implementation notes

- Gamepad input should continue to be polled in the animation loop.
- Avoid relying only on `gamepadconnected`; some browsers expose controllers only after a button is pressed.
- Do not assume every controller has the same layout.
- Keep input mapping logic isolated as the app grows.
- Keep training modes separate from rendering code once the app becomes larger.
- Keep the first-person camera simple until the controller feel is good.

## Possible future folder structure

As the project grows, consider refactoring to:

```text
src/
  main.js
  input/
    gamepad.js
    keyboard.js
    responseCurves.js
  training/
    staticTargets.js
    trackingTargets.js
    timedChallenge.js
  render/
    scene.js
    targets.js
    hud.js
  storage/
    settingsStorage.js
    sessionStorage.js
```

For now, the single-file `src/main.js` approach is acceptable because the project is still tiny.
