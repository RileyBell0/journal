<script lang="ts">
	import EditorJs, { type API, type BlockMutationEvent, type OutputData } from '@editorjs/editorjs';
	import Header from '@editorjs/header';
	import Link from '@editorjs/link';
	import Checklist from '@editorjs/checklist';
	import Embed from '@editorjs/embed';
	import List from '@editorjs/list';
	import Raw from '@editorjs/raw';
	import SimpleImage from '@editorjs/simple-image';
	import backend from '$lib/net/backend';
	import { debounce } from 'ts-debounce';
	import { onMount } from 'svelte';
	export const prerender = false;
	import { count } from './stores';

	type NoteState = {
		id: number;
		time: number;
		content: OutputData;
		title: string;
	};

	// Constants
	const id = `note_${$count++}`;
	const save_delay_ms = 500;
	const save_note_debounced = debounce(save_note, save_delay_ms);
	const date_format = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	};
	const default_title_format = {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: '2-digit'
	};

	// For saving a note
	export let placeholder: string = 'Enter text here';
	export let initialise: NoteState | null = null;
	let note_id: number | null = null;
	let title: string =
		initialise?.title ?? new Date().toLocaleString(undefined, default_title_format);
	let last_edit = initialise?.time ?? 0;
	let last_saved_edit = initialise?.time ?? 0;

	// Needed for saving and initialising a new note
	let being_created = false;

	// Initialise the editor
	let editor_options: any = {
		holder: id,
		placeholder: placeholder,
		tools: {
			header: Header,
			link: Link,
			checklist: Checklist,
			embed: Embed,
			list: List,
			raw: Raw,
			simple_image: SimpleImage
		},
		minHeight: 0,
		onChange: (api: API, event: BlockMutationEvent) => {
			save_note_debounced();
		}
	};
	if (initialise !== null) {
		editor_options.data = initialise.content;
	}
	const editor = new EditorJs(editor_options);

	// Save
	onMount(() => {
		const editorContent = document.getElementById(id);
		if (editorContent !== null) {
			editorContent.addEventListener('input', () => {
				save_note_debounced();
			});
		}
	});
	async function save_note() {
		// exit early (optimisation)
		if (being_created) {
			return;
		}

		const data = await editor.save();

		// in-between await blocks. Check if it's being created elsewhere
		if (being_created) {
			return;
		}

		// Update the most recent saved edit
		if (last_edit === data.time) {
			return;
		}
		last_edit = last_edit < (data.time ?? 0) ? data.time ?? 0 : last_edit;

		// Save changes.
		// If we haven't created the note yet, don't save anything, there's no need, it's got no content
		const contents = JSON.stringify(data);
		if (note_id === null && data.blocks.length > 0) {
			being_created = true;
			// Create the note
			let res = await backend.post('/notes', {
				content: contents,
				time: data.time ?? 0,
				title: title
			});
			if (res.status === 201) {
				note_id = res.data;

				// check if we skipped any updates while saving
				being_created = false;
				save_note_debounced();
			}
			last_saved_edit = (data.time ?? 0) > last_saved_edit ? data.time ?? 0 : last_saved_edit;

			being_created = false;
		} else if (note_id !== null) {
			// TODO handle errors
			await backend.post(`/notes/${note_id}`, {
				content: contents,
				time: data.time ?? 0,
				title: title
			});
			last_saved_edit = (data.time ?? 0) > last_saved_edit ? data.time ?? 0 : last_saved_edit;
		}
	}
</script>

<div>
	<input
		on:input={() => save_note_debounced()}
		bind:value={title}
		type="text"
		class="heading"
		placeholder="Title"
	/>
	<p class="subtext">
		Last Updated: {last_saved_edit === 0
			? 'Uninitialised'
			: new Date(last_saved_edit).toLocaleString(undefined, date_format)}
	</p>
	<div class="note" {id} />
</div>

<style>
	.note {
		width: 100%;
		padding: 0px;
	}
	.subtext {
		opacity: 0.8;
	}
	.heading {
		border: none;
		outline: none;
		display: block;
		font-size: 1.5em;
		margin-block-start: 0.83em;
		margin-block-end: 0.83em;
		margin-inline-start: 0px;
		margin-inline-end: 0px;
		font-weight: bold;
		padding: 0px;
		width: 100%;
		border-bottom: 1px solid #ccc;
	}
</style>
