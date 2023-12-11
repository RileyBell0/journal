<script lang="ts">
    import { page } from '$app/stores';
    import logo from '$lib/images/svelte-logo.svg';
    import profile_none from '$lib/images/profile_none.jpg';
    import profile_default from '$lib/images/dog.jpeg';
    import { backend } from '$lib/net/backend';
    import { goto } from '$app/navigation';
    import { clickOutside } from 'svelte-use-click-outside';

    let profile_visible = false;
    function toggle_profile_visibility() {
        profile_visible = !profile_visible;
    }

    export let authenticated: boolean;

    async function signout() {
        try {
            await backend.post('/auth/logout');
        } finally {
            goto('/');
        }
    }
</script>

<header>
    <div class="corner">
        <a class="logo" href="https://kit.svelte.dev">
            <img src={logo} alt="SvelteKit" />
        </a>
    </div>

    <nav>
        <svg viewBox="0 0 2 3" aria-hidden="true">
            <path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
        </svg>
        <ul>
            {#if authenticated}
                <li aria-current={$page.url.pathname === '/home' ? 'page' : undefined}>
                    <a href="/home">Home</a>
                </li>
                <li aria-current={$page.url.pathname === '/notes' ? 'page' : undefined}>
                    <a href="/notes">Notes</a>
                </li>
            {/if}
            <li aria-current={$page.url.pathname.startsWith('/authtest') ? 'page' : undefined}>
                <a href="/authtest">Auth</a>
            </li>
            <li aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
                <a href="/">About</a>
            </li>
        </ul>
        <svg viewBox="0 0 2 3" aria-hidden="true">
            <path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
        </svg>
    </nav>

    <div class="corner">
        <button on:click={toggle_profile_visibility}>
            <img
                class="profile_img"
                src={authenticated ? profile_default : profile_none}
                alt="Profile"
            />
        </button>
        <div
            class="profile_dropdown"
            class:hidden={!profile_visible}
            use:clickOutside={() => {
                if (profile_visible) {
                    toggle_profile_visibility();
                }
            }}
        >
            <p><a href="/login">Login</a></p>
            <button on:click={signout}>Sign Out</button>
        </div>
    </div>
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
    }

    .hidden {
        display: none !important;
    }

    .corner {
        position: relative;
        display: inline-block;
        width: 3em;
        height: 3em;
    }

    .profile_dropdown {
        display: flex;
        gap: 10px;
        flex-direction: column;
        justify-content: left;
        align-items: flex-start;
        background-color: #f1f1f1;
        margin: 0px;
        right: 0;
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
        overflow: auto;
        float: right;
        padding: 15px;
        width: 200px;
        max-width: 200px;
        padding-bottom: 25px;
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
    }

    .profile_dropdown > button,
    p {
        width: 100%;
        padding: 8px;

        text-align: left;
        color: #ff3e00;

        border-radius: 5px;
        border: 1px solid gainsboro;

        box-sizing: border-box;
    }

    .profile_dropdown > button:hover {
        text-decoration: underline;
    }

    .profile_dropdown a:hover {
        cursor: pointer;
    }

    button {
        background: none;
        border: none;
        outline: inherit;
        cursor: pointer;
        padding: 0;
        color: inherit;
    }

    .corner > button {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .profile_img {
        border-radius: 50%;
        outline: 2px solid #ff3e00;
    }

    .corner img {
        width: 2em;
        height: 2em;
        object-fit: cover;
    }

    nav {
        display: flex;
        justify-content: center;
        --background: rgba(255, 255, 255, 0.7);
    }

    svg {
        width: 2em;
        height: 3em;
        display: block;
    }

    path {
        fill: var(--background);
    }

    ul {
        position: relative;
        padding: 0;
        margin: 0;
        height: 3em;
        display: flex;
        justify-content: center;
        align-items: center;
        list-style: none;
        background: var(--background);
        background-size: contain;
    }

    li {
        position: relative;
        height: 100%;
    }

    li[aria-current='page']::before {
        --size: 6px;
        content: '';
        width: 0;
        height: 0;
        position: absolute;
        top: 0;
        left: calc(50% - var(--size));
        border: var(--size) solid transparent;
        border-top: var(--size) solid var(--color-theme-1);
    }

    nav a {
        display: flex;
        height: 100%;
        align-items: center;
        padding: 0 0.5rem;
        color: var(--color-text);
        font-weight: 700;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-decoration: none;
        transition: color 0.2s linear;
    }

    a:hover {
        color: var(--color-theme-1);
    }
</style>
