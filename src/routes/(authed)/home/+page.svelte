<script lang="ts">
	import Note from '../../../lib/Note.svelte';
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<div>
	<h1>Home</h1>
	<p>TODO</p>
	<ul>
		<li>Should be similar to the notes page</li>
		<li>
			This is gonna be a diary section - it'll automatically hold a blank note at the start of each
			day (after 5am local time)
		</li>
		<li>
			Be able to search by Title and/or date and/or content? how do we do content in zero-knowledge?
		</li>
	</ul>
</div>
<div class="page">
	<div class="card">
		<Note />
	</div>

	<div class="divider" />

	<div class="card">
		<Note />
	</div>
</div>

<style>
	.card {
		background-color: white;
		border-radius: 10px;
		width: 100%;
		max-width: 600px;
		padding: 20px 40px;
		box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
		margin-left: auto;
		margin-right: auto;
	}
	.page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
</style>
