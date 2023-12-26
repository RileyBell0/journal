<script>
    import '../app.postcss';
    import Header from './Header.svelte';
    import '$lib/styles.less';
    import Notifications from '$lib/components/Notifications/Notifications.svelte';

    export let data;
    let authenticated = data.authenticated;
</script>

<div class="app">
    <Header {authenticated} />

    <slot />

    <Notifications />
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--bg-100);
    }
</style>
