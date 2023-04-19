<script lang="ts">
  import {deleteDraft} from "../stores/draft-store";
  import toast from "svelte-french-toast";

  export let draftId: string;

  const onDeleteClick = async () => {
      try {
          await deleteDraft(draftId);
          toast.success('Draft deleted');
      } catch (e) {
          console.error(e);
      }
  };
</script>

<div class="flex flex-col divider">

  <button type="button" class="h-10 px-4 flex items-center hover:bg-gray-500 rounded"
          on:click={onDeleteClick}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 inline"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
    <span class="pl-2">Delete draft</span>
  </button>

</div>