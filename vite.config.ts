import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import {crx} from '@crxjs/vite-plugin'
// @ts-ignore WebStorm reads tsconfig.node.json and incorrectly marks this as an error
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                newpost: 'src/new-post/index.html',
            }
        },
    },
    plugins: [
        svelte(),
        crx({manifest})
    ]
})
