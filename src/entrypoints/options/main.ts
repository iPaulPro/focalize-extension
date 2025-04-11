import '@/lib/styles/app.pcss';
import App from './Options.svelte';

const app = new App({
    target: document.getElementById('app')!,
});

export default app;
