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
    // @ts-ignore
    import ImageTool from '@editorjs/image';
    import { debounce } from 'ts-debounce';
    import { onDestroy, onMount } from 'svelte';
    export const prerender = false;
    import { count } from './stores';
    import { create, update, type Note, type NoteOverview } from './NoteStore';
    import { get, writable, type Writable } from 'svelte/store';
    import { backend_url } from './net/backend';

    type NoteState = {
        id: number;
        update_time: number;
        content: OutputData;
        title: string;
        favourite: boolean;
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

    // Import state
    export let state: Writable<Note> = writable({
        content: {
            blocks: [],
            time: new Date().getUTCMilliseconds(),
            version: 'n/a'
        } as OutputData,
        overview: writable({ id: -1, update_time: 0, title: '', favourite: false } as NoteOverview)
    } as Note);

    // Set the internal state, and keep it updated
    let internal_state: NoteState = load_state(state);
    let unsub_note = state.subscribe((elem) => {
        internal_state.content = elem.content;
    });
    let unsub_overview = get(state).overview.subscribe((elem) => {
        internal_state.id = elem.id;
        internal_state.favourite = elem.favourite;
        internal_state.title = elem.title;
        internal_state.update_time = elem.update_time;
    });
    export let can_delete = internal_state.id >= 0;
    $: {
        can_delete = internal_state.id >= 0;
    }

    export let id: number = internal_state.id;
    $: {
        id = internal_state.id;
    }

    function load_state(state: Writable<Note>): NoteState {
        let content = get(state);
        let overview = get(content.overview);
        let note_state = {
            id: overview.id,
            update_time: overview.update_time,
            content: content.content,
            title: overview.title,
            favourite: overview.favourite
        } as NoteState;

        return note_state;
    }

    // Needed for saving and initialising a new note
    let being_created = false;

    // Initialise the editor
    const editor = new EditorJs({
        holder: html_id,
        placeholder: placeholder,
        tools: {
            header: Header,
            link: Link,
            checklist: Checklist,
            embed: Embed,
            list: List,
            raw: Raw,
            simple_image: SimpleImage,
            image: {
                class: ImageTool,
                config: {
                    endpoints: {
                        byFile: `${backend_url}/api/images`, // Your backend file uploader endpoint
                        byUrl: 'http://localhost:8008/fetchUrl' // Your endpoint that provides uploading by Url
                    }
                }
            }
        },
        data: internal_state.content,
        minHeight: 0,
        onChange: (api: API, event: BlockMutationEvent) => {
            save_note_debounced().catch(() => {});
        }
    });

    onDestroy(() => {
        try {
            save_note_debounced.cancel();
            editor.destroy();
            unsub_note();
            unsub_overview();
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
        const edit_time = content.time ?? 0;
        if (internal_state.update_time > edit_time) {
            return;
        }

        const empty_content = content.blocks.length === 0;
        const empty_title = internal_state.title.length === 0;
        const is_initialised = internal_state.id >= 0;

        // Create the note if it's not initialised
        if (!is_initialised && (!empty_content || !empty_title)) {
            being_created = true;

            let new_note = await create(internal_state.title, content);
            if (new_note === null) {
                alert('error - note');
                return;
            }

            // Subscribe to the new note store
            unsub_note();
            unsub_overview();
            unsub_note = new_note.subscribe((event) => {
                internal_state.content = event.content;
            });
            unsub_overview = get(new_note).overview.subscribe((event) => {
                internal_state.id = event.id;
                internal_state.favourite = event.favourite;
                internal_state.title = event.title;
                internal_state.update_time = event.update_time;
            });

            being_created = false;

            save_note_debounced().catch(() => {});
        } else if (internal_state.id !== null) {
            await update(
                internal_state.id,
                internal_state.title,
                content,
                internal_state.favourite
            );
        }
    }
</script>

<div>
    <input
        on:input={() => {
            save_note_debounced().catch(() => {});
        }}
        bind:value={internal_state.title}
        type="text"
        class="heading"
        placeholder="Title"
    />
    <p class="subtext">
        Last Updated: {internal_state.update_time === 0
            ? 'Uninitialised'
            : // @ts-ignore
              new Date(internal_state.update_time).toLocaleString(undefined, date_format)}
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
