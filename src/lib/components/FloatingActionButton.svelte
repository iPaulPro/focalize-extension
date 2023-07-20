<script lang="ts">
    import {hideOnScroll} from '../utils/utils';
    import {createEventDispatcher} from 'svelte';

    export let scrollElement: HTMLElement;

    const dispatch = createEventDispatcher();
</script>

<div use:hideOnScroll={{scrollElement, reversed: true}}
     class="absolute bottom-4 right-5">

  <button on:click={() => dispatch('click')}
          class="btn btn-icon rounded-full w-14 h-14 variant-filled-secondary !shadow-xl">

    <slot></slot>

  </button>

</div>