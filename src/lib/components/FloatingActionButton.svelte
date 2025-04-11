<script lang="ts">
    import { hideOnScroll } from '../utils/utils';
    import { createEventDispatcher } from 'svelte';

    export let scrollElement: HTMLElement;

    const dispatch = createEventDispatcher<any>();
</script>

<div use:hideOnScroll={{ scrollElement, reversed: true }} class="absolute bottom-4 right-5">
    <button
        on:click={() => dispatch('click')}
        class="btn btn-icon variant-filled-secondary h-14 w-14 rounded-full !shadow-xl"
    >
        <slot></slot>
    </button>
</div>
