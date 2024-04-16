<script lang='ts'>
    import {
        autoUpdate,
        computePosition,
        flip,
        offset,
        shift,
        type ComputePositionConfig,
    } from '@floating-ui/dom';
    import { onDestroy } from 'svelte';
    import Portal from './Portal.svelte';

    const showEvents = ['mouseenter', 'focus'];
    const hideEvents = ['mouseleave', 'blur'];

    export let anchors: HTMLElement[] = [];
    export let showDelay: number = 0;
    export let hideDelay: number = 0;
    export let interactive: boolean = false;
    export let placement: Placement | undefined = undefined;
    export let autoUpdatePosition = true;

    export let config: ComputePositionConfig = {
        strategy: 'absolute',
        ...(placement !== undefined && {
            placement,
        }),
        middleware: [
            offset(6),
            flip(),
            shift({ padding: 5 }),
        ],
    };

    let component: HTMLElement;
    let autoUpdateDisposer: () => void;
    let activeAnchor: HTMLElement | undefined;

    let initialized = false;
    let showTimeout: ReturnType<typeof setTimeout>;
    let hideTimeout: ReturnType<typeof setTimeout>;
    let isShown = false;

    export const show = () => {
        if (!activeAnchor) {
            activeAnchor = anchors[0];
        }
        component.style.display = 'block';
        isShown = true;
    };

    export const hide = () => {
        component.style.display = '';
        isShown = false;
        activeAnchor = undefined;
    };

    const showWithDelay = (anchor: HTMLElement | undefined) => () => {
        activeAnchor = anchor;
        clearTimeout(hideTimeout);
        showTimeout = setTimeout(show, showDelay);
    };

    const hideWithDelay = () => {
        if (interactive && component.matches(':hover')) {
            return;
        }
        hideTimeout = setTimeout(hide, hideDelay);
        clearTimeout(showTimeout);
    };

    const updatePosition = async () => {
        if (!component || !activeAnchor) return;

        const { strategy, x, y } = await computePosition(activeAnchor, component, config);
        Object.assign(component.style, {
            position: strategy,
            left: `${x}px`,
            top: `${y}px`,
        });
    };

    const addListeners = (element: HTMLElement) => {
        showEvents.forEach((event) => element.addEventListener(event, showWithDelay(element)));
        hideEvents.forEach((event) => element.addEventListener(event, hideWithDelay));
    };

    const removeListeners = (element: HTMLElement) => {
        showEvents.forEach((event) => element.removeEventListener(event, showWithDelay(element)));
        hideEvents.forEach((event) => element.removeEventListener(event, hideWithDelay));
    };

    $: {
        if (component && anchors.length && !initialized) {
            initialized = true;
            anchors.forEach(addListeners);

            if (interactive) {
                component.addEventListener('mouseenter', () => showWithDelay(activeAnchor)());
                component.addEventListener('mouseleave', hideWithDelay);
            }
        }

        if (autoUpdatePosition && !autoUpdateDisposer && activeAnchor && component) {
            autoUpdateDisposer = autoUpdate(activeAnchor, component, updatePosition);
        }
        if (!autoUpdateDisposer) updatePosition();
    }

    onDestroy(() => {
        if (autoUpdateDisposer) autoUpdateDisposer();
        anchors.forEach(removeListeners);

        if (interactive) {
            component.removeEventListener('mouseenter', () => showWithDelay(activeAnchor)());
            component.removeEventListener('mouseleave', hideWithDelay);
        }
    });
</script>

<Portal>
    <div bind:this={component} class='hidden absolute w-max top-0 left-0 z-[9999]'>
        {#if isShown}
            <slot></slot>
        {/if}
    </div>
</Portal>
