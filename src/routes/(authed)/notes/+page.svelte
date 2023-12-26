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
    import NoteBacking from '$lib/components/Note/NoteBacking.svelte';

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
    const initialLoadID = $page.url.searchParams.get(NOTE_ID_QUERY_PARAM);
    let loading = true;

    // Selected note information
    let selectedNote: Writable<Note> | null = null;
    let selectedID: number = initialLoadID !== null ? Number(initialLoadID) : -1;
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
        if (selectedID === null) {
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

        // Create ourselves a view on what our displayed notes should look like
        const overviews = sort_overviews(
            filter_overviews(
                Object.values(get(Notes.note_overviews)).map((elem) => get(elem)),
                search_term
            )
        );

        // If we had a specific note to load on mount, load it, or just show the first note
        let selected: number | null = null;
        if (initialLoadID !== null) {
            selected = Number(initialLoadID).valueOf();
        } else if (overviews.length !== 0) {
            selected = overviews[0].id;
        }

        if (selected !== null) {
            try {
                await select_note(selected);
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

<div class="page" in:fade={{ duration: 300 }}>
    <!-- The note overview list / note selector / sidebar -->
    <div class="note-sidebar drop-shadow-md">
        <Search placeholder="Search" bind:value={search_term} />
        <div class="note-list">
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
        </div>
        <p class="no-notes" class:hidden={filtered_notes.length > 0}>No notes found</p>
    </div>

    <!-- The note editor / viewer area -->
    <div class:hidden={loading} class="editor-panel">
        <div class="note-area">
            <!-- Display the currently selected note -->
            <NoteBacking>
                <!-- The note itself -->
                {#key noteChange}
                    <div in:fade={{ duration: 300 }}>
                        {#if selectedNote !== null}
                            <Notepad
                                bind:stagedView={boundNote}
                                initialState={Notes.toNoteInfo(selectedNote)}
                            />
                        {:else}
                            <Notepad bind:stagedView={boundNote} />
                        {/if}
                    </div>
                {/key}
            </NoteBacking>

            <!-- The delete button, just below the note -->
            <button
                class="button-secondary delete-button"
                on:click={() => delete_note()}
                disabled={selectedID === -1}
            >
                Delete
            </button>
            <button class="button-primary new-button" on:click={() => select_note(null)}>
                <CirclePlusSolid class="plus-icon" /> New
            </button>
        </div>
    </div>
</div>

<style lang="less">
    @sidebar-width: 290px;

    .hidden {
        display: none !important;
    }

    // The overall page
    .page {
        @page-top-gap: 20px;
        display: flex;
        flex-direction: column;
        padding-bottom: 80px;

        .note-sidebar {
            position: absolute;
            left: 0;
            bottom: 0;

            display: flex;
            flex-direction: column;
            gap: 12px;

            height: calc(100vh - var(--header-height));
            width: 100%;
            max-width: @sidebar-width;
            padding: 0px 20px;
            padding-top: @page-top-gap;

            background-color: var(--bg);

            .note-list {
                display: flex;
                flex-direction: column;
                gap: 12px;

                width: 100%;
                overflow-y: scroll;
                padding-bottom: 20px;

                // A button for a note overview that you click to select a note
                .overview-button {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;

                    border: 1px solid var(--bg-200);
                    background-color: var(--bg);

                    border-radius: 7px;
                    padding: 10px 10px 10px 20px;

                    box-shadow: var(--shadow);
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
                            box-shadow: var(--shadow);
                            border-radius: 5px;
                        }
                    }
                }
            }

            .no-notes {
                width: 100%;
                text-align: center;
            }
        }

        // The entire notes section for the page
        .editor-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            padding: 0px 20px;

            margin-left: @sidebar-width;

            width: 100% - @sidebar-width;
            padding-top: @page-top-gap;

            .note-area {
                position: relative;

                display: flex;
                flex-direction: column;
                gap: 1rem;
                width: 100%;
                max-width: 650px;

                .delete-button {
                    margin-left: auto;

                    max-width: max-content;
                }

                .new-button {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                }
            }
        }
    }
</style>
