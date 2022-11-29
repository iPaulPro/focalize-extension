<script lang="ts">
    import Router from 'svelte-spa-router';
    import {wrap} from 'svelte-spa-router/wrap';

    import Settings from './settings/Settings.svelte';
    import NotFound from './components/NotFound.svelte';

    const routes = {
        '/': Settings,

        '/post': wrap({
            asyncComponent: () => import('./new-post/NewPost.svelte')
        }),

        '*': NotFound,
    }
</script>

<Router {routes}/>