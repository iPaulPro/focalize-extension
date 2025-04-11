<script lang="ts">
    import ImageAvatar from '~/assets/ic_avatar.svg';
    import FloatingComponent from './FloatingComponent.svelte';
    import AccountHoverCard from './AccountHoverCard.svelte';
    import type { Account } from '@lens-protocol/client';
    import { getAccountAvatar } from '../utils/lens-utils';

    export let account: Account;
    export let size: string = 'w-8 h-8';
    export let border: boolean = false;
    export let overlap: boolean = false;

    let avatarElement: HTMLImageElement;

    $: src = getAccountAvatar(account);
</script>

<img
    loading="lazy"
    decoding="async"
    src={src ?? ImageAvatar}
    alt="avatar"
    bind:this={avatarElement}
    class="{size} {border && 'border-2 border-white dark:border-gray-800'} {overlap &&
        '-ml-2 first:ml-0'}
     z-0 aspect-square rounded-full bg-gray-300 object-cover text-white hover:z-10"
/>

{#if avatarElement && account}
    <FloatingComponent anchors={[avatarElement]} showDelay={500} hideDelay={200} interactive={true}>
        <AccountHoverCard {account} />
    </FloatingComponent>
{/if}

<style>
</style>
