/**
 * Vite configuration for InventoryHub.
 *
 * Integrates React, Tailwind CSS, and Vitest.
 * Base path is set for GitHub Pages deployment.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
