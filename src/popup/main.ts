import './theme.pcss';
import '@skeletonlabs/skeleton/styles/all.css';
import './popup.pcss';
import App from './Popup.svelte';

const app = new App({
    target: document.getElementById('app')!!,
});

export default app;
