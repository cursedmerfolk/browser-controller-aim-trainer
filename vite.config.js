import { defineConfig } from 'vite';

const REPOSITORY_NAME = 'browser-controller-aim-trainer';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${REPOSITORY_NAME}/` : '/'
}));
