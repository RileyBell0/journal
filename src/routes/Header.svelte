<script lang="ts">
    import { page } from '$app/stores';
    import logo from '$lib/images/svelte-logo.svg';
    import profile_none from '$lib/images/profile_none.png';
    import { backend } from '$lib/net/backend';
    import { goto } from '$app/navigation';
    import { clickOutside } from 'svelte-use-click-outside';

    export let authenticated: boolean;

    let profile_visible = false;

    /**
     * Signs the user out and redirects them to the home page
     */
    const signout = async () => {
        authenticated = false;

        try {
            await backend.post('/auth/logout');
        } catch (e) {}

        goto('/');
    };
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
        <button
            on:click={() => {
                profile_visible = !profile_visible;
            }}
            use:clickOutside={() => {
                profile_visible = false;
            }}
            class="profile"
        >
            <img class="profile_pic" src={profile_none} alt="Profile" />
            <div class="dropdown" class:hidden={!profile_visible}>
                <a href="/login">Login</a>
                <button on:click={signout}>Sign Out</button>
            </div>
        </button>
    </div>
</header>

<style lang="less">
    header {
        display: flex;
        justify-content: space-between;

        .hidden {
            display: none !important;
        }

        // A corner of the header
        .corner {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 3em;
            height: 3em;

            // Svelte logo
            .logo {
                display: flex;
                align-items: center;
                justify-content: center;

                width: 2em;
                height: 2em;
            }
        }

        // The profile image and its dropdown
        .profile {
            @profile-height: 32px;
            @profile-border-radius: 5px;
            @profile-border-width: 1px;

            position: relative;

            height: @profile-height;
            width: 32px;

            box-sizing: border-box;
            background-color: white;
            border: @profile-border-width solid #ff3e00;
            border-radius: @profile-border-radius;

            .profile_pic {
                object-fit: cover;
                box-sizing: border-box;
                width: 100%;
                height: 100%;
                border-radius: @profile-border-radius - @profile-border-width;
            }

            .dropdown {
                position: absolute;
                top: @profile-height;
                right: 0px;

                display: flex;
                flex-direction: column;

                width: 200px;
                max-width: 200px;

                padding: 15px 0px;

                background-color: #f1f1f1;
                border-radius: 5px;
                box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);

                & > a,
                & > button {
                    display: flex;
                    justify-content: left;
                    align-items: center;

                    width: 100%;
                    height: 32px;

                    color: #ff3e00;
                    text-align: left;

                    cursor: pointer;
                    padding: 16px;

                    &:hover {
                        text-decoration: none;
                        background-color: #ffdfd4;
                    }
                }
            }
        }

        // Top middle nav bar
        nav {
            display: flex;
            justify-content: center;

            // Angled edges of the middle nav
            svg {
                width: 2em;
                height: 3em;
                display: block;

                path {
                    fill: var(--bg);
                }
            }
        }

        // the list of options in the nav
        ul {
            padding: 0;
            margin: 0;
            height: 3em;
            display: flex;
            justify-content: center;
            align-items: center;
            list-style: none;
            background: var(--bg);
            background-size: contain;

            // An individual nav option
            li {
                position: relative;
                height: 100%;

                // Chuck a lil red arrow on the currently loaded page
                &[aria-current='page']::before {
                    content: '';
                    @size: 6px;

                    width: 0;
                    height: 0;
                    position: absolute;
                    top: 0;
                    left: calc(50% - @size);
                    border: @size solid transparent;
                    border-top: @size solid var(--primary);
                }

                a {
                    display: flex;
                    align-items: center;

                    height: 100%;
                    padding: 0 0.5rem;

                    color: var(--text);

                    font-weight: 700;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    text-decoration: none;

                    transition: color 0.2s linear;

                    &:hover {
                        color: var(--primary);
                    }
                }
            }
        }
    }
</style>
