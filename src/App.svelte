<script lang="ts">
    import Router from 'svelte-spa-router';
    import {wrap} from 'svelte-spa-router/wrap';

    import Settings from './options/Settings.svelte';
    import NotFound from './lib/components/NotFound.svelte';
    import {darkMode} from "./lib/stores/preferences-store";

    const routes = {
        '/': Settings,

        '/post': wrap({
            asyncComponent: () => import('./popup/NewPost.svelte')
        }),

        '*': NotFound,
    }

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
</script>

<Router {routes}/>