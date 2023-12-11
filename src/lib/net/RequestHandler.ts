type ActiveRequest<T> = { listeners: number; data: Promise<T>; };

/**
 * Useful in cases where multiple requests might come in all for the same
 * resource/promise in a short timeframe. Groups all these calls together and
 * resolves them with a single promise
 * 
 * Essentially, it'll store promises against a key, directing all incoming
 * calls to `make` to also just await a single existing promise with the same 
 * key, or if no such promise exists, it'll make a new request
 */
class RequestHandler {
    // Stores requests that are currently in flight
    private in_flight: Record<string, ActiveRequest<any>> = {};

    /**
     * Safely awaits (and cleans up) the in-flight promise
     * 
     * @param key The key associated with the promise
     * @param promise The promise itself we're awaiting
     * @returns The awaited data
     */
    private listen(key: string): Promise<any> {
        // Add ourselves as a listener
        const promise = this.in_flight[key];
        promise.listeners += 1;

        // Return a promise for the result
        return new Promise(async resolve => {
            // Get the result
            const result = await promise.data;

            // Since we've got the result, we are no longer listening
            promise.listeners -= 1;

            // If we were the last listener, remove this from `in_flight`
            if (promise.listeners <= 0 && this.in_flight[key] !== undefined) {
                delete this.in_flight[key];
            }

            resolve(result);
        })
    }

    /**
     * Makes the request, or if the request already exists we'll add ourselves
     * as a listener and return that one
     * 
     * Promises are Eager in javascript, meaning we can't just pass one in or
     * it'll execute, so we must pass in a function we *can* call if we need
     * to construct one
     * 
     * @param key A key that uniquely identifies this promise, and will match duplicate promises
     * @param promise_constructor An arrow function that returns the promies we should execute
     */
    public make<T>(key: string, promise_constructor: () => Promise<T>): Promise<T> {
        // If a matching request already exists, just await that one
        if (this.in_flight[key] !== undefined) {
            return this.listen(key);
        }

        // No request exists, synchronously create a new one
        const active_promise = promise_constructor();
        this.in_flight[key] = { data: active_promise, listeners: 1 };

        return active_promise;
    }

    /**
     * Checks if there's an active request
     * 
     * @param key The key associated with the promise
     * @returns A reference to the active request if there is one
     */
    public exists(key: string): boolean {
        return this.in_flight[key] !== undefined;
    }

}

export { RequestHandler, type ActiveRequest };
