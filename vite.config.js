import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Base path for subdirectory hosting (e.g. GitHub Pages).
// Set VITE_BASE_PATH env var to override, e.g. '/atalegacy-studyapp/'
const base = process.env.VITE_BASE_PATH ?? '/';
// https://vitejs.dev/config/
export default defineConfig({
    base,
    plugins: [react()],
    resolve: {
        alias: {
            '@lib': path.resolve(__dirname, 'src/lib'),
            '@store': path.resolve(__dirname, 'src/store'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@pages': path.resolve(__dirname, 'src/pages'),
        },
    },
    build: {
        // Ensure the xlsx source file in assets/ is never included in the bundle
        rollupOptions: {
            external: [],
        },
    },
});
