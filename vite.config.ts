import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import fs from 'fs';

export default defineConfig({
    server: {
        host: 'localhost',
        port: 3000,
        https: {
            key: fs.readFileSync('/etc/ssl/server.key'),
            cert: fs.readFileSync('/etc/ssl/server.crt')
        },
    },
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
});
