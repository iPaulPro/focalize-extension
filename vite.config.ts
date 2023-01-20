import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import {crx} from '@crxjs/vite-plugin'
// @ts-ignore WebStorm reads tsconfig.node.json and incorrectly marks this as an error
import manifest from './manifest.json'

import nodePolyfills from 'rollup-plugin-polyfill-node';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'src/index.html'
            },
            plugins: [
                nodePolyfills()
            ]
        }
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
