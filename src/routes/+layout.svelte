<script>
    import '../app.postcss';
    import Header from './Header.svelte';
    import '$lib/styles.less';
    import NotificationDisplayer from '$lib/components/Notifications/NotificationDisplayer.svelte';

    export let data;
    let authenticated = data.authenticated;
</script>

<div class="app">
    <Header {authenticated} />

    <slot />

    <NotificationDisplayer />
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--bg-100);
    }
</style>
