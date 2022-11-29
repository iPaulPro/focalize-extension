<script lang="ts">
    import {replace} from 'svelte-spa-router'
    import {onMount} from "svelte";

    onMount(async () => {
        await replace('/');
    })
</script>