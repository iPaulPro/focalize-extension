<script lang="ts">
    import Toolbar from './Toolbar.svelte';
    import InlineSVG from 'svelte-inline-svg';
    import focalizeLogo from '/images/focalize.svg';
    import focalizeLogoName from '../../assets/focalize-logo-name.svg';
    import lensLogo from '../../assets/lens-logo.svg';
    import welcomeImage from '../../assets/welcome.svg';
</script>

<div class="flex flex-col w-full h-full">

  <Toolbar />

  <main class="flex flex-col grow items-center">

    <section class="container max-w-screen-lg px-4 mt-16">

      <div class="relative p-4">

        <div class="lg:grid lg:grid-flow-row-dense lg:grid-cols-2 lg:gap-12 lg:items-center">

          <div class="lg:col-start-1">

            <InlineSVG src={focalizeLogoName} alt="Focalize Logo" class="h-16" />

            <h4 class="mt-8 text-2xl leading-8 font-extrabold text-gray-900 dark:text-white tracking-tight sm:leading-9">
              The quickest way to post to Lens!
            </h4>

            <ul class="mt-10">
              <li>
                <div class="flex">
                  <div class="flex-shrink-0">
                    <div class="flex items-center justify-center h-12 w-12 rounded-md bg-neutral-400 text-white">
                      <svg width="20" height="20" fill="currentColor" class="h-6 w-6" viewBox="0 0 1792 1792"
                           xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M491 1536l91-91-235-235-91 91v107h128v128h107zm523-928q0-22-22-22-10 0-17 7l-542 542q-7 7-7 17 0 22 22 22 10 0 17-7l542-542q7-7 7-17zm-54-192l416 416-832 832h-416v-416zm683 96q0 53-37 90l-166 166-416-416 166-165q36-38 90-38 53 0 91 38l235 234q37 39 37 91z">
                        </path>
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
                    <div class="flex items-center justify-center h-12 w-12 rounded-md bg-neutral-400 text-white">
                      <svg width="20" height="20" fill="currentColor" class="h-6 w-6" viewBox="0 0 1792 1792"
                           xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M491 1536l91-91-235-235-91 91v107h128v128h107zm523-928q0-22-22-22-10 0-17 7l-542 542q-7 7-7 17 0 22 22 22 10 0 17-7l542-542q7-7 7-17zm-54-192l416 416-832 832h-416v-416zm683 96q0 53-37 90l-166 166-416-416 166-165q36-38 90-38 53 0 91 38l235 234q37 39 37 91z">
                        </path>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <h5 class="text-lg leading-6 text-gray-900 dark:text-white font-bold">
                      Media and NFTs
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline text-emerald-700 pb-1">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
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
                    <div class="flex items-center justify-center h-12 w-12 rounded-md bg-neutral-400 text-white">
                      <svg width="20" height="20" fill="currentColor" class="h-6 w-6" viewBox="0 0 1792 1792"
                           xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M491 1536l91-91-235-235-91 91v107h128v128h107zm523-928q0-22-22-22-10 0-17 7l-542 542q-7 7-7 17 0 22 22 22 10 0 17-7l542-542q7-7 7-17zm-54-192l416 416-832 832h-416v-416zm683 96q0 53-37 90l-166 166-416-416 166-165q36-38 90-38 53 0 91 38l235 234q37 39 37 91z">
                        </path>
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
                    class="mt-10 w-fit py-2.5 px-12 flex justify-center items-center  bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white transition ease-in duration-200 text-center text-lg font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="mr-2"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h6"/>
                <path d="M14 3v5h5M18 21v-6M15 18h6"/>
              </svg>
              Create a post
            </a>

          </div>

          <div class="mt-10 ml-6 relative lg:mt-24 lg:col-start-2">
            <InlineSVG src={welcomeImage} alt="Illustration of woman juggling clipboards" class="relative mx-auto w-auto"/>
          </div>

        </div>

      </div>

    </section>

    <section class="container max-w-screen-xl px-4 mt-20">

      <div id="welcome-footer" class="bg-emerald-600 dark:bg-gray-800 rounded-xl overflow-hidden">

        <div class="flex flex-col gap-4 items-center lg:flex-row px-6 py-6 md:py-12 md:px-12 lg:py-16 lg:px-16">

          <InlineSVG src={lensLogo} alt="Lens Logo" class="w-32 h-32" />

          <div class="ml-8">
            <h2 class="text-2xl leading-8 font-extrabold tracking-tight text-white sm:text-3xl sm:leading-9">
              Follow Focalize to unlock media uploads
            </h2>
            <p class="mt-3 max-w-3xl text-lg leading-6 text-neutral-300">
              Attach photos and videos to your posts, up to 1GB per post. Files are pinned on IPFS and backed by Filecoin.
            </p>
          </div>

          <div class="mt-8 sm:w-full sm:max-w-md xl:mt-0 xl:ml-8">

            <div class="mt-3 rounded-md shadow sm:mt-0 sm:ml-3 sm:flex-shrink-0">
              <button class="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white bg-emerald-800 hover:bg-emerald-700 focus:outline-none focus:bg-emerald-500 transition duration-150 ease-in-out">
                Follow @focalize.lens
              </button>
            </div>

            <p class="mt-3 text-sm leading-5 text-neutral-300 text-center">
              The first 500 Follow NFTs are free!
            </p>

          </div>

        </div>

      </div>

    </section>

  </main>

  <footer class="flex justify-center p-4">
    <span class="text-neutral-400">
      Created by
      <a href="https://lenster.xyz/u/paulburke.lens" target="_blank" rel="noreferrer"
         class="hover:text-neutral-600 hover:font-semibold">
        paulburke.eth
      </a>
    </span>
  </footer>

</div>