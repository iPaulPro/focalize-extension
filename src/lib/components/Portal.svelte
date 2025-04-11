<!--
MIT License

Copyright (c) 2019 Roman Rodych

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->
<script context="module">
    import { tick } from 'svelte';

    /**
     * Usage: <div use:portal={'css selector'}> or <div use:portal={document.body}>
     *
     * @param {HTMLElement} el
     * @param {HTMLElement|string} target DOM Element or CSS Selector
     */
    export function portal(el, target = 'body') {
        let targetEl;
        async function update(newTarget) {
            target = newTarget;
            if (typeof target === 'string') {
                targetEl = document.querySelector(target);
                if (targetEl === null) {
                    await tick();
                    targetEl = document.querySelector(target);
                }
                if (targetEl === null) {
                    throw new Error(`No element found matching css selector: "${target}"`);
                }
            } else if (target instanceof HTMLElement) {
                targetEl = target;
            } else {
                throw new TypeError(
                    `Unknown portal target type: ${
                        target === null ? 'null' : typeof target
                    }. Allowed types: string (CSS selector) or HTMLElement.`,
                );
            }
            targetEl.appendChild(el);
            el.hidden = false;
        }

        function destroy() {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }

        update(target);
        return {
            update,
            destroy,
        };
    }
</script>

<script>
    /**
     * DOM Element or CSS Selector
     * @type { HTMLElement|string}
     */
    export let target = 'body';
</script>

<div use:portal={target} hidden>
    <slot />
</div>
