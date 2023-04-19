import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import {crx} from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import nodePolyfills from 'vite-plugin-node-stdlib-browser'
import removeConsole from "vite-plugin-remove-console";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                window: 'src/window/index.html',
            },
        },
        commonjsOptions: {
            transformMixedEsModules: true
        },
    },
    plugins: [
        nodePolyfills(),
        svelte({
            onwarn: (warning, handler) => {
                if (warning.code === 'a11y-click-events-have-key-events' ||
                    warning.code === 'a11y-media-has-caption') {
                    return;
                }
                handler(warning);
            }
        }),
        crx({manifest}),
        removeConsole({includes: ['log', 'warn', 'info']})
    ],
})