<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import { getSigner } from '@/lib/evm/ethers-service';
    import { onMount } from 'svelte';
    import { Signer } from '@lens-chain/sdk/ethers';
    import { getDefaultProvider } from '@/lib/evm/get-default-provider';
    import { debounce } from 'throttle-debounce';
    import { createAccount, isUsernameAvailable } from '@/lib/lens-service';
    import { account as accountMetadata } from '@lens-protocol/metadata';
    import { uploadJson } from '@/lib/grove-service';
    import { onLogin } from '@/lib/user/user';
    import { fade } from 'svelte/transition';
    import { z } from 'zod';
    import { onError } from '@/lib/utils/error-utils';

    const usernameSchema = z
        .string()
        .min(5, { message: 'Must be at least 5 characters long' })
        .regex(/^[a-z0-9]/, { message: 'Must start with a letter or number' })
        .regex(/^[a-z0-9_-]+$/, {
            message: 'Only lowercase letters, numbers, hyphens, and underscores are allowed',
        });

    let inputElement: HTMLInputElement;
    let signer: Signer;
    let ensName: string | null;
    let isSubmitting = false;
    let isChecking = false;
    let username = '';
    let usernameAvailable = false;
    let validationError: string | null = null;

    const checkUsername = async (value: string) => {
        usernameAvailable = false;
        isChecking = true;

        const validation = usernameSchema.safeParse(value);
        console.log('checkUsername: validation', validation);
        if (!validation.success) {
            validationError = validation.error.issues[0].message;
            isChecking = false;
            return;
        }

        validationError = null;

        try {
            usernameAvailable = await isUsernameAvailable(value);
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
        } finally {
            isChecking = false;
        }
    };

    onMount(async () => {
        signer = await getSigner();

        const ethProvider = getDefaultProvider();
        ensName = await ethProvider.lookupAddress(signer.address);
        if (ensName) {
            username = ensName.replace('.eth', '');
        }

        await checkUsername(username);
    });

    const onValueChange = debounce(500, async (value: string) => {
        await checkUsername(value);
    });

    const handleSubmit = async () => {
        isSubmitting = true;

        try {
            const metadata = accountMetadata({});
            const uri = await uploadJson(metadata);
            const account = await createAccount(username, uri);

            if (!account) {
                throw new Error('unknown error');
            }

            await onLogin(signer.address, account);
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
        } finally {
            isSubmitting = false;
        }
    };
</script>

<form
    on:submit|preventDefault={handleSubmit}
    class="my-12 flex w-full flex-col items-center justify-center gap-4"
    in:fade
>
    <label for="username" class="px-4 text-lg opacity-65">Choose a username</label>
    <div class="relative w-full max-w-md">
        <div class="absolute inset-y-0 left-0 flex items-center pl-4">
            <span class="text-2xl opacity-40">@lens/</span>
        </div>
        <input
            type="text"
            bind:value={username}
            id="username"
            name="username"
            placeholder="VitalikButerin"
            bind:this={inputElement}
            on:input={() => onValueChange(inputElement.value)}
            spellcheck="false"
            class="w-full rounded-md border border-gray-200 px-24 py-3 text-center text-2xl placeholder-gray-300 dark:border-gray-700"
        />
        {#if isChecking}
            <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                <svg
                    aria-hidden="true"
                    class="inline h-4 w-4 animate-spin text-gray-400 dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="#E5E7EB"
                    />
                    <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentColor"
                    />
                </svg>
            </div>
        {:else if !isChecking && validationError}
            <div
                class="absolute inset-y-0 right-0 flex items-center pr-4"
                use:tippy={{ content: validationError }}
            >
                <svg
                    class="h-5 w-5 text-red-600 dark:text-red-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </div>
        {:else if !isChecking && usernameAvailable}
            <div
                class="absolute inset-y-0 right-0 flex items-center pr-4"
                use:tippy={{ content: 'Username is available!' }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-green-700 dark:text-green-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            </div>
        {:else}
            <div
                class="absolute inset-y-0 right-0 flex items-center pr-4"
                use:tippy={{ content: 'Username is not available' }}
            >
                <svg
                    class="h-5 w-5 text-red-600 dark:text-red-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </div>
        {/if}
    </div>
    <button
        type="submit"
        class="btn-primary mt-4"
        disabled={isSubmitting || !usernameAvailable || validationError !== null}
        >Create Account</button
    >
</form>

<style>
    input,
    textarea,
    [contentEditable='true'] {
        &:focus {
            outline: solid var(--clr-accent);
            border: none;
            box-shadow: none;
        }
    }

    .tippy-box {
        text-align: center;
    }
</style>
