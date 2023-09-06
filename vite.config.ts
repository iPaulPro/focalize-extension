import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import nodePolyfills from 'vite-plugin-node-stdlib-browser';
import removeConsole from 'vite-plugin-remove-console';
import resolve from '@rollup/plugin-node-resolve';
import inject from '@rollup/plugin-inject';
import manifest from './manifest.config';

const commonPlugins = [
    resolve({
        browser: true,
    }),
    nodePolyfills(),
    svelte({
        onwarn: (warning, handler) => {
            if (
                warning.code === 'a11y-click-events-have-key-events' ||
                warning.code === 'a11y-media-has-caption'
            ) {
                return;
            }
            handler(warning);
        },
    }),
    crx({ manifest }),
    removeConsole({ includes: ['log', 'warn', 'info'] }),
];

// vite-plugin-node-stdlib-browser only adds buffer to the global scope during optimization
if (process.env.NODE_ENV !== 'production') {
    commonPlugins.push(
        inject({
            modules: { Buffer: ['buffer', 'Buffer'] },
        })
    );
}

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                window: 'src/window/index.html',
                thread: 'src/popup/messaging/thread/index.html',
                xmtpLogin: 'src/popup/messaging/login/index.html',
            },
        },
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    plugins: commonPlugins,
});
