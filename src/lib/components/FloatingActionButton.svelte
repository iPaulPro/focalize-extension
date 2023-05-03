<script lang="ts">
    import {hideOnScroll} from '../utils';

    export let scrollElement: HTMLElement;
</script>

<div use:hideOnScroll={{scrollElement, reversed: true}}
    class="absolute bottom-4 right-6">

  <button class="btn btn-icon rounded-full w-14 h-14 variant-filled-secondary !shadow-xl">

    <slot></slot>

  </button>

</div>