<script>
    import '../app.postcss';
    import Header from './Header.svelte';
    import NotificationDisplayer from '$lib/components/Notifications/NotificationDisplayer.svelte';
    import { authenticated } from '$lib/auth/Auth';

    export let data;
    $authenticated = data.authenticated;
</script>

<div class="app">
    <Header />

    <slot />

    <NotificationDisplayer />
</div>

<style lang="less">
    @import '$styles/styles.less';

    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--bg-100);
    }
</style>
