<script lang="ts">
    import { goto } from '$app/navigation';
    import { authenticated } from '$lib/auth/Auth';
    import { backend } from '$lib/net/backend';

    let email = '';
    let password = '';

    async function login(event: SubmitEvent) {
        try {
            let res = await backend.post('/auth/login', event.target);
            if (res.status === 200) {
                $authenticated = true;
                goto('/authtest');
            }
        } catch (e) {
            alert(e);
        }
    }
</script>

<div class="main">
    <div class="login">
        <h2>Login</h2>
        <form on:submit|preventDefault={login}>
            <div class="login__field">
                <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Email"
                    bind:value={email}
                />
            </div>
            <div class="login__field">
                <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Password"
                    bind:value={password}
                />
                <p style="margin: 0px; color: grey;">Minimum 4 chars</p>
            </div>
            <button
                type="submit"
                class="login__submit"
                disabled={email.length <= 0 || password.length < 8}>Login</button
            >
        </form>
    </div>
</div>

<style lang="less">
    @import '$styles/styles.less';

    .main {
        display: flex;
        justify-content: center;

        width: 100%;
        padding: 40px 20px;
        box-sizing: border-box;
    }

    .login {
        display: flex;
        flex-direction: column;
        gap: 10px;

        width: 100%;
        max-width: 280px;
        padding: 40px;

        background-color: white;

        border-radius: 5px;
        box-shadow: var(--shadow);
    }

    .login > form {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    input {
        border-radius: 5px;
        border: none;
        padding: 7px;
        outline: 2px solid gainsboro;
        box-shadow: var(--shadow);
    }

    .login__submit {
        margin-top: 10px;
        max-width: 100px;
    }

    .login__field {
        width: 100%;
    }
    .login__field > input {
        width: 100%;
        box-sizing: border-box;
    }
</style>
