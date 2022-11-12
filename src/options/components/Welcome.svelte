<script lang="ts">
    import Toolbar from './Toolbar.svelte';
    import InlineSVG from 'svelte-inline-svg';
    import focalizeLogo from '/images/focalize.svg';
    import focalizeLogoName from '../../assets/focalize-logo-name.svg';
    import welcomeImage from '../../assets/welcome.svg';

    import {darkMode} from '../../lib/state';
</script>

<div class="flex flex-col w-full h-full {$darkMode ? 'dark bg-gray-900' : ''}">

  <Toolbar />

  <main class="flex flex-col grow items-center">

    <section class="container max-w-screen-lg px-4 mt-16">

      <div class="relative p-4">

        <div class="lg:grid lg:grid-flow-row-dense lg:grid-cols-2 lg:gap-12 lg:items-center">

          <div class="lg:col-start-1">

            <InlineSVG src={focalizeLogoName} alt="Focalize Logo" class="h-16 text-white" />

            <h4 class="mt-8 text-2xl leading-8 font-bold text-gray-900 dark:text-white tracking-tight sm:leading-9">
              The quickest way to post to Lens!
            </h4>

            <ul class="mt-10">
              <li>
                <div class="flex">
                  <div class="flex-shrink-0">
                    <div class="flex items-center justify-center h-12 w-12 rounded-full bg-neutral-400 dark:bg-gray-600 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                        <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <h5 class="text-lg leading-6 text-gray-900 dark:text-white font-bold">
                      Quick share
                    </h5>
                    <p class="mt-2 text-base leading-6 text-gray-500 dark:text-gray-300">
                      Sharing what you're looking at has never been easier. Click on the
                      <InlineSVG src={focalizeLogo} alt="Focalize Logo" class="w-6 h-6 inline"/>
                      in the toolbar to share a link to your current tab.
                    </p>
                  </div>
                </div>
              </li>
              <li class="mt-10">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <div class="flex items-center justify-center h-12 w-12 rounded-full bg-neutral-400 dark:bg-gray-600 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M20.4 14.5L16 10 4 20"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <h5 class="text-lg leading-6 text-gray-900 dark:text-white font-bold">
                      Media and NFTs
                    </h5>
                    <p class="mt-2 text-base leading-6 text-gray-500 dark:text-gray-300">
                      Easily upload photos and videos to IPFS and Filecoin to share on Lens. Turn posts into a Polygon NFT in a few clicks.
                    </p>
                  </div>
                </div>
              </li>
              <li class="mt-10">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <div class="flex items-center justify-center h-12 w-12 rounded-full bg-neutral-400 dark:bg-gray-600 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                        <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <h5 class="text-lg leading-6 text-gray-900 dark:text-white font-bold">
                      Long-form
                    </h5>
                    <p class="mt-2 text-base leading-6 text-gray-500 dark:text-gray-300">
                      Publish articles to Lens with a WYSIWYG Markdown editor.
                    </p>
                  </div>
                </div>
              </li>
            </ul>

            <a href="/src/new-post/index.html"
                    class="mt-10 w-fit py-2.5 px-12 flex justify-center items-center rounded-full
                    bg-orange-500 hover:bg-orange-600 dark:bg-orange-700 dark:hover:bg-orange-800
                    focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                    text-white text-center text-lg font-medium shadow-md
                    transition ease-in duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="mr-2"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h6"/>
                <path d="M14 3v5h5M18 21v-6M15 18h6"/>
              </svg>
              Create a post
            </a>

          </div>

          <div class="mt-10 ml-6 relative lg:mt-24 lg:col-start-2">
            <InlineSVG src={welcomeImage} alt="Illustration of woman juggling clipboards"
                       class="relative mx-auto w-auto focus:outline-0"/>
          </div>

        </div>

      </div>

    </section>

  </main>

  <footer class="flex justify-center p-4">
    <span class="text-gray-400">
      Created by
      <a href="https://lenster.xyz/u/paulburke.lens" target="_blank" rel="noreferrer"
         class="hover:text-gray-600 hover:font-semibold">
        paulburke.eth
      </a>
    </span>
  </footer>

</div>