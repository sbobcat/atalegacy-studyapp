import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['src/main.tsx', 'src/index.css'],
        },
    },
    resolve: {
        alias: {
            '@lib': path.resolve(import.meta.dirname, 'src/lib'),
            '@store': path.resolve(import.meta.dirname, 'src/store'),
            '@components': path.resolve(import.meta.dirname, 'src/components'),
            '@pages': path.resolve(import.meta.dirname, 'src/pages'),
        },
    },
});
