# Browser Controller Aim Trainer

A minimal first-person aim trainer that runs in a web browser and reads controller input through the browser Gamepad API.

The app uses:

- Vite for local development
- Three.js for simple 3D rendering
- Browser Gamepad API for controller input
- Keyboard fallback controls for testing without a controller
- Live controller tuning controls for sensitivity, deadzone, FOV, invert-Y, and response curves
- Live projectile-rate, aim-assist, min/max target-speed, and recoil tuning controls with keyboard-editable numeric inputs
- ADS with a simple rifle viewmodel, tighter aim handling, and automatic fire
- Four aim-assist controls: bullet magnetism, aim slow, aim stickiness, and ADS snap
- Moving multi-hit targets that shift from green to red as they take damage
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
- score, hits, shots, accuracy, and raw stick values in the HUD
- a controller settings panel for sensitivity, deadzone, FOV, projectile rate, bullet magnetism, aim slow, aim stickiness, ADS snap, min target speed, max target speed, recoil Y strength, recoil variance, recoil horizontal oscillation, recoil horizontal oscillation speed, recoil intensity oscillator, recoil intensity oscillator speed, invert-Y, and response curves
- keyboard fallback aiming and shooting if no controller is connected

## Local scripts

```bash
npm run lint
npm run build
```

## Controls

Controller:

- Right stick: aim
- Left trigger / L2: aim down sights
- Right trigger / R2: fire

Keyboard fallback:

- WASD or arrow keys: aim
- Shift: aim down sights
- Space: fire

## Browser notes

The app reads controller state with `navigator.getGamepads()` once per animation frame. Some browsers only expose a controller after a button is pressed, so press a button if the HUD does not immediately show your controller.

Chrome and Edge are usually the easiest browsers to start with for Gamepad API testing.
