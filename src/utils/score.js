import { HIGH_SCORE_STORAGE_KEY } from '../config/constants.js';

export function getModifiedScore(state) {
  const accuracy = state.shots === 0 ? 0 : Math.round((state.hits / state.shots) * 100);
  return Number(((accuracy / 100) * state.score).toFixed(1));
}

export function loadHighScore() {
  const rawValue = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function storeHighScore(value) {
  window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
}
