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

	// Constants
	const id = `note_${$count++}`;
	const save_delay_ms = 500;
	const save_note_debounced = debounce(save_note, save_delay_ms);

	// For saving a note
	export let note_id: number | null = null;
	export let initial_state: OutputData | null = null;
	export let placeholder: string = 'Enter text here';

	let being_created = false;
	let last_edit = 0;
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
		onChange: (api: API, event: BlockMutationEvent) => {
			save_note_debounced();
		}
	};
	if (initial_state !== null) {
		editor_options.data = initial_state;
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
			let res = await backend.post('/notes', { content: contents, time: data.time ?? 0 });
			if (res.status === 201) {
				note_id = res.data;

				// check if we skipped any updates while saving
				being_created = false;
				save_note_debounced();
			}

			being_created = false;
		} else if (note_id !== null) {
			// TODO handle errors
			await backend.post(`/notes/${note_id}`, {
				content: contents,
				time: data.time ?? 0
			});
		}
	}
</script>

<div class="note" {id} />

<style>
	.note {
		width: 100%;
	}
</style>
