<script lang='ts'>
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import FloatingComponent from './FloatingComponent.svelte';
    import ProfileHoverCard from './ProfileHoverCard.svelte';
    import type { ProfileFragment } from '@lens-protocol/client';
    import { getProfileAvatar } from '../utils/lens-utils';

    export let profile: ProfileFragment;
    export let size: string = 'w-8 h-8';
    export let border: boolean = false;
    export let overlap: boolean = false;

    let avatarElement: HTMLImageElement;

    $: src = getProfileAvatar(profile);
</script>

<img loading='lazy' decoding='async' src={src ?? ImageAvatar} alt='avatar'
     bind:this={avatarElement}
     class="{size} {border && 'border-2 border-white dark:border-gray-800'} {overlap && '-ml-2 first:ml-0'}
     aspect-square rounded-full object-cover bg-gray-300 text-white hover:opacity-80">

{#if avatarElement && profile}
    <FloatingComponent anchors={[avatarElement]} showDelay={500} hideDelay={200} interactive={true}>
        <ProfileHoverCard {profile} />
    </FloatingComponent>
{/if}

<style>
</style>