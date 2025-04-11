<script lang="ts">
    import { deleteDraft } from '../stores/draft-store';
    import { toast } from 'svelte-sonner';

    export let draftId: string;
    export let anchorNode: Node;

    const onDeleteClick = async () => {
        try {
            await deleteDraft(draftId);
            toast.success('Draft deleted');
        } catch (e) {
            console.error(e);
        }
    };
</script>

<div class="divider flex flex-col">
    <button
        type="button"
        class="flex h-10 items-center rounded px-4 hover:bg-gray-500"
        on:click={onDeleteClick}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="inline w-4"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            ></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        <span class="pl-2">Delete draft</span>
    </button>
</div>
