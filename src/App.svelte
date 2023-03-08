<script lang="ts">
    import Router from 'svelte-spa-router';
    import {wrap} from 'svelte-spa-router/wrap';

    import Settings from './settings/Settings.svelte';
    import NotFound from './components/NotFound.svelte';
    import {darkMode} from "./lib/store/preferences-store";

    const routes = {
        '/': Settings,

        '/post': wrap({
            asyncComponent: () => import('./new-post/NewPost.svelte')
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