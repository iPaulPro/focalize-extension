<script lang="ts">
    import InlineSVG from 'svelte-inline-svg';
    import focalizeLogo from '../../assets/focalize-logo-large.svg';

    import {profile} from "../../lib/state";

    let isMenuOpen = false;
</script>

<nav class="bg-white dark:bg-gray-800  shadow ">

  <div class="px-8">

    <div class="flex items-center justify-between h-16">

      <div class=" flex items-center">
        <a class="flex-shrink-0" href="/src/options/index.html">
          <InlineSVG class="h-8 w-8" src={focalizeLogo} alt="Focalize" />
        </a>
      </div>

      <div class="block">

        <div class="ml-4 flex items-center md:ml-6">

          <a href="/src/new-post/index.html"
             class="p-3 rounded-full text-gray-700 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">

            <span class="sr-only">
                New post
            </span>

            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h6"/>
              <path d="M14 3v5h5M18 21v-6M15 18h6"/>
            </svg>

          </a>

          <div class="ml-6 relative">

            <div class="relative inline-block text-left">

              <div>
                <button type="button" on:click={() => isMenuOpen = !isMenuOpen}
                        class="flex items-center justify-center w-full rounded-full p-3 text-sm font-medium text-gray-700 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
                        id="options-menu">

                  {#if $profile}
                    <img src={$profile.picture.original.url} alt="Profile avatar"
                         class="w-7 h-7 object-cover rounded-full">
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3"/>
                      <circle cx="12" cy="10" r="3"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  {/if}

                </button>
              </div>

              {#if isMenuOpen}

                <div id="menu"
                     class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">

                  <div class="py-1 " role="menu" aria-orientation="vertical" aria-labelledby="options-menu">

                    <button
                       class="block block px-4 py-2 text-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-100 dark:hover:text-white dark:hover:bg-gray-600"
                       role="menuitem">
                          <span class="flex flex-col">
                              <span>
                                  Logout
                              </span>
                          </span>
                    </button>

                  </div>

                </div>
              {/if}

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</nav>
