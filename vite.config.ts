import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import {crx} from '@crxjs/vite-plugin'
import manifest from './manifest.config'

import nodePolyfills from "rollup-plugin-node-polyfills";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'src/index.html'
            },
            plugins: [
                nodePolyfills()
            ]
        },
        commonjsOptions: {
            transformMixedEsModules: true
        },
    },
    plugins: [
        svelte(),
        crx({manifest})
    ],
    resolve: {
        alias: {
            process: "process/browser",
            stream: "stream-browserify",
            util: "util/",
        }
    },
})
