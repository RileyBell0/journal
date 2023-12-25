<script>
    import '../app.postcss';
    import Header from './Header.svelte';
    import '$lib/styles.less';

    export let data;
    let authenticated = data.authenticated;
</script>

<div class="app">
    <Header {authenticated} />

    <slot />
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
</style>
