# Browser Controller Aim Trainer

A minimal first-person aim trainer that runs in a web browser and reads controller input through the browser Gamepad API.

The app uses:

- Vite for local development
- Three.js for simple 3D rendering
- Browser Gamepad API for controller input
- Keyboard fallback controls for testing without a controller
- Game and gun setting profiles with selectable dropdowns and create-new prompts
- Live controller tuning controls for controller sensitivity, mouse sensitivity, deadzone, FOV, FPS max, invert-Y, and response curves
- Live projectile-rate, aim-assist, min/max target-speed, target Y spawn variance, target Y oscillation, and recoil tuning controls with keyboard-editable numeric inputs
- ADS with a simple rifle viewmodel, tighter aim handling, and automatic fire
- Four aim-assist controls: bullet magnetism, aim slow, aim stickiness, and ADS snap
- A toggle for showing or hiding the aim-assist debug shapes
- Up to three moving multi-hit targets that shift from green to red as they take damage, including optional sinusoidal Y motion
- Enemy target shots, player health, and loss/restart flow
- VS Code Dev Containers for a reproducible development environment

## Getting started in VS Code Dev Containers

1. Open this folder in VS Code.
2. Choose **Dev Containers: Reopen in Container**.
3. Wait for `npm install` to complete.
4. Run:

```bash
npm run dev
```

5. Open the forwarded Vite URL, usually:

```text
http://localhost:5173
```

The proof of concept is ready when the browser shows:

- a 3D range with floating sphere targets
- visible projectile tracers that animate even though hits are resolved immediately
- a rifle-like held weapon in first person
- a dynamic tick-mark crosshair that tightens when aiming down sights
- score, hits, misses, accuracy, 50 health, FPS, and raw stick values in the HUD
- a centered game-over screen with Restart button support
- a controller settings panel with game profile and gun profile selectors, plus sensitivity, mouse sensitivity, deadzone, FOV, FPS max, projectile rate, bullet magnetism, aim slow, aim stickiness, ADS snap, min target speed, max target speed, target Y spawn variance, target Y oscillation amplitude, target Y oscillation speed, recoil Y strength, recoil variance, recoil horizontal oscillation, recoil horizontal oscillation speed, recoil intensity oscillator, recoil intensity oscillator speed, invert-Y, show debug shapes, and response curves
- mouse-look desktop controls with no auto aim, plus keyboard fallback strafing/shooting

## Local scripts

```bash
npm run lint
npm run build
```

## Controls

Controller:

- Right stick: aim
- Left stick: strafe left/right
- Left trigger / L2: aim down sights
- Right trigger / R2: fire
- Start: restart after game over

Mouse and keyboard:

- Click the game view: capture mouse aim
- A / D or left / right arrows: strafe left/right
- Left click or Space: fire
- Right click: toggle aim down sights
- Shift: hold aim down sights
- Enter: restart after game over

## Browser notes

The app reads controller state with `navigator.getGamepads()` once per animation frame. Some browsers only expose a controller after a button is pressed, so press a button if the HUD does not immediately show your controller.

Chrome and Edge are usually the easiest browsers to start with for Gamepad API testing.

Browsers typically require one click or key press before Web Audio can play, so interact with the page once if you do not hear the target hit tick immediately.
