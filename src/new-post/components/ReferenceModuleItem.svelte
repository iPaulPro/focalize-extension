<script lang="ts">
    export let item = undefined;
    export let isActive = false;
    export let isFirst = false;
    export let isHover = false;

    let itemClasses = '';

    $: {
        const classes = [];

        if (isActive) {
            classes.push('active');
        }
        if (isFirst) {
            classes.push('first');
        }
        if (isHover) {
            classes.push('hover');
        }
        itemClasses = classes.join(' ');
    }
</script>

<div class="flex p-4 {itemClasses}">
  <div class="flex flex-col">
    <div class="text-base font-medium">{item.label}</div>
    <div class="text-sm font-normal text-neutral-700">{item.summary}</div>
  </div>
</div>