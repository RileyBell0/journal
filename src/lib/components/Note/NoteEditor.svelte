<script lang="ts">
    export const prerender = false;

    // Needed to give our editorJS instances unique IDs
    import { count } from './NoteCount';

    // Editor JS imports (or for editorJS)
    import EditorJs, { type OutputData } from '@editorjs/editorjs';
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
    import { backend_url } from '$lib/net/backend';

    // util
    import { debounce } from 'ts-debounce';
    import { writable } from 'svelte/store';
    import { onDestroy, onMount } from 'svelte';

    // Note related
    import { Notes } from '$lib/data/NoteStore';
    import type { NoteInfo, Note, NoteOverview, NoteUpdatePackage } from '$lib/data/NoteStore';

    const BODY_PLACEHOLDER: string = 'Enter text here';
    const SAVE_DELAY_MS = 500;
    const LAST_UPDATED_FORMAT = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    } as Intl.DateTimeFormatOptions;

    /**
     * The inital data to load into the editor
     */
    export let initialState: NoteInfo = Notes.toNoteInfo(
        writable({
            content: {
                blocks: [],
                time: new Date().getUTCMilliseconds(),
                version: 'n/a'
            } as OutputData,
            overview: writable({
                id: -1,
                update_time: 0,
                title: '',
                favourite: false
            } as NoteOverview)
        } as Note)
    );

    /**
     * The current state of the note within the editor - this is the up to date information.
     */
    export let stagedView: NoteInfo = structuredClone(initialState);
    export let autosave: boolean = true;
    export let diary = false;

    $: stagedView = structuredClone(staged);

    // Load initial state
    let saved = structuredClone(initialState);
    let staged = structuredClone(initialState);

    /**
     * Initialise / save changes to the note. Async save (super proud of it)
     * - If a save is already running, new saves will come in and patiently
     *   take turns, discarding themselves if a more recent save is waiting to
     *   take place
     */
    let saving = false;
    let active_save: Promise<boolean>;
    let most_recent_save = new Date();
    const save_note = debounce(async (): Promise<boolean> => {
        if (!autosave) {
            return true;
        }

        if (editor === undefined) {
            return false;
        }

        // Await all active saves. The active saves will set saving to false
        const current_save_time = new Date();
        while (saving) {
            await active_save;

            // If we've already saved more recent data, don't bother with this save and leave.
            if (current_save_time < most_recent_save) {
                // We're returning true cause the current save attempt has been superceded
                return true;
            }
        }

        /**
         * Saves the note - initialising it if it doesnt exist, or updating
         * it if it does
         *
         * @returns if the save was a success
         */
        const save = async (): Promise<boolean> => {
            const content = await editor.save();

            if (saved.id === -1) {
                // Note doesn't exist yet, create it
                const new_note = await Notes.create(staged.title, content, diary);
                if (new_note === null) {
                    return false;
                }

                // Load the newly saved note into saved
                saved = structuredClone(Notes.toNoteInfo(new_note));
                staged.id = saved.id;
            } else {
                // Note exists - apply an update

                // Construct the update packet
                const update_package: NoteUpdatePackage = {};
                if (staged.title !== saved.title) {
                    update_package.title = staged.title;
                }
                if (staged.favourite !== saved.favourite) {
                    update_package.favourite = staged.favourite;
                }
                const encoded_content = JSON.stringify(content);
                if (encoded_content !== JSON.stringify(saved.content)) {
                    update_package.content = encoded_content;
                }

                // If we have no changes to save, just return
                if (Object.keys(update_package).length === 0) {
                    return true;
                }

                // Apply the update
                const success = await Notes.update(saved.id, update_package);
                if (!success) {
                    return false;
                }

                // Mark as saved
                saved = structuredClone(staged);
            }

            most_recent_save = current_save_time;

            return true;
        };

        // Lock saving, save, then release the lock
        saving = true;
        active_save = (async () => {
            // Perform the save
            let success = false;
            try {
                success = await save();
            } catch (e) {
                success = false;
            }

            // Release our save lock, allowing other processes to save
            saving = false;

            return success;
        })();

        return await active_save;
    }, SAVE_DELAY_MS);

    /**
     * Initialise the editorJS instance for the note with the initialState we
     * got passed in.
     *
     * This'll call save_note onChange
     */
    const editor_holder_id = `note_${$count++}`;
    const editor = new EditorJs({
        holder: editor_holder_id,
        placeholder: BODY_PLACEHOLDER,
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
        data: initialState.content,
        minHeight: 0
    });

    let last_updated = 'Uninitialised';
    $: {
        if (saved.update_time !== 0) {
            last_updated = new Date(saved.update_time).toLocaleString(
                undefined,
                LAST_UPDATED_FORMAT
            );
        }
    }

    /**
     * When closing we need to clean up the editorJS instance
     */
    onDestroy(() => {
        try {
            editor.destroy();
        } catch (e) {}
    });

    /**
     * When the user inputs into editor.js, save the note
     */
    onMount(() => {
        const editorContent = document.getElementById(editor_holder_id);
        if (editorContent !== null) {
            editorContent.addEventListener('input', async () => {
                save_note().catch(() => {});
            });
        }
    });
</script>

<div class="editor">
    <input
        class="heading"
        type="text"
        placeholder="Title"
        on:input={() => {
            save_note().catch(() => {});
        }}
        bind:value={staged.title}
    />
    <p class="subtext">
        Last Updated: {last_updated}
    </p>
    <div class="note" id={editor_holder_id} />
</div>

<style lang="less">
    @import '$styles/definitions.less';

    .editor {
        .heading {
            border: none;
            outline: none;
            display: block;
            font-size: 1.5em;
            font-weight: bold;
            padding: 0px;
            width: 100%;
            border-bottom: 1px solid @bg-200;
            margin: 0px;
            margin-bottom: 8px;
        }

        .subtext {
            opacity: 0.8;
            margin-bottom: 10px;
        }

        .note {
            position: relative;
            width: 100%;
            max-width: 650px; // defined by editorJS, so we'll match for neatness
            padding: 0px;
        }
    }
</style>
