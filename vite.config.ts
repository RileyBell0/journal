import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import fs from 'fs';

export default defineConfig({
	server: {
		https: {
			key: fs.readFileSync('/etc/ssl/server.key'),
			cert: fs.readFileSync('/etc/ssl/server.crt')
		},
		port: 3000
	},
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
