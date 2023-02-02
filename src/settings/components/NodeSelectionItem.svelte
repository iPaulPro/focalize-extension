<script lang="ts">
    import type {LensNode} from "../../lib/lens-nodes";

    import IconLenster from '../../../public/images/ic-lenster.webp';
    import IconLenstube from '../../../public/images/ic-lenstube.webp';
    import IconLensPort from '../../../public/images/ic-lensport.webp';
    import IconLensta from '../../../public/images/ic-lensta.webp';
    import IconPinsta from '../../../public/images/ic-pinsta.webp';
    import IconAmnisiac from '../../../public/images/ic-amnisiac.webp';
    import IconShare from '../../../public/images/ic-shr.webp';
    import IconBeats from '../../../public/images/ic-beats.webp';

    export let selection: LensNode = undefined;
</script>

<div class="flex items-center">
  
  {#if selection.name === 'Lenster'}
    <img src={IconLenster} alt="Lenster icon" class="w-5 h-5">
  {:else if selection.name === 'Lenstube'}
    <img src={IconLenstube} alt="Lenstube icon" class="w-5 h-5">
  {:else if selection.name === 'LensPort'}
    <img src={IconLensPort} alt="LensPort icon" class="w-5 h-5">
  {:else if selection.name === 'Lensta'}
    <img src={IconLensta} alt="Lensta icon" class="w-5 h-5">
  {:else if selection.name === 'Pinsta'}
    <img src={IconPinsta} alt="Pinsta icon" class="w-5 h-5">
  {:else if selection.name === 'Amnisiac'}
    <img src={IconAmnisiac} alt="Amnisiac icon" class="w-5 h-5">
  {:else if selection.name === 'Share'}
    <img src={IconShare} alt="Share icon" class="w-5 h-5">
  {:else if selection.name === 'Beats'}
    <img src={IconBeats} alt="Beats icon" class="w-5 h-5">
  {/if}

  <div class="pl-3 font-semibold sm:text-sm">
    {selection.name}
  </div>
</div>

<style>
</style>