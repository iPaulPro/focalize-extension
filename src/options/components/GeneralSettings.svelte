<script lang="ts">
    import {
        darkMode,
        useProfileManager,
        nodePost,
        nodeArticle,
        nodeAudio,
        nodeImage,
        nodeVideo,
        nodeSearch,
        usePopupComposer,
        richTextComposer,
        autoSignMetadata,
    } from '../../lib/stores/preferences-store';
    import LensNodeSelect from './LensNodeSelect.svelte';
</script>

<div class="h-screen px-4 pb-24 pt-6 overflow-auto md:px-8">

  <h1 class="text-2xl font-semibold text-neutral-800 dark:text-white tracking-tight">
    General settings
  </h1>

  <h2 class="text-neutral-400 text-lg pt-2">
    These preferences are automatically synced across installs.
  </h2>

  <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 py-3 md:py-6"></div>

  <section class="w-full flex flex-col py-6 md:py-10">

    <div class="flex flex-col md:flex-row md:gap-12 pb-4">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Gasless
          </div>
          <div class="text-base text-neutral-400">
            Using Profile Manager allows you to post without needing to sign transactions or pay for your own gas.
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 flex flex-col gap-6">

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$useProfileManager}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Use Lens Profile Manager
            </div>
            <div class="text-base text-neutral-400">
              Allow trusted apps to sign onchain transactions and pay for gas on your behalf
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$autoSignMetadata}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Auto-sign metadata
            </div>
            <div class="text-base text-neutral-400">
              Disable to sign your own publication metadata
            </div>
          </div>
        </div>

      </div>

    </div>

    <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 pt-6"></div>

    <div class="flex flex-col md:flex-row md:gap-12 pb-6 pt-10">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Display
          </div>
          <div class="text-base text-neutral-400">
            Customize the look and feel of Focalize.
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 flex flex-col gap-6">

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$darkMode}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Dark mode
            </div>
            <div class="text-base text-neutral-400">
              Use a dark theme
            </div>
          </div>
        </div>

      </div>

    </div>

    <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 pt-6"></div>

    <div class="flex flex-col md:flex-row md:gap-12 pb-6 pt-10">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Composer
          </div>
          <div class="text-base text-neutral-400">
            Customize the publication composer.
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 flex flex-col gap-6">

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$richTextComposer}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Rich text formatting
            </div>
            <div class="text-base text-neutral-400">
              Use rich text formatting in your posts, saved as Markdown
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$usePopupComposer}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Use popup composer
            </div>
            <div class="text-base text-neutral-400">
              Launches a popup window when creating a new post
            </div>
          </div>
        </div>

      </div>

    </div>

    <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 pt-6"></div>

    <div class="flex flex-col md:flex-row md:gap-12 pb-6 pt-10">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Omnibox Search
          </div>
          <div class="text-base text-neutral-400">
            Search for Lens profiles directly from the URL bar by typing "lens" then pressing tab.
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 xl:w-1/2 2xl:w-2/5 flex flex-col gap-6">
        <div class="w-full flex gap-4 justify-between">
          <div class="flex flex-col">
            <div class="text-base font-medium dark:text-white">
              Launch
            </div>
            <div class="text-base text-neutral-400">
              Choose the app to open when selecting a user.
            </div>
          </div>
          <LensNodeSelect preference={nodeSearch}/>
        </div>
      </div>
    </div>

    <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700"></div>

    <div class="flex flex-col md:flex-row md:gap-12 pb-6 pt-10">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Lens Apps
          </div>
          <div class="text-base text-neutral-400">
            Select the apps to launch when opening notifications and viewing your publications.
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 xl:w-1/2 2xl:w-2/5 flex flex-col gap-6">

        <div class="w-full flex gap-4 justify-between">
          <div class="flex flex-col">
            <div class="text-base font-medium dark:text-white">
              Posts
            </div>
            <div class="text-base text-neutral-400">
              Short-form posts and links
            </div>
          </div>
          <LensNodeSelect preference={nodePost}/>
        </div>

        <div class="w-full flex gap-4 justify-between">
          <div class="flex flex-col">
            <div class="text-base font-medium dark:text-white">
              Images
            </div>
            <div class="text-base text-neutral-400">
              Posts containing image attachments
            </div>
          </div>
          <LensNodeSelect preference={nodeImage}/>
        </div>

        <div class="w-full flex gap-4 justify-between">
          <div class="flex flex-col">
            <div class="text-base font-medium dark:text-white">
              Videos
            </div>
            <div class="text-base text-neutral-400">
              Posts containing video attachments
            </div>
          </div>
          <LensNodeSelect preference={nodeVideo}/>
        </div>

        <div class="w-full flex gap-4 justify-between">
          <div class="flex flex-col">
            <div class="text-base font-medium dark:text-white">
              Audio
            </div>
            <div class="text-base text-neutral-400">
              Posts containing audio attachments
            </div>
          </div>
          <LensNodeSelect preference={nodeAudio}/>
        </div>

        <div class="w-full flex gap-4 justify-between">
          <div class="flex flex-col">
            <div class="text-base font-medium dark:text-white">
              Articles
            </div>
            <div class="text-base text-neutral-400">
              Long-form posts
            </div>
          </div>
          <LensNodeSelect preference={nodeArticle}/>
        </div>

      </div>

    </div>

  </section>

</div>