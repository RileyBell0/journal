<script lang="ts">
	import Note from '$lib/Note.svelte';
	import backend from '$lib/net/backend';
	import type { OutputData } from '@editorjs/editorjs';

	type Note = {
		id: number;
		content: OutputData;
		time: number;
	};

	let notes: Note[] = [];

	async function load_all() {
		let res = await backend.get('/notes');
		if (res.status === 200) {
			let ids: number[] = res.data;
			let loading_notes: Promise<Note>[] = [];
			ids.forEach((element: number) => {
				loading_notes.push(load_note(element));
			});

			notes = await Promise.all(loading_notes);
		} else {
			alert('Failed to get all notes');
		}
	}

	async function load_note(id: number): Promise<Note> {
		let res = await backend.get(`/notes/${id}`);
		if (res.status === 200) {
			let note = res.data;
			note.content = JSON.parse(note.content) as OutputData;
			return note as Note;
		} else {
			alert('Failed to get all notes');
			throw new Error();
		}
	}
</script>

<svelte:head>
	<title>Notes</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<div>
	<h1>Notes</h1>
	<p>TODO</p>
	<ul>
		<li>Get images working in the backend for this</li>
		<li>
			Need a view section - should deafult to the most recent note - BUT - we should be able to have
			multiple
		</li>
		<li>View: Doomscroll, Sidebar</li>
		<li>
			DOOMSCROLL - all notes, sorted by recency, pinned notes at the top (like apple notes
			basically)
		</li>
		<li>SIDEBAR - a list of notes at the side, and one focussed in the rest of the screen</li>
		<li />
		<li>All notes should have titles</li>
		<li>Should have a 'create new note' button at the top of the page</li>
		<li>
			Should be able to delete notes - with a big warning sign of course. Maybe put this in a
			hamburger next to the note's title?
		</li>
	</ul>
</div>
<button on:click={load_all}>Get all</button>
{#each notes as note}
	<div class="card">
		<Note note_id={note.id} initial_state={note.content} />
	</div>
{/each}

<div />

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
</style>
