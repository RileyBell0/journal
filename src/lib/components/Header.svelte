<script lang="ts">
    import { page } from '$app/stores';
    import logo from '$lib/images/svelte-logo.svg';
    import profile_none from '$lib/images/profile_none.png';
    import { backend } from '$lib/net/backend';
    import { goto } from '$app/navigation';
    import { clickOutside } from 'svelte-use-click-outside';
    import { authenticated } from '$lib/auth/Auth';

    let profile_visible = false;

    /**
     * Signs the user out and redirects them to the home page
     */
    const signout = async () => {
        $authenticated = false;

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
        <ul>
            {#if $authenticated}
                <li aria-current={$page.url.pathname === '/journal' ? 'page' : undefined}>
                    <a href="/journal">Journal</a>
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
                {#if $authenticated}
                    <button on:click={signout}>Sign Out</button>
                    <button on:click={signout}>Sign Out</button>
                {:else}
                    <a href="/login">Login</a>
                {/if}
            </div>
        </button>
    </div>
</header>

<style lang="less">
    @import '$styles/styles.less';

    header {
        display: flex;
        justify-content: space-between;
        background-color: @bg;
        box-shadow: @shadow;
        height: @header-height;
        z-index: 1;

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
            background-color: @bg;
            border: @profile-border-width solid @primary;
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

                background-color: @bg;
                border-radius: 5px;
                box-shadow: @shadow;

                & > a,
                & > button {
                    display: flex;
                    justify-content: left;
                    align-items: center;

                    width: 100%;
                    height: 32px;

                    color: @accent;
                    text-align: left;

                    cursor: pointer;
                    padding: 16px;

                    border-top: 0.5px solid rgba(@accent, 1);
                    border-bottom: 0.5px solid rgba(@accent, 1);

                    &:first-child {
                        border-top: 1px solid rgba(@accent, 1);
                    }
                    &:last-child {
                        border-bottom: 1px solid rgba(@accent, 1);
                    }

                    &:hover {
                        text-decoration: none;
                        background-color: @bg-50;
                    }
                }
            }
        }

        // Top middle nav bar
        nav {
            display: flex;
            justify-content: center;
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
            background: @bg;
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
                    border-top: @size solid @primary;
                }

                a {
                    display: flex;
                    align-items: center;

                    height: 100%;
                    padding: 0 0.5rem;

                    color: @text;

                    font-weight: 700;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    text-decoration: none;

                    transition: color 0.2s linear;

                    &:hover {
                        color: @primary;
                    }
                }
            }
        }
    }
</style>
