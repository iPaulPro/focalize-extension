<script lang="ts">
    import InlineSVG from 'svelte-inline-svg'
    import IconEarth from '../../assets/ic_earth.svg'
    import IconFollowers from '../../assets/ic_followers.svg'
    import IconLock from '../../assets/ic_lock.svg'
    import IconFriends from '../../assets/ic_friends.svg'
    import IconFriendsOfFriends from '../../assets/ic_friends_of_friends.svg'
    import IconCollectFree from '../../assets/ic_collect_free.svg'
    import IconCollectPaid from '../../assets/ic_collect_paid.svg'
    import IconCollectDisabled from '../../assets/ic_collect_disabled.svg'
    import IconSettings from '../../assets/ic_settings.svg'
    import {compactMode} from "../../lib/stores/preferences-store";
    import type {SelectOption} from '../../lib/publications/lens-modules';

    export let item: SelectOption<any>;
</script>

<div class="flex items-center px-5 {$compactMode ? 'py-2' : 'py-3'} cursor-pointer dark:text-gray-100 hover:bg-orange-300 dark:hover:bg-gray-800 active:bg-orange">

  <div class="w-5 shrink-0 transition-none">
    {#if item.icon === 'earth'}
      <InlineSVG src={IconEarth} class="w-5 h-5" />
    {:else if item.icon === 'followers'}
      <InlineSVG src={IconFollowers} class="w-5 h-5" />
    {:else if item.icon === 'lock'}
      <InlineSVG src={IconLock} class="w-5 h-5" />
    {:else if item.icon === 'friends'}
      <InlineSVG src={IconFriends} class="w-5 h-5" />
    {:else if item.icon === 'friends_of_friends'}
      <InlineSVG src={IconFriendsOfFriends} class="w-5 h-5" />
    {:else if item.icon === 'collect_free'}
      <InlineSVG src={IconCollectFree} class="w-5 h-5" />
    {:else if item.icon === 'collect_paid'}
      <InlineSVG src={IconCollectPaid} class="w-5 h-5" />
    {:else if item.icon === 'collect_disabled'}
      <InlineSVG src={IconCollectDisabled} class="w-5 h-5" />
    {/if}
  </div>

  <div class="w-max flex flex-col pl-4 pr-2">
    <div class="font-semibold text-sm">{item.label}</div>
    <div class="pt-1 text-xs whitespace-pre-line">{item.summary}</div>
  </div>

</div>