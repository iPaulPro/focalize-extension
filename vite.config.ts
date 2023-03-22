import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import {crx} from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import nodePolyfills from 'vite-plugin-node-stdlib-browser'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'src/index.html'
            },
        },
        commonjsOptions: {
            transformMixedEsModules: true
        },
    },
    plugins: [
        nodePolyfills(),
        svelte(),
        crx({manifest})
    ],
})