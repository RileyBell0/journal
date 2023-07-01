<script lang="ts">
	import backend from '$lib/net/backend';
	import Temp from './Temp.svelte';

	const messageDuration = 2000;

	let loginPlaceholder = '';
	let logoutPlaceholder = '';
	let checkAuthPlaceholder = '';

	let setLoginMessage: (newMessage: string) => void;
	let setLogoutMessage: (newMessage: string) => void;
	let setCheckAuthMessage: (newMessage: string) => void;
	let clearLoginMessage: () => void;
	let clearLogoutMessage: () => void;
	let clearCheckAuthMessage: () => void;

	async function logIn() {
		clearLoginMessage();
		loginPlaceholder = 'Logging in...';
		try {
			let res = await backend.post('/auth/login', { email: 'a@a.com', password: 'asdfasdf' });
			setLoginMessage('Logged in!');
		} catch (err: any) {
			let message = 'Error: ' + (err.response.data.message ?? 'an unknown error occured!');
			setLoginMessage(message);
		}
		loginPlaceholder = '';
	}

	async function logOut() {
		clearLogoutMessage();
		logoutPlaceholder = 'Logging out...';
		try {
			let res = await backend.post('/auth/signout');
			if ((res.status ?? 0) === 200) {
				setLogoutMessage('Signed out successfully!');
			} else {
				setLogoutMessage('Something happened ' + JSON.stringify(res));
			}
		} catch (err: any) {
			let message = 'Error: ' + (err.response.data.message ?? 'an unknown error occured!');
			setLogoutMessage(message);
		}
		logoutPlaceholder = '';
	}

	async function checkAuth() {
		clearCheckAuthMessage();
		checkAuthPlaceholder = 'Checking your auth status...';
		try {
			let res = await backend.get('/auth');
			if ((res.status ?? 0) === 200 && res.data.isAuthenticated !== undefined) {
				setCheckAuthMessage('Authenticated: ' + (res.data.isAuthenticated ? 'true' : 'false'));
			} else {
				setCheckAuthMessage('Something went wrong! ' + JSON.stringify(res));
			}
		} catch (err: any) {
			let message = 'Error: ' + (err.response.data.message ?? 'an unknown error occured!');
			setCheckAuthMessage(message);
		}
		checkAuthPlaceholder = '';
	}
</script>

<div style={'display: flex; flex-direction: column; gap:10px'}>
	<div class="section">
		<button class="action" on:click={logIn} disabled={loginPlaceholder !== ''}>Log in</button>
		<Temp
			placeholder={loginPlaceholder}
			duration={messageDuration}
			bind:setMessage={setLoginMessage}
			bind:clearMessage={clearLoginMessage}
		/>
	</div>

	<div class="section">
		<button class="action" on:click={logOut} disabled={logoutPlaceholder !== ''}>Log Out</button>
		<Temp
			placeholder={logoutPlaceholder}
			duration={messageDuration}
			bind:setMessage={setLogoutMessage}
			bind:clearMessage={clearLogoutMessage}
		/>
	</div>

	<div class="section">
		<button class="action" on:click={checkAuth} disabled={checkAuthPlaceholder !== ''}
			>Check authentication</button
		>
		<Temp
			placeholder={checkAuthPlaceholder}
			duration={messageDuration}
			bind:setMessage={setCheckAuthMessage}
			bind:clearMessage={clearCheckAuthMessage}
		/>
	</div>
</div>

<style>
	.section {
		display: flex;
		align-items: center;
		gap: 10px;
		background-color: aliceblue;
		padding: 5px;
		border-radius: 10px;
		border: 2px solid grey;
	}
	.action {
		min-width: 200px;
	}
</style>
