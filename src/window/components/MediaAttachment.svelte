<script lang="ts">
  import type {PublicationMetadataMediaInput} from '../../lib/graph/lens-service';

  export let attachment: PublicationMetadataMediaInput;

  $: attachmentType = attachment?.type as string;
  $: isAttachmentImage = attachmentType?.startsWith('image/');
  $: isAttachmentAudio = attachmentType?.startsWith('audio/');
  $: isAttachmentVideo = attachmentType?.startsWith('video/');
  
</script>

<div class="card flex flex-col">
  
  <div class="w-full"></div>

</div>

<style>
  .card {
    @apply bg-white dark:bg-gray-800 shadow-md rounded-lg p-4;
  }
</style>