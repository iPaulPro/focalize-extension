<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { DateTime, Duration, Interval } from 'luxon';
    import { isToday } from '../utils/utils';

    export let timestamp: number;
    export let className: string = '';
    export let capitalize: boolean = false;
    export let shortRelativeCutoff = 15;
    export let suffix = false;

    let formattedTime: string;
    let intervalId: ReturnType<typeof setInterval>;

    const isWithinOneHour = (diff: Duration) => diff.as('hours') < 1;
    const isWithinShortRelativeCutoff = (diff: Duration) =>
        diff.as('minutes') <= shortRelativeCutoff;
    const isWithinOneMinute = (diff: Duration) => diff.as('minutes') < 1;
    const isWithinTenSeconds = (diff: Duration) => diff.as('seconds') <= 10;
    const isWithinOneWeek = (diff: Duration) => diff.as('weeks') < 1;

    const isYesterday = (date: DateTime, now: DateTime) => {
        const startOfToday = now.startOf('day');
        const startOfYesterday = startOfToday.minus({ days: 1 });
        return date >= startOfYesterday && date < startOfToday;
    };

    const toShortRelative = (dateTime: DateTime) => {
        const now = DateTime.local();
        const diff = now
            .diff(dateTime, ['years', 'months', 'days', 'hours', 'minutes', 'seconds'])
            .toObject();

        if (diff.years && diff.years >= 1) return `${Math.floor(diff.years)}y`;
        if (diff.months && diff.months >= 1) return `${Math.floor(diff.months)}mo`;
        if (diff.days && diff.days >= 1) return `${Math.floor(diff.days)}d`;
        if (diff.hours && diff.hours >= 1) return `${Math.floor(diff.hours)}h`;
        if (diff.minutes && diff.minutes >= 1) return `${Math.floor(diff.minutes)}m`;

        return diff.seconds ? `${Math.floor(diff.seconds)}s` : capitalize ? 'Just now' : 'just now';
    };

    const getTimeString = (date: DateTime) => {
        const now = DateTime.now();
        const diff = Interval.fromDateTimes(date, now).toDuration();

        if (isWithinTenSeconds(diff)) {
            return capitalize ? 'Just now' : 'just now';
        } else if (isWithinShortRelativeCutoff(diff)) {
            return toShortRelative(date) + (suffix ? ' ago' : '');
        } else if (isToday(date, now)) {
            return date.toLocaleString(DateTime.TIME_SIMPLE);
        } else if (isYesterday(date, now)) {
            return capitalize ? 'Yesterday' : 'yesterday';
        } else if (isWithinOneWeek(diff)) {
            return date.toLocaleString({ weekday: 'long' });
        }

        return date.toLocaleString(DateTime.DATE_SHORT);
    };

    const updateFormattedTime = () => {
        if (timestamp) {
            const now = DateTime.now();
            const date = DateTime.fromMillis(timestamp);
            const diff = Interval.fromDateTimes(date, now).toDuration('hours');

            formattedTime = getTimeString(date);

            // Every 10 seconds for the first minute, every minute thereafter for the first hour
            if (isWithinOneHour(diff)) {
                if (intervalId) clearInterval(intervalId);
                if (isWithinOneMinute(diff)) {
                    intervalId = setInterval(
                        () => {
                            formattedTime = getTimeString(date);
                        },
                        isWithinTenSeconds(diff) ? 10 * 1000 : 60 * 1000,
                    );
                } else {
                    intervalId = setInterval(() => {
                        formattedTime = getTimeString(date);
                    }, 60 * 1000);
                }
            }
        }
    };

    onMount(() => {
        updateFormattedTime();
    });

    onDestroy(() => {
        clearInterval(intervalId);
    });
</script>

<span class={className}>{formattedTime}</span>
