// lib/utils/critical-path-queue.ts
class CriticalPathQueue {
    private queue: (() => Promise<void>)[] = [];
    private processing = false;
    private lastRun = 0;
    private minInterval = 1000; // Minimum 1 second between calculations

    async enqueue(task: () => Promise<void>) {
        this.queue.push(task);
        this.process();
    }

    private async process() {
        if (this.processing || this.queue.length === 0) return;

        const now = Date.now();
        const timeSinceLastRun = now - this.lastRun;

        if (timeSinceLastRun < this.minInterval) {
            // Schedule for later
            setTimeout(() => this.process(), this.minInterval - timeSinceLastRun);
            return;
        }

        this.processing = true;

        // Only process the latest request, discard older ones
        const task = this.queue[this.queue.length - 1];
        this.queue = [];

        try {
            await task();
            this.lastRun = Date.now();
        } finally {
            this.processing = false;

            // Process any new requests that came in
            if (this.queue.length > 0) {
                setTimeout(() => this.process(), this.minInterval);
            }
        }
    }
}

export const criticalPathQueue = new CriticalPathQueue();