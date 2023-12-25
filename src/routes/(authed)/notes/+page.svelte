<script lang="ts">
    // when deleting a note it should select the one directly above it
    import Notepad from '$lib/components/Note/NoteEditor.svelte';
    import { onDestroy, onMount } from 'svelte';
    import { Search } from 'flowbite-svelte';
    import type { Note, NoteInfo, NoteOverview } from '$lib/data/NoteStore';
    import { Notes } from '$lib/data/NoteStore';

    // Temporary icons
    // @ts-ignore
    import CirclePlusSolid from 'flowbite-svelte-icons/CirclePlusSolid.svelte';
    // @ts-ignore
    import BookmarkUnmarked from 'flowbite-svelte-icons/BookmarkOutline.svelte';
    // @ts-ignore
    import BookmarkMarked from 'flowbite-svelte-icons/BookmarkSolid.svelte';

    import { page } from '$app/stores';
    import { fade } from 'svelte/transition';
    import { get, type Unsubscriber, type Writable } from 'svelte/store';
    import { flip } from 'svelte/animate';
    import { quintOut } from 'svelte/easing';

    const DATE_FORMAT: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const NOTE_ID_QUERY_PARAM = 'id';

    // Show loading page if we're to load a page on startup
    let loading = $page.url.searchParams.get(NOTE_ID_QUERY_PARAM) !== undefined;

    // Selected note information
    let selectedNote: Writable<Note> | null = null;
    let selectedID: number =
        $page.url.searchParams.get(NOTE_ID_QUERY_PARAM) !== null
            ? Number($page.url.searchParams.get(NOTE_ID_QUERY_PARAM))
            : -1;
    let boundNote: NoteInfo;

    // Filter vars
    let search_term = '';

    // Ovetviews
    let note_overviews: { [id: number]: NoteOverview } = {};

    // The overview store unsubscribe methods for cleanup / deletion
    let overviewsOverallUnsub: Unsubscriber | null = null;
    let overviewsUnsub: { [id: number]: Unsubscriber } = {};

    let noteChange = false;
    /**
     * Selects the given note and displays it for editing
     *
     * @param note_id null to open a new note, an ID to open the note with that ID
     */
    const select_note = async (note_id: number | null) => {
        if (note_id === null) {
            // If null was received, the note to be selected is a *new* blank note
            selectedNote = null;
            selectedID = -1;
        } else {
            // Select the note with the given ID
            selectedNote = await Notes.get(note_id);
            selectedID = selectedNote === null ? -1 : get(get(selectedNote).overview).id;
        }

        noteChange = !noteChange;
    };

    /**
     * Applies the requested sort to the note overviews (for now we'll use hardcoded defaults)
     *
     * @param notes the notes we're sorting
     * @return the same notes sorted - sorted by (in order of precedence) Favourite (true first), Update time most recent first, ID (lower first)
     */
    const sort_overviews = (notes: NoteOverview[]): NoteOverview[] => {
        return notes.sort((a, b) => {
            if (a.favourite && !b.favourite) {
                return -1;
            }

            if (b.favourite && !a.favourite) {
                return 1;
            }

            if (a.update_time < b.update_time) {
                return 1;
            }

            if (a.update_time > b.update_time) {
                return -1;
            }

            if (a.id < b.id) {
                return 1;
            }

            if (a.id > b.id) {
                return -1;
            }

            return 0;
        });
    };

    /**
     * Keeps only notes with titles that contain search_term (case insensitive)
     *
     * @param overviews the note overviews we're applying our filter to
     * @param search_term the string we're searching the titles for
     */
    const filter_overviews = (overviews: NoteOverview[], search_term: string): NoteOverview[] => {
        search_term = search_term.toLocaleLowerCase();

        return overviews.filter((elem) => elem.title.toLocaleLowerCase().includes(search_term));
    };

    /**
     * Deletes the currently selected note, and opens a new note
     */
    const delete_note = async () => {
        // We can't delete unsaved notes
        if (selectedID < 0) {
            return;
        }

        // Delete the note
        if (!(await Notes.delete(selectedID))) {
            alert('Failed to delete note!');
            return;
        }

        if (note_overviews[selectedID] !== undefined) {
            let new_note_overviews: Record<number, NoteOverview> = {};
            for (let key in note_overviews) {
                new_note_overviews[key] = note_overviews[key];
            }
            note_overviews = new_note_overviews;
        }
        select_note(null);
    };

    /**
     * Store the id of the selected note in the URL
     */
    $: {
        // Keep the selectedID up to date and stored within the URL
        if (selectedID < 0) {
            $page.url.searchParams.delete(NOTE_ID_QUERY_PARAM);
        } else {
            $page.url.searchParams.set(NOTE_ID_QUERY_PARAM, selectedID.toString());
        }
        history.replaceState(history.state, '', $page.url);
    }

    /**
     * Apply the filter to our overviews
     */
    $: filtered_notes = sort_overviews(
        filter_overviews(Object.values(note_overviews), search_term)
    );

    onDestroy(() => {
        // Unsub from remaining overviews themselves
        Object.values(overviewsUnsub).forEach((unsub) => {
            unsub();
        });

        // Unsub from checking when the existence of overviews themselves change
        if (overviewsOverallUnsub !== null) {
            overviewsOverallUnsub();
        }
    });

    // Load in our initial state
    onMount(async () => {
        // Grab a bunch of notes. These'll get stored in Notes.note_overviews
        const result = await Notes.get_overview_many();
        if (result === null) {
            alert('Failed to load notes');
            return;
        }

        /**
         * Keep up to date with WHAT overviews even exist
         *
         * (run when the existence of overviews changes)
         */
        overviewsOverallUnsub = Notes.note_overviews.subscribe((new_overviews) => {
            // Figure out what's changed
            const deletedOverviewIDs = Object.keys(note_overviews)
                .map((id) => Number(id))
                .filter((id) => !new_overviews.hasOwnProperty(id));
            const newOverviewIDs = Object.keys(new_overviews)
                .map((id) => Number(id))
                .filter((id) => !note_overviews.hasOwnProperty(id));

            // unsubscribe from each of the stores of the removed notes
            for (const id of deletedOverviewIDs) {
                if (overviewsUnsub[id] !== undefined) {
                    overviewsUnsub[id]();
                    delete overviewsUnsub[id];
                }
            }

            // subscribe to each of the new stores of loaded notes
            for (const id of newOverviewIDs) {
                if (overviewsUnsub[id] !== undefined) {
                    overviewsUnsub[id]();
                    delete overviewsUnsub[id];
                }
                overviewsUnsub[id] = new_overviews[id].subscribe((data) => {
                    note_overviews = { ...note_overviews, [id]: data };
                });
            }

            // Update note_overviews
            note_overviews = Object.entries(new_overviews).reduce(
                (acc: { [id: number]: NoteOverview }, [id, overview]) => {
                    acc[Number(id)] = get(overview);
                    return acc;
                },
                {}
            );
        });

        // If we had a specific note to load on mount, load it
        const selected = $page.url.searchParams.get(NOTE_ID_QUERY_PARAM);
        if (selected !== undefined) {
            try {
                await select_note(Number(selected));
            } catch (e) {
                // If we fail to load the selected note, select nothing
                selectedID = -1;
            }
        }

        loading = false;
    });
