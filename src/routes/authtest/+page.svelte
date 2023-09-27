<script lang="ts">
	import backend from '$lib/net/backend';
	import { isAxiosError } from 'axios';
	import Temp from './Temp.svelte';

	export let data;
	let authenticated = data.authenticated;

	const messageDuration = 2000;
	console.log(data);

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

		let data = new FormData();
		data.append('email', 'a@a.com');
		data.append('password', 'asdfasdf');

		try {
			let res = await backend.post('/auth/login', data);
			setLoginMessage('Logged in!');
			location.reload();
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
			let res = await backend.post('/auth/logout');
			if ((res.status ?? 0) === 200) {
				setLogoutMessage('Signed out successfully!');
				location.reload();
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
			setCheckAuthMessage('Authenticated: ' + (res.status === 200 ? 'true' : 'false'));
		} catch (err: any) {
			if (isAxiosError(err)) {
				if (err.response) {
					setCheckAuthMessage(`Error: Status ${err.response.status} returned`);
				} else {
					setCheckAuthMessage('Error: No response returned.');
				}
			} else {
				setCheckAuthMessage('Error: an unknown error occured!');
			}
		}
		checkAuthPlaceholder = '';
	}
</script>

<svelte:head>
	<title>Test your Authentication</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>
<div style={'display: flex; flex-direction: column; gap:10px'}>
	<h2>Authentication: {authenticated ? 'true' : 'false'}</h2>
	{#if !authenticated}
		<div class="section">
			<button class="action" on:click={logIn} disabled={loginPlaceholder !== ''}>Log in</button>
			<Temp
				placeholder={loginPlaceholder}
				duration={messageDuration}
				bind:setMessage={setLoginMessage}
				bind:clearMessage={clearLoginMessage}
			/>
		</div>
	{:else}
		<div class="section">
			<button class="action" on:click={logOut} disabled={logoutPlaceholder !== ''}>Log Out</button>
			<Temp
				placeholder={logoutPlaceholder}
				duration={messageDuration}
				bind:setMessage={setLogoutMessage}
				bind:clearMessage={clearLogoutMessage}
			/>
		</div>
	{/if}

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
