<script lang="ts">
    import { onDestroy } from 'svelte';

    export let placeholder = '';
    export let duration = 2000;

    let message: string;
    let timeout: undefined | NodeJS.Timeout;
    $: if (timeout === undefined) {
        message = placeholder;
    }

    export const setMessage = (newMessage: string) => {
        message = newMessage;
        timeout = setTimeout(() => {
            message = placeholder;
            timeout = undefined;
        }, duration);
    };

    export const clearMessage = () => {
        clearTimeout(timeout);
        timeout = undefined;
        message = placeholder;
    };

    onDestroy(() => {
        clearTimeout(timeout);
    });
</script>

<p style:margin={'0px'}>{message}</p>

<style>
    p {
        color: red;
    }
</style>
