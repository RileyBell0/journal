<script lang="ts">
    import TextEditor from '$lib/components/TextEditor.svelte';
</script>

<svelte:head>
    <title>About</title>
    <meta name="description" content="About this app" />
</svelte:head>
<div class="text-column">
    <TextEditor />
    <h1>About this app</h1>

    <p>
        This is a <a href="https://kit.svelte.dev">SvelteKit</a> app. You can make your own by typing
        the following into your command line and following the prompts:
    </p>

    <pre>npm create svelte@latest</pre>

    <p>
        The page you're looking at is purely static HTML, with no client-side interactivity needed.
        Because of that, we don't need to load any JavaScript. Try viewing the page's source, or
        opening the devtools network panel and reloading.
    </p>

    <p>
        The Sverdle page illustrates SvelteKit's data loading and form handling. Try using it with
        JavaScript disabled!
    </p>
</div>

<style lang="less">
    @import '$styles/styles.less';

    .text-column {
        display: flex;
        max-width: 48rem;
        flex: 0.6;
        flex-direction: column;
        justify-content: center;
        margin: 0 auto;
    }
</style>
