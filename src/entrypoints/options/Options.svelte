<script lang="ts">
    import { toast, Toaster } from 'svelte-sonner';

    import { currentUser } from '@/lib/stores/user-store';
    import { darkMode, pinPromptShown } from '@/lib/stores/preferences-store';

    import { onMount, tick } from 'svelte';
    import AllSettings from './components/AllSettings.svelte';
    import PinPromptDialog from './components/PinPromptDialog.svelte';
    import DialogOuter from '@/lib/components/DialogOuter.svelte';
    import { isOnToolbar } from '@/lib/utils/utils';
    import { get } from '@/lib/stores/chrome-storage-store';
    import Login from './components/Login.svelte';
    import { isAuthenticated } from '@/lib/lens-service';
    import { NoWalletError } from '@/lib/utils/error-utils';

    let loading = true;

    let pinPromptDialog: HTMLDialogElement;
    let showPinPromptDialog = false;

    const showPinPromptIfNecessary = async () => {
        if (!$currentUser) return;

        const onToolbar = await isOnToolbar();
        if (!onToolbar && !$pinPromptShown) {
            showPinPromptDialog = true;
            await tick();
            pinPromptDialog?.showModal();
        }
    };

    const onLoginError = async (event: CustomEvent) => {
        if (event.detail instanceof NoWalletError) {
            toast.error('Unable to connect to wallet', { duration: 5000 });
        }
    };

    const ensureUser = async () => {
        if (await get(currentUser)) return;

        const authenticated = await isAuthenticated();
        if (!authenticated) {
            console.warn('Error getting access token');
            $currentUser = null;
        }
    };

    $: if ($darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    $: if ($currentUser) {
        showPinPromptIfNecessary();
    }

    const checkSystemColorScheme = async () => {
        try {
            const dm = await get(darkMode);
            if (dm === undefined) {
                $darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        } catch (e) {
            console.warn('Error checking system color scheme', e);
        }
    };

    onMount(async () => {
        await checkSystemColorScheme();

        try {
            await ensureUser();
        } catch {
            // expected if not logged in
        } finally {
            loading = false;
        }
    });
</script>

{#if loading}
    <main class="h-[100dvh] w-full">
        <div class="flex h-full w-full items-center justify-center">
            <span class="echo-loader">Loading…</span>
        </div>
    </main>
{:else if $currentUser?.account}
    <AllSettings />
{:else}
    <Login on:error={onLoginError} />
{/if}

{#if showPinPromptDialog}
    <dialog
        id="pinPromptDialog"
        bind:this={pinPromptDialog}
        on:close={() => (showPinPromptDialog = false)}
        class="min-h-[20rem] w-2/3 rounded-2xl border border-gray-200 p-0 shadow-2xl dark:border-gray-700 dark:bg-gray-800
          lg:w-1/3"
    >
        <DialogOuter title="⚠️ Focalize is meant to be pinned!">
            <PinPromptDialog on:dismiss={() => pinPromptDialog.close()} />
        </DialogOuter>
    </dialog>
{/if}

<Toaster richColors position="bottom-right" expand={true} />

<style global>
    /* :not(:required) hides this rule from IE9 and below */
    .echo-loader:not(:required) {
        width: 40px;
        height: 40px;
        border: 6px solid #ff0000;
        border-radius: 50%;
        animation: echo-loader 1.4s ease-in;
        animation-iteration-count: infinite;
        display: inline-block;
        text-indent: 100%;
        overflow: hidden;
    }

    @keyframes echo-loader {
        0% {
            transform: scale(0);
            opacity: 0;
        }
        25% {
            transform: scale(0);
            opacity: 0.1;
        }
        50% {
            transform: scale(0.1);
            opacity: 0.3;
        }
        75% {
            transform: scale(0.5);
            opacity: 0.5;
        }
        100% {
            transform: scale(1);
            opacity: 0;
        }
    }
</style>
