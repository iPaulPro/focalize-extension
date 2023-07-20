import { Subscription, timer } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Blink the window title to get the user's attention.
 */
export default class WindowBlinker {
    private originalTitle: string = document.title;
    private subscription: Subscription | null = null;

    /**
     * Start blinking the window title.
     * @param newMsg The message to display in the window title.
     * @param originalTitle The original window title. If not provided, the current window title will be used.
     * @param howManyTimes How many times to blink the window title.
     */
    start(newMsg: string, originalTitle?: string, howManyTimes: number = 20): void {
        this.stop();

        chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {drawAttention: true}).catch(console.error);

        if (originalTitle) {
            this.originalTitle = originalTitle;
        }

        this.subscription = timer(0, 2000)
            .pipe(
                tap(() => {
                    document.title = document.title === this.originalTitle ? newMsg : this.originalTitle;
                }),
            )
            .subscribe({
                next: () => {
                    if (--howManyTimes <= 0) {
                        this.stop();
                    }
                },
            });
    }

    /**
     * Stop blinking the window title and restore the original title.
     */
    stop(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        document.title = this.originalTitle;
        chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {drawAttention: false}).catch(console.error);
    }
}
