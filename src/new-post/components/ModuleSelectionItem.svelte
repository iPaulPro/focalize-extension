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

    export let selection = undefined;
</script>

<div class="flex items-center py-2 text-orange-700 hover:text-orange-900 dark:text-orange-200">

  {#if selection.icon === 'earth'}
    <InlineSVG src={IconEarth} class="w-5 h-5" />
  {:else if selection.icon === 'followers'}
    <InlineSVG src={IconFollowers} class="w-5 h-5" />
  {:else if selection.icon === 'lock'}
    <InlineSVG src={IconLock} class="w-5 h-5" />
  {:else if selection.icon === 'friends'}
    <InlineSVG src={IconFriends} class="w-5 h-5" />
  {:else if selection.icon === 'friends_of_friends'}
    <InlineSVG src={IconFriendsOfFriends} class="w-5 h-5" />
  {:else if selection.icon === 'collect_free'}
    <InlineSVG src={IconCollectFree} class="w-5 h-5" />
  {:else if selection.icon === 'collect_paid'}
    <InlineSVG src={IconCollectPaid} class="w-5 h-5" />
  {:else if selection.icon === 'collect_disabled'}
    <InlineSVG src={IconCollectDisabled} class="w-5 h-5" />
  {/if}

  <div class="px-3 font-semibold sm:text-sm">
    {selection.label}
  </div>

</div>