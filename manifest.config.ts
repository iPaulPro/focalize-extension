import { defineManifest } from '@crxjs/vite-plugin';
// @ts-ignore
import packageJson from './package.json';

const { version } = packageJson;
const isProduction = process.env.NODE_ENV === 'production';

export default defineManifest((env) => ({
    manifest_version: 3,
    name: `Focalize -  ${
        isProduction ? 'DApp for Lens Protocol (Beta)' : 'Debug'
    }`,
    short_name: 'Focalize',
    version,
    version_name: '2.0.0-beta.18',
    description: 'Social app built on Lens Protocol with DMs via XMTP',
    permissions: [
        'activeTab',
        'scripting',
        'storage',
        'notifications',
        'alarms',
    ],
    options_page: 'src/options/index.html',
    action: {
        default_title: 'Share on Lens',
        default_icon: {
            '16': 'images/icon-16.png',
            '24': 'images/icon-24.png',
            '32': 'images/icon-32.png',
            '64': 'images/icon-64.png',
            '128': 'images/icon-128.png',
            '512': 'images/icon-512.png',
        },
        default_popup: 'src/popup/index.html',
    },
    icons: {
        '16': 'images/icon-16.png',
        '24': 'images/icon-24.png',
        '32': 'images/icon-32.png',
        '64': 'images/icon-64.png',
        '128': 'images/icon-128.png',
        '512': 'images/icon-512.png',
    },
    background: {
        service_worker: 'src/background.ts',
        type: 'module',
    },
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxDr/ngNd7cYwCDGM9HhkGKFqIE/WlvMX5UJfFC/vGmBTS+uLpUKs/xFDi//MKEGmdckEEu/HpZsA9VAttTGM1ATjOawA36MHzXIhyQzsqzykUzCynIQeAus+UhLhTvmUZ3120VmggGA3uHlbq4o985Iyifw77wjemSPFcgwJV7jdCZoZe8FpPpgDqo0Qt2oMIMF5tbfz37n03CEjoLDR2S/+DP2rJErC6DwqvTVFWdqKp6wMbNEcYi4nvuGVfWc0gMZGFOYvjDD6SUBmkgteK6kA/DzcqvDfrVW5CUZ3Zfcv+eQ/vqq4AzghEH8RpJCGJjKAs8yx6d6cSAyaKrSfkQIDAQAB',
    minimum_chrome_version: '91',
    omnibox: {
        keyword: 'lens',
    },
    ...(!isProduction && {
        host_permissions: ['*://api-v2-amoy.lens.dev/*'],
    }),
}));
