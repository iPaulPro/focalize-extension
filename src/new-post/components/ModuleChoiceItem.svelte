<script lang="ts">
    import InlineSVG from 'svelte-inline-svg'
    import IconEarth from '../../assets/ic_earth.svg'
    import IconFollowers from '../../assets/ic_followers.svg'
    import IconCollectFree from '../../assets/ic_collect_free.svg'
    import IconCollectPaid from '../../assets/ic_collect_paid.svg'
    import IconCollectDisabled from '../../assets/ic_collect_disabled.svg'
    import IconSettings from '../../assets/ic_settings.svg'

    export let item = undefined;
</script>

<div class="flex items-center py-3 cursor-pointer">

  {#if item.icon === 'earth'}
    <InlineSVG src={IconEarth} class="w-5 h-5" />
  {:else if item.icon === 'followers'}
    <InlineSVG src={IconFollowers} class="w-5 h-5" />
  {:else if item.icon === 'collect_free'}
    <InlineSVG src={IconCollectFree} class="w-5 h-5" />
  {:else if item.icon === 'collect_paid'}
    <InlineSVG src={IconCollectPaid} class="w-5 h-5" />
  {:else if item.icon === 'collect_disabled'}
    <InlineSVG src={IconCollectDisabled} class="w-5 h-5" />
  {/if}

  <div class="flex flex-col grow pl-3">
    <div class="font-semibold text-sm">{item.label}</div>
    <div class="pr-2 pt-1 text-xs">{item.summary}</div>
  </div>

  {#if item.btn}
    <div class="h-full flex items-center">
      <button type="button" class="hover:bg-orange-700 bg-opacity-50 rounded-full p-2">
        <InlineSVG src={IconSettings} class="w-5 h-5" on:click={item.btn} />
      </button>
    </div>
  {/if}
</div>