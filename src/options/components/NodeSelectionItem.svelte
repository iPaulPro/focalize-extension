<script lang="ts">
    import type {LensNode} from "../../lib/lens-nodes";

    import IconLenster from '../../assets/ic_lenster.webp';
    import IconLenstube from '../../assets/ic_lenstube.webp';
    import IconLensPort from '../../assets/ic_lensport.webp';
    import IconLensta from '../../assets/ic_lensta.webp';
    import IconPinsta from '../../assets/ic_pinsta.webp';
    import IconAmnisiac from '../../assets/ic_amnisiac.webp';
    import IconShare from '../../assets/ic_shr.webp';
    import IconBeats from '../../assets/ic_beats.webp';

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