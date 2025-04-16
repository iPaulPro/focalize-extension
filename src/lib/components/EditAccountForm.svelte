<script lang="ts">
    import { currentUser } from '@/lib/stores/user-store';
    import { editAccount, getAccount } from '@/lib/lens-service';
    import { writable } from 'svelte/store';
    import { toast } from 'svelte-sonner';
    import { imageMimeTypesJoined, MAX_FILE_SIZE } from '@/lib/utils/file-utils';
    import { uploadImmutableFile } from '@/lib/grove-service';
    import { parseUri } from '@/lib/utils/lens-utils';
    import CoverPlaceholder from '~/assets/lens-cover.webp';
    import AvatarPlaceholder from '~/assets/lens-avatar.svg';
    import { onError } from '@/lib/utils/error-utils';
    import type { EditAccountInput } from '@/lib/types/EditAccountInput';
    import { updateUser } from '@/lib/user/user';
    import { type MetadataAttribute, MetadataAttributeType } from '@lens-protocol/metadata';

    let pictureInput: HTMLInputElement;
    let coverPictureInput: HTMLInputElement;
    let isSubmitting = false;
    let isUploading = false;
    let localPictureUrl: string | null = null;
    let localCoverPictureUrl: string | null = null;
    let websiteValue: string | undefined;
    let locationValue: string | undefined;

    const formData = writable<EditAccountInput>({
        name: undefined,
        bio: undefined,
        picture: undefined,
        coverPicture: undefined,
        attributes: undefined,
    });

    const getAccountMetadata = async () => {
        if (!$currentUser) return;
        const account = await getAccount({ address: $currentUser.account });
        console.log('getAccountMetadata: got account', account);

        if (account) {
            await updateUser(account);
        }

        const attrs: MetadataAttribute[] | undefined = account?.metadata?.attributes?.map((a) => {
            if (a.type === 'BOOLEAN') {
                return {
                    type: MetadataAttributeType.BOOLEAN,
                    key: a.key,
                    value: a.value,
                };
            } else if (a.type === 'STRING') {
                return {
                    type: MetadataAttributeType.STRING,
                    key: a.key,
                    value: a.value,
                };
            } else if (a.type === 'NUMBER') {
                return {
                    type: MetadataAttributeType.NUMBER,
                    key: a.key,
                    value: a.value,
                };
            }
            return {
                type: a.type,
                key: a.key,
                value: a.value,
            };
        });

        formData.set({
            name: account?.metadata?.name ?? undefined,
            bio: account?.metadata?.bio ?? undefined,
            picture: account?.metadata?.picture ?? undefined,
            coverPicture: account?.metadata?.coverPicture ?? undefined,
            attributes: attrs ?? undefined,
        });

        websiteValue = account?.metadata?.attributes?.find((attr) => attr.key === 'website')?.value;
        locationValue = account?.metadata?.attributes?.find(
            (attr) => attr.key === 'location',
        )?.value;
    };

    $: if ($currentUser) {
        getAccountMetadata();
    }

    const updateFormDataAttr = (key: string, value: string | undefined) => {
        let attrs = $formData.attributes || [];
        const attr = attrs.find((attr) => attr.key === key);
        if (attr) {
            if (!value) {
                attrs = attrs.filter((a) => a.key !== key);
            } else {
                attr.value = value;
            }
        } else if (value) {
            attrs.push({
                type: MetadataAttributeType.STRING,
                key,
                value,
            });
        }
        $formData.attributes = attrs;
    };

    const handleSubmit = async () => {
        isSubmitting = true;
        try {
            updateFormDataAttr('website', websiteValue);
            updateFormDataAttr('location', locationValue);
            console.log('handleSubmit: updating account with form', $formData);

            const txHash = await editAccount($formData);
            console.log('handleSubmit: updated account', txHash);
            toast.success('Account updated', {
                duration: 3000,
            });
            if ($currentUser && $formData.picture) {
                $currentUser.avatarUrl = parseUri($formData.picture);
            }
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
        } finally {
            isSubmitting = false;
        }
    };

    const upload = async (file: File) => {
        console.log('upload: Uploading file...', file);
        isUploading = true;
        try {
            return uploadImmutableFile(file);
        } finally {
            isUploading = false;
        }
    };

    const getSelectedFile = (e: Event): File | null => {
        if (!e.target) return null;
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file || file.size > MAX_FILE_SIZE) {
            toast.error(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`, { duration: 5000 });
            return null;
        }
        console.log('getSelectedFile: File selected', file);

        return file;
    };

    const onPictureSelected = async (e: Event) => {
        const file = getSelectedFile(e);
        if (!file) return;

        localPictureUrl = URL.createObjectURL(file);

        try {
            const key = await upload(file);
            $formData.picture = 'lens://' + key;
        } catch (e) {
            console.error('onPictureSelected: Failed to upload file', e);
            toast.error('Failed to upload file', { duration: 5000 });
        }
    };

    const onCoverPictureSelected = async (e: Event) => {
        const file = getSelectedFile(e);
        if (!file) return;

        localCoverPictureUrl = URL.createObjectURL(file);

        try {
            const key = await upload(file);
            $formData.coverPicture = 'lens://' + key;
        } catch (e) {
            console.error('onCoverPictureSelected: Failed to upload file', e);
            toast.error('Failed to upload file', { duration: 5000 });
        }
    };
</script>

<form on:submit|preventDefault={handleSubmit}>
    <div class="flex flex-col gap-8">
        <label for="coverPicture" class="relative max-w-screen-lg">
            <img
                src={$formData.coverPicture
                    ? parseUri($formData.coverPicture)
                    : (localCoverPictureUrl ?? CoverPlaceholder)}
                alt="Cover Picture"
                class="h-72 w-full cursor-pointer rounded-2xl border border-gray-200
                    object-cover hover:opacity-90 dark:border-gray-700"
                loading="lazy"
                decoding="async"
            />
            <div class="absolute bottom-4 right-4">
                <button
                    type="button"
                    disabled={isUploading}
                    class="btn-secondary group flex items-center gap-2 !text-white opacity-80 hover:opacity-100"
                    on:click={() => coverPictureInput.click()}
                >
                    {#if isUploading}
                        <svg
                            aria-hidden="true"
                            class="inline h-4 w-4 animate-spin text-white"
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
                        <span>Uploading...</span>
                    {:else}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            class="h-5 w-5"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                            ></path>
                        </svg>
                        <span>{$formData.coverPicture ? 'Change' : 'Set'} cover</span>
                    {/if}
                </button>
            </div>
            <input
                bind:this={coverPictureInput}
                id="coverPicture"
                type="file"
                accept={imageMimeTypesJoined()}
                on:change={onCoverPictureSelected}
                class="hidden"
            />
        </label>
        <div class="flex max-w-screen-lg flex-col gap-6 md:flex-row">
            <div
                class="w-full shrink-0 grow-0 border-r border-gray-200 dark:border-gray-700 md:w-1/3"
            >
                <label for="picture" class="flex flex-col items-center gap-3">
                    <img
                        src={$formData.picture
                            ? parseUri($formData.picture)
                            : (localPictureUrl ?? AvatarPlaceholder)}
                        alt="Profile Picture"
                        class="h-56 w-56 cursor-pointer rounded-full border border-gray-200 bg-gray-300
                            object-cover hover:opacity-90 dark:border-gray-700"
                        loading="lazy"
                        decoding="async"
                    />
                    <button
                        type="button"
                        disabled={isUploading}
                        class="btn-secondary flex items-center gap-2 text-xl"
                        on:click={() => pictureInput.click()}
                    >
                        {#if isUploading}
                            <svg
                                aria-hidden="true"
                                class="inline h-4 w-4 animate-spin text-white"
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
                            <span>Uploading...</span>
                        {:else}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                class="h-5 w-5"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                                ></path>
                            </svg>
                            {$formData.coverPicture ? 'Change' : 'Set'} avatar
                        {/if}
                    </button>
                    <input
                        bind:this={pictureInput}
                        id="picture"
                        type="file"
                        accept={imageMimeTypesJoined()}
                        on:change={onPictureSelected}
                        class="hidden"
                    />
                </label>
            </div>

            <div class="flex flex-col gap-2 pb-16 md:w-2/3">
                {#if $currentUser}
                    <div class="flex max-w-screen-md flex-col gap-12 pb-4">
                        <div class="flex flex-col gap-1">
                            <label for="account" class="px-4 text-base opacity-65">
                                Account Address
                            </label>
                            <div class="relative">
                                <input
                                    value={$currentUser.account}
                                    type="text"
                                    id="account"
                                    name="account"
                                    class="w-full rounded-md border border-gray-200 bg-gray-100 !pr-12 dark:border-gray-700 dark:bg-gray-700"
                                    disabled
                                />
                                <button
                                    type="button"
                                    class="absolute right-4 top-1/2 -translate-y-1/2 active:opacity-60"
                                    on:click={() => {
                                        if ($currentUser.account) {
                                            navigator.clipboard.writeText($currentUser.account);
                                            toast.success('Address copied to clipboard', {
                                                duration: 3000,
                                            });
                                        }
                                    }}
                                >
                                    <svg
                                        class="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path
                                            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="flex max-w-screen-md flex-col gap-12 pb-4">
                        <label for="username" class="flex flex-col gap-1">
                            <div class="px-4 text-base opacity-65">Username</div>
                            <input
                                value={$currentUser.username
                                    ? '@' + $currentUser.username
                                    : '(none)'}
                                type="text"
                                id="username"
                                name="username"
                                class="w-full rounded-md border border-gray-200 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-700"
                                disabled
                            />
                        </label>
                    </div>
                {/if}

                <div class="flex max-w-screen-md flex-col gap-12 pb-4">
                    <label for="name" class="flex flex-col gap-1">
                        <div class="px-4 text-base opacity-65">Name</div>
                        <input
                            bind:value={$formData.name}
                            type="text"
                            id="name"
                            name="name"
                            class="w-full rounded-md border border-gray-200 p-2 dark:border-gray-700"
                            placeholder="Vitalik"
                        />
                    </label>
                </div>

                <div class="flex max-w-screen-md flex-col gap-12 pb-4">
                    <label for="bio" class="flex flex-col gap-1">
                        <div class="px-4 text-base opacity-65">Bio</div>
                        <textarea
                            bind:value={$formData.bio}
                            id="bio"
                            name="bio"
                            class="w-full resize-none rounded-md border border-gray-200 p-2 dark:border-gray-700"
                            placeholder="Tell the world about yourself"
                        />
                    </label>
                </div>

                <div class="flex max-w-screen-md gap-12 pb-4">
                    <div class="flex-1">
                        <label for="website" class="flex flex-col gap-1">
                            <div class="px-4 text-base opacity-65">Website</div>
                            <input
                                bind:value={websiteValue}
                                type="text"
                                id="website"
                                name="website"
                                class="w-full rounded-md border border-gray-200 p-2 dark:border-gray-700"
                                placeholder="https://vitalik.eth.limo"
                            />
                        </label>
                    </div>
                    <div class="flex-1">
                        <label for="location" class="flex flex-col gap-1">
                            <div class="px-4 text-base opacity-65">Location</div>
                            <input
                                bind:value={locationValue}
                                type="text"
                                id="location"
                                name="location"
                                class="w-full rounded-md border border-gray-200 p-2 dark:border-gray-700"
                                placeholder="Canada"
                            />
                        </label>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    class="btn-primary group mt-4"
                >
                    {#if isSubmitting}
                        <svg
                            aria-hidden="true"
                            class="mr-3 inline h-4 w-4 animate-spin text-white"
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
                        <span>Saving...</span>
                    {:else}
                        <span>Save</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
</form>

<style>
    input {
        @apply px-4 py-2 text-lg;
    }
    textarea {
        @apply px-4 py-3 text-lg;
    }

    input,
    textarea,
    [contentEditable='true'] {
        &:focus {
            outline: solid var(--clr-accent);
            border: none;
            box-shadow: none;
        }
    }
</style>
