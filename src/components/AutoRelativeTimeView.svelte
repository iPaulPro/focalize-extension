<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { DateTime, Interval } from 'luxon';

    export let timestamp: number;
    export let relative: boolean = true;
    export let className: string = '';
    export let prefix: string = undefined;
    export let capitalize: string = false;

    let formattedTime: string;
    let intervalID: number;

    const isWithinOneHour = (timestamp: number) => {
        const now = DateTime.now();
        const time = DateTime.fromMillis(timestamp);
        const diff = Interval.fromDateTimes(time, now).toDuration('hours');
        return diff.as('hours') < 1;
    };

    const isWithinOneMinute = (timestamp: number) => {
        const now = DateTime.now();
        const time = DateTime.fromMillis(timestamp);
        const diff = Interval.fromDateTimes(time, now).toDuration('minutes');
        return diff.as('minutes') < 1;
    };

    const isWithinTenSeconds = (timestamp: number) => {
        const now = DateTime.now();
        const time = DateTime.fromMillis(timestamp);
        const diff = Interval.fromDateTimes(time, now).toDuration('seconds');
        return diff.as('seconds') < 10;
    };

    const sameDay = (a: DateTime, b: DateTime): boolean => {
        return a.hasSame(b, "day") && a.hasSame(b, "month") && a.hasSame(b, "year");
    };

    const getTimeString = (timestamp: number, relative: boolean) => {
        const now = DateTime.now();
        const time = DateTime.fromMillis(timestamp);
        const diff = Interval.fromDateTimes(time, now).toDuration(['years', 'months', 'days']).toObject();

        if (diff.years > 0) {
            // more than 1 year difference, show full date
            return time.toLocaleString(DateTime.DATE_MED);
        } else if (diff.months > 0 || diff.days > 1) {
            // more than 1 day difference, show short date
            return time.toLocaleString(DateTime.DATETIME_SHORT);
        } else if (!sameDay(now, time) && diff.days <= 1) {
            // show yesterday
            return (capitalize ? 'Yesterday, ' : 'yesterday, ') + time.toLocaleString(DateTime.TIME_SIMPLE);
        } else if (relative && isWithinOneHour(timestamp)) {
            if (isWithinTenSeconds(timestamp)) {
                // show "just now"
                return capitalize ? 'Just now' : 'just now';
            } else {
                // show relative time within one hour
                return time.toRelative();
            }
        } else {
            // show time
            return (prefix ? `${prefix} ` : '') + time.toLocaleString(DateTime.TIME_SIMPLE);
        }
    };

    onMount(() => {
        // Initialize the formatted time
        formattedTime = getTimeString(timestamp, relative);

        // Set up the interval to update the time
        // Every 10 seconds for the first minute, minute for the first hour
        if (relative && isWithinOneHour(timestamp)) {
            if (isWithinOneMinute(timestamp)) {
                intervalID = setInterval(() => {
                    formattedTime = getTimeString(timestamp, relative);
                }, isWithinTenSeconds(timestamp) ? 10 * 1000 : 60 * 1000);
            } else {
                intervalID = setInterval(() => {
                    formattedTime = getTimeString(timestamp, relative);
                }, 60 * 1000);
            }
        }
    });

    onDestroy(() => {
        // Clean up the interval when the component is destroyed
        clearInterval(intervalID);
    });
</script>

<span class={className}>{formattedTime}</span>