<script lang="ts">
    import Note from '$lib/Note.svelte';
    import type { OutputData } from '@editorjs/editorjs';
    import { onMount } from 'svelte';
    import note from '$lib/note';
    import { Button, Dropdown, DropdownItem, Search } from 'flowbite-svelte';

    // @ts-ignore
    import CirclePlusSolid from 'flowbite-svelte-icons/CirclePlusSolid.svelte';
    // @ts-ignore
    import BookmarkUnmarked from 'flowbite-svelte-icons/BookmarkOutline.svelte';
    // @ts-ignore
    import BookmarkMarked from 'flowbite-svelte-icons/BookmarkSolid.svelte';

    import { page } from '$app/stores';
    import { fade } from 'svelte/transition';
    const date_format: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };

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
        favourite: boolean;
    };

    type NoteOverview = {
        id: number;
        title: string;
        update_time: number;
        favourite: boolean;
    };

    let loading = $page.url.searchParams.get('selected') !== undefined;

    onMount(async () => {
        // TODO store notes in a store or something, that way each note is responsible for updating its own state, other places just read that (other places such as here)
        notes = (await note.fetch_all()) ?? [];
        let selected = $page.url.searchParams.get('selected');
        if (selected !== null) {
            await select_note(Number(selected));
        }
        loading = false;
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
        let filtered = notes.filter((elem) => elem.title.toLocaleLowerCase().includes(term));
        return sort(filtered);
    }

    /**
     * Applies the requested sort to the note overviews (for now we'll use hardcoded defaults)
     */
    function sort(notes: NoteOverview[]): NoteOverview[] {
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
    }

    /**
     * Callback for onSave for notes. When they get updated we'll update our state
     * here accordingly - getting new notes included in the list of notes, and
     * updating the titles of existing notes
     */
    function updateNoteOverview(
        id: number,
        title: string,
        update_time: number,
        favourite: boolean
    ): void {
        let index = notes.findIndex((note) => note.id === id);
        let new_note = { id, title, update_time, favourite };
        if (index === -1) {
            notes = [...notes, new_note];
        } else {
            notes[index] = new_note;
        }
    }

    function setFavourite(id: number, favourite: boolean) {
        note.set_favourite(id, favourite);

        let index = notes.findIndex((note) => note.id === id);
        if (index === -1) {
            return;
        }

        let new_note = notes[index];
        new_note.favourite = favourite;
        notes[index] = new_note;
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
            $page.url.searchParams.delete('selected');
            history.replaceState(history.state, '', $page.url);
        } else {
            $page.url.searchParams.set('selected', note_id.toString());
            history.replaceState(history.state, '', $page.url);
            try {
                selected_note = await note.fetch_one(note_id);
            } catch (e) {
                selected_note = null;
            }
        }
    }
</script>

<svelte:head>
    <title>Notes</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<div class="page">
    <section class="section-header">
        <Search placeholder="Search" bind:value={search_term} />
        <Button on:click={() => select_note(null)}
            ><CirclePlusSolid class="w-3 h-3 mr-2 text-white dark:text-white" />New</Button
        >
    </section>
    {#if !loading}
        <div class="holder" transition:fade={{ duration: 300 }}>
            <div class="note-menu drop-shadow-md">
                {#if filtered_notes.length > 0}
                    {#each filtered_notes as curr_note}
                        <Button
                            on:click={() => {
                                select_note(curr_note.id);
                            }}
                            class="note-overview bg-stone-200 text-stone-900"
                        >
                            <div class="note-overview-container">
                                <div class="note-overview">
                                    <h3 class="note-overview-title">{curr_note.title}</h3>
                                    <p class="opacity-70">
                                        {new Date(curr_note.update_time).toLocaleString(
                                            undefined,
                                            date_format
                                        )}
                                    </p>
                                </div>
                                <div class="note-overview-bookmark">
                                    {#if curr_note.favourite}
                                        <button
                                            on:click|stopPropagation={() => {
                                                setFavourite(curr_note.id, false);
                                            }}
                                            class="bookmark"
                                        >
                                            <BookmarkMarked />
                                        </button>
                                    {:else}
                                        <button
                                            on:click|stopPropagation={() => {
                                                setFavourite(curr_note.id, true);
                                            }}
                                            class="bookmark"
                                        >
                                            <BookmarkUnmarked />
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </Button>
                    {/each}
                {:else}
                    <p>No notes found</p>
                {/if}
            </div>
            <div class="editor-panel">
                <div class="card">
                    {#if selected_note !== null}
                        {#key selected_note.id}
                            <Note
                                state={selected_note}
                                onSave={updateNoteOverview}
                                bind:can_delete
                                bind:id={selected_note_id}
                            />
                        {/key}
                    {:else}
                        {#key new_note_reset}
                            <Note
                                onSave={updateNoteOverview}
                                bind:can_delete
                                bind:id={selected_note_id}
                            />
                        {/key}
                    {/if}
                </div>
                <div class="note-delete-section">
                    <Button
                        class="drop-shadow-md"
                        disabled={!can_delete}
                        on:click={() => delete_note()}>Delete</Button
                    >
                    <Dropdown>
                        <DropdownItem>Dashboard</DropdownItem>
                        <DropdownItem>Settings</DropdownItem>
                        <DropdownItem>Earnings</DropdownItem>
                        <DropdownItem>Sign out</DropdownItem>
                    </Dropdown>
                </div>
            </div>
        </div>
    {/if}
</div>

{#if !loading}
    <div transition:fade={{ duration: 300 }}>
        <br />
        <p>TODO</p>
        <ul>
            <li>Get images working in the backend for this</li>
            <li>
                Need a view section - should deafult to the most recent note - BUT - we should be
                able to have multiple
            </li>
            <li>View: Doomscroll, Sidebar</li>
            <li>
                Make a new page for doomscroll? DOOMSCROLL - all notes, sorted by recency, pinned
                notes at the top (like apple notes basically)
            </li>
            <li />
            <li>Add hamburger menu for deletion to the side of note overviews</li>
        </ul>
    </div>
{/if}

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
    .note-overview {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        overflow: hidden;
        width: 100%;
    }
    .note-overview-container {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        flex-wrap: nowrap;
        width: 100%;
    }
    .note-overview-title {
        text-align: left;
        font-weight: normal;
        margin: 0px;
        width: 100%;

        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        flex-grow: 1;
    }
    .note-overview-bookmark {
        width: 20px;
        margin: auto;
        margin-left: 10px;
    }
    .bookmark {
        padding: 4px 2px;
    }
    .bookmark:hover {
        background-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
        border-radius: 5px;
    }
    .section-header {
        display: flex;
        gap: 20px;
        justify-content: space-between;
    }
    .holder {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 20px;
    }
    .page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-top: 30px;
    }
    .note-menu {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        background-color: white;
        border-radius: 10px;
        max-width: 250px;
        width: 100%;
    }
    .card {
        width: 100%;
        background-color: white;
        border-radius: 10px;
        width: 100%;
        padding: 20px 30px;
        box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
    }
</style>