</script>

<svelte:head>
    <title>Notes</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<div class="page">
    <!-- Notes -->
    <div class="notes" transition:fade={{ duration: 300 }} class:hidden={loading}>
        <!-- The note overview list / note selector / sidebar -->
        <div class="note-menu drop-shadow-md">
            <Search placeholder="Search" bind:value={search_term} />
            {#each filtered_notes as note (note.id)}
                <button
                    animate:flip={{ duration: 600, easing: quintOut }}
                    on:click={() => {
                        select_note(note.id);
                    }}
                    class="overview-button"
                    class:selected={selectedID === note.id}
                >
                    <!-- overview / text section -->
                    <div class="info">
                        <h3 class="title" class:title--missing={note.title.length === 0}>
                            {note.title !== '' ? note.title : 'Untitled'}
                        </h3>
                        <p class="opacity-70">
                            {new Date(note.update_time).toLocaleString(undefined, DATE_FORMAT)}
                        </p>
                    </div>

                    <!-- Favourite Button toggle -->
                    <button
                        on:click|stopPropagation={() => {
                            Notes.update(note.id, { favourite: !note.favourite });
                        }}
                        class="bookmark"
                    >
                        {#if note.favourite}
                            <BookmarkMarked />
                        {:else}
                            <BookmarkUnmarked />
                        {/if}
                    </button>
                </button>
            {/each}
            <p class="no-notes" class:hidden={filtered_notes.length > 0}>No notes found</p>
        </div>

        <!-- The note editor / viewer area -->
        <div class="editor-panel">
            <div class="note-area">
                <!-- Display the currently selected note -->
                <div class="card">
                    <button class="button-primary new-button" on:click={() => select_note(null)}>
                        <CirclePlusSolid class="plus-icon" /> New
                    </button>
                    {#key noteChange}
                        {#if selectedNote !== null}
                            <Notepad
                                bind:stagedView={boundNote}
                                initialState={Notes.toNoteInfo(selectedNote)}
                            />
                        {:else}
                            <Notepad bind:stagedView={boundNote} />
                        {/if}
                    {/key}
                </div>

                <!-- Delete the selected note -->
                <button
                    class="button-secondary button--large delete-button"
                    on:click={() => delete_note()}
                    disabled={selectedID === -1}
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
</div>

<style lang="less">
    .hidden {
        display: none !important;
    }

    // The overall page
    .page {
        @page-top-gap: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 0px 20px 80px 0px;
        background-color: var(--bg-100);

        // The entire notes section for the page
        .notes {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 20px;

            .note-menu {
                display: flex;
                flex-direction: column;
                gap: 12px;
                background-color: var(--bg);
                padding: 0px 20px;
                padding-top: @page-top-gap;
                width: 100%;
                max-width: 290px;

                // A button for a note overview that you click to select a note
                .overview-button {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;

                    border: 1px solid var(--bg-200);
                    background-color: var(--bg);

                    border-radius: 5px;
                    padding: 10px 10px 10px 20px;

                    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
                    box-sizing: border-box;

                    &.selected {
                        background-color: var(--secondary-50);
                        border: 1px solid var(--secondary);
                    }

                    &:not(.selected):hover {
                        background-color: var(--bg-50);
                        border: 1px solid var(--secondary);
                    }

                    .info {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        overflow: hidden;
                        width: 100%;

                        // The tite, with half opacity if it's not been set yet (empty)
                        .title {
                            text-align: left;
                            font-weight: normal;
                            margin: 0px;
                            width: 100%;

                            text-overflow: ellipsis;
                            white-space: nowrap;
                            overflow: hidden;
                            flex-grow: 1;

                            &.title--missing {
                                opacity: 50%;
                            }
                        }
                    }

                    .bookmark {
                        padding: 4px 2px;
                        color: var(--secondary);

                        &:hover {
                            background-color: rgba(255, 255, 255, 0.5);
                            box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
                            border-radius: 5px;
                        }
                    }
                }

                .no-notes {
                    width: 100%;
                    text-align: center;
                }
            }

            .editor-panel {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                padding-top: @page-top-gap;

                .note-area {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    width: 100%;
                    max-width: 650px;

                    .card {
                        position: relative;
                        width: 100%;
                        max-width: 650px;

                        padding: 20px;

                        background-color: white;
                        border-radius: 10px;
                        box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);

                        .new-button {
                            position: absolute;
                            top: 10px;
                            right: 10px;
                        }
                    }
                    .delete-button {
                        margin-left: auto;
                    }
                }
            }
        }
    }

    .button-primary,
    .button-secondary {
        padding: 5px 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 5px;
        color: var(--text-50);

        border: 1px solid transparent;

        &.button--large {
            padding: 10px 20px;
        }

        &:not(:disabled):hover {
            cursor: pointer;
        }

        &:disabled:hover {
            cursor: not-allowed;
        }
    }

    .button-primary {
        background-color: var(--primary);

        &:not(:disabled):hover {
            filter: brightness(90%);
        }

        &:disabled {
            background-color: var(--text-300);
        }
    }

    .button-secondary {
        background-color: var(--bg);
        border: 1px solid var(--secondary);
        color: var(--secondary);

        &:not(:disabled):hover {
            filter: brightness(95%);
        }

        &:disabled {
            color: var(--text-300);
            border: 1px solid var(--text-300);
        }
    }
</style>
