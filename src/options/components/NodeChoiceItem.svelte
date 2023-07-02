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

    export let item: LensNode = undefined;
</script>

<div class="flex items-center py-3 cursor-pointer dark:text-gray-100 active:bg-orange">

  {#if item.name === 'Lenster'}
    <img src={IconLenster} alt="Lenster icon" class="w-5 h-5">
  {:else if item.name === 'Lenstube'}
    <img src={IconLenstube} alt="Lenstube icon" class="w-5 h-5">
  {:else if item.name === 'LensPort'}
    <img src={IconLensPort} alt="LensPort icon" class="w-5 h-5">
  {:else if item.name === 'Lensta'}
    <img src={IconLensta} alt="Lensta icon" class="w-5 h-5">
  {:else if item.name === 'Pinsta'}
    <img src={IconPinsta} alt="Pinsta icon" class="w-5 h-5">
  {:else if item.name === 'Amnisiac'}
    <img src={IconAmnisiac} alt="Amnisiac icon" class="w-5 h-5">
  {:else if item.name === 'Share'}
    <img src={IconShare} alt="Share icon" class="w-5 h-5">
  {:else if item.name === 'Beats'}
    <img src={IconBeats} alt="Beats icon" class="w-5 h-5">
  {/if}

  <div class="w-max flex flex-col pl-4 pr-8">
    <div class="font-semibold text-sm">{item.name}</div>
    <div class="pt-1 text-xs whitespace-pre-line">{item.baseUrl}</div>
  </div>
</div>

<style>
</style>