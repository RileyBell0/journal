<script lang="ts">
    import EditorJs, {
        type API,
        type BlockMutationEvent,
        type OutputData
    } from '@editorjs/editorjs';
    import Header from '@editorjs/header';
    // @ts-ignore
    import Link from '@editorjs/link';
    // @ts-ignore
    import Checklist from '@editorjs/checklist';
    // @ts-ignore
    import Embed from '@editorjs/embed';
    // @ts-ignore
    import List from '@editorjs/list';
    // @ts-ignore
    import Raw from '@editorjs/raw';
    // @ts-ignore
    import SimpleImage from '@editorjs/simple-image';
    import { debounce } from 'ts-debounce';
    import { onDestroy, onMount } from 'svelte';
    export const prerender = false;
    import { count } from './stores';
    import note from './note';

    type NoteState = {
        id: null | number;
        time: number;
        content: OutputData;
        title: string;
    };

    // Constants
    const html_id = `note_${$count++}`;
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

    // For saving a note
    export let placeholder: string = 'Enter text here';
    export let state: NoteState = {
        id: null,
        time: 0,
        content: { blocks: [], time: new Date().getUTCMilliseconds(), version: 'n/a' },
        title: ''
    } as NoteState;
    export let id = state.id;
    export let can_delete = state.id !== null;
    $: {
        can_delete = state.id !== null;
    }
    $: {
        id = state.id;
    }

    export let onSave = (id: number, title: string, update_time: number) => {};

    let last_edit = state?.time ?? 0;

    // Needed for saving and initialising a new note
    let being_created = false;

    // Initialise the editor
    let editor_options: any = {
        holder: html_id,
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
            save_note_debounced().catch(() => {});
        }
    };
    if (state !== null) {
        editor_options.data = state.content;
    }
    const editor = new EditorJs(editor_options);

    onDestroy(() => {
        save_note_debounced.cancel();
        try {
            editor.destroy();
        } catch (e) {}
    });

    // Save
    onMount(() => {
        const editorContent = document.getElementById(html_id);
        if (editorContent !== null) {
            editorContent.addEventListener('input', async () => {
                save_note_debounced().catch(() => {});
            });
        }
    });

    async function initialise() {}

    async function save_note() {
        if (editor === undefined) {
            return;
        }
        const content = await editor.save();

        // in-between await blocks. Check if it's being created elsewhere
        if (being_created) {
            return;
        }

        // Update the most recent saved edit
        if (last_edit === content.time) {
            return;
        }
        last_edit = last_edit < (content.time ?? 0) ? content.time ?? 0 : last_edit;

        // Save changes.
        let update_time = (content.time ?? 0) > state.time ? content.time ?? 0 : state.time;
        if (state.id === null && (content.blocks.length > 0 || state.title.length > 0)) {
            being_created = true;
            state.id = await note.create(state.title, content);
            being_created = false;

            if (state.id === null) {
                alert('ERROR - failed to save note');
            } else {
                onSave(state.id, state.title, update_time);
                save_note_debounced().catch(() => {});
            }

            being_created = false;
        } else if (state.id !== null) {
            await note.update(state.id, state.title, content);
            onSave(state.id, state.title, update_time);
        }

        state.time = update_time;
    }
</script>

<div>
    <input
        on:input={() => {
            save_note_debounced().catch(() => {});
        }}
        bind:value={state.title}
        type="text"
        class="heading"
        placeholder="Title"
    />
    <p class="subtext">
        Last Updated: {state.time === 0
            ? 'Uninitialised'
            : // @ts-ignore
              new Date(state.time).toLocaleString(undefined, date_format)}
    </p>
    <div class="note" id={html_id} />
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
