<script lang="ts">
	import Note from '$lib/Note.svelte';
	import type { OutputData } from '@editorjs/editorjs';
	import { onMount } from 'svelte';
	import note from '$lib/note';

	// TODO store ocntent of notes as a json
	// add ordering column, on conflict of duplicate values, sort by most recently edited, but there should never really be duplicate values.
	// Maybe we should be sortingby most recently edited?
	// pass the id, ordering, title, last edited to get all notes
	// when deleting a note it should select the one directly above it

	type Note = {
		id: number;
		content: OutputData;
		time: number;
		title: string;
	};

	type NoteOverview = {
		id: number;
		title: string;
	};

	onMount(async () => {
		// TODO store notes in a store or something, that way each note is responsible for updating its own state, other places just read that (other places such as here)
		note.fetch_all().then((res) => (notes = res ?? []));
	});

	let search_term = '';
	let can_delete = false;
	let notes: NoteOverview[] = [];
	$: filtered_notes = filter(notes, search_term);
	let selected_note: Note | null = null;
	let selected_note_id: number | null = null;
	let new_note_reset = 0; // changing this value refreshes the new note

	/**
	 * Keeps only notes with titles that contain search_term (case insensitive)
	 */
	function filter(notes: NoteOverview[], search_term: string): NoteOverview[] {
		let term = search_term.toLocaleLowerCase();
		return notes.filter((elem) => elem.title.toLocaleLowerCase().includes(term));
	}

	/**
	 * Callback for onSave for notes. When they get updated we'll update our state
	 * here accordingly - getting new notes included in the list of notes, and
	 * updating the titles of existing notes
	 */
	function updateNoteOverview(id: number, title: string): void {
		let index = notes.findIndex((note) => note.id === id);
		let new_note = { id, title };
		if (index === -1) {
			notes = [...notes, new_note];
		} else {
			notes[index] = new_note;
		}
	}

	/**
	 * Deletes the currently selected note
	 */
	async function delete_note() {
		if (selected_note_id === null) {
			return;
		}

		if (!(await note.delete_one(selected_note_id))) {
			alert('Failed to delete note!');
			return;
		}

		select_note(null);
		let index = notes.findIndex((note) => note.id === selected_note_id);
		if (index !== -1) {
			notes.splice(index, 1);
			notes = notes;
		}
	}

	/**
	 * Selects the given note and displays it for editing
	 */
	async function select_note(note_id: number | null) {
		if (note_id === null) {
			can_delete = false;
			selected_note = null;
			new_note_reset++;
		} else {
			selected_note = await note.fetch_one(note_id);
		}
	}
</script>

<svelte:head>
	<title>Notes</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section class="section-header">
	<input class="search" type="text" placeholder="Search" bind:value={search_term} />
	<button on:click={() => select_note(null)}>New</button>
</section>
<div class="holder">
	<div class="note-menu">
		{#if filtered_notes.length > 0}
			{#each filtered_notes as note}
				<button
					on:click={() => {
						select_note(note.id);
					}}
					class="note-overview">{note.title}</button
				>
			{/each}
		{:else}
			<p>No notes found</p>
		{/if}
	</div>
	<div class="editor-panel">
		{#if selected_note !== null}
			{#key selected_note.id}
				<div class="card">
					<Note
						state={selected_note}
						onSave={updateNoteOverview}
						bind:can_delete
						bind:id={selected_note_id}
					/>
				</div>
			{/key}
		{:else}
			{#key new_note_reset}
				<div class="card">
					<Note onSave={updateNoteOverview} bind:can_delete bind:id={selected_note_id} />
				</div>
			{/key}
		{/if}
		<div class="note-delete-section">
			<button disabled={!can_delete} class="delete" on:click={() => delete_note()}>Delete</button>
		</div>
	</div>
</div>

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
			Make a new page for doomscroll? DOOMSCROLL - all notes, sorted by recency, pinned notes at the
			top (like apple notes basically)
		</li>
		<li />
		<li>Add hamburger menu for deletion to the side of note overviews</li>
	</ul>
</div>

<style>
	.note-delete-section {
		width: 100%;
		display: flex;
		justify-content: flex-end;
	}
	.editor-panel {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.section-header {
		display: flex;
		gap: 20px;
		padding: 20px;
		justify-content: space-between;
	}
	.holder {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		gap: 20px;
		padding: 20px;
	}
	.delete {
		background-color: white;
		padding: 10px;
		border: none;
		border-radius: 5px;
		box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
	}
	.delete:enabled:hover {
		filter: brightness(0.95);
		cursor: pointer;
	}
	.search {
		background-color: white;
		padding: 10px;
		border: none;
		border-radius: 5px;
		box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
	}
	.note-overview {
		min-height: calc(1rem + 20px);
		padding: 10px;

		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;

		background-color: white;

		box-sizing: border-box;
		border-radius: 5px;
		border: none;
		box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
	}
	.note-overview:hover {
		filter: brightness(0.95);
		cursor: pointer;
	}
	.note-menu {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
		background-color: #7b7b7b;
		border-radius: 10px;
		max-width: 250px;
		width: 100%;
	}
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
