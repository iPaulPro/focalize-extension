import '../../theme.pcss';
import '../../../lib/styles/tribute.pcss';
import '@skeletonlabs/skeleton/styles/all.css';
import App from './Thread.svelte';

const app = new App({
    target: document.getElementById('app')!!,
});

export default app;
