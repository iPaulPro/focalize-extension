import { defineConfig } from 'wxt';
import removeConsole from 'vite-plugin-remove-console';
import resolve from '@rollup/plugin-node-resolve';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// const isProduction = import.meta.env.MODE === 'production';

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    extensionApi: 'chrome',
    modules: ['@wxt-dev/module-svelte'],
    vite: (configEnv) => ({
        build: {
            commonjsOptions: {
                transformMixedEsModules: true,
            },
            rollupOptions: {
                plugins: [
                    resolve({
                        browser: true,
                        preferBuiltins: false,
                    }),
                ],
            },
        },
        plugins: [
            nodePolyfills(),
            ...(configEnv.mode === 'production'
                ? [removeConsole({ includes: ['log', 'warn', 'info'] })]
                : []),
        ],
    }),
    manifest: {
        name: `Focalize - DEVELOPMENT BUILD`,
        short_name: 'Focalize',
        version_name: '3.0.0-beta.1',
        description: 'THIS EXTENSION IS FOR BETA TESTING',
        permissions: ['activeTab', 'scripting', 'storage', 'notifications', 'alarms'],
        minimum_chrome_version: '91',
        omnibox: {
            keyword: 'lens',
        },
        key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxDr/ngNd7cYwCDGM9HhkGKFqIE/WlvMX5UJfFC/vGmBTS+uLpUKs/xFDi//MKEGmdckEEu/HpZsA9VAttTGM1ATjOawA36MHzXIhyQzsqzykUzCynIQeAus+UhLhTvmUZ3120VmggGA3uHlbq4o985Iyifw77wjemSPFcgwJV7jdCZoZe8FpPpgDqo0Qt2oMIMF5tbfz37n03CEjoLDR2S/+DP2rJErC6DwqvTVFWdqKp6wMbNEcYi4nvuGVfWc0gMZGFOYvjDD6SUBmkgteK6kA/DzcqvDfrVW5CUZ3Zfcv+eQ/vqq4AzghEH8RpJCGJjKAs8yx6d6cSAyaKrSfkQIDAQAB',
    },
});
