<script lang="ts">
    // when deleting a note it should select the one directly above it
    import Note from '$lib/Note.svelte';
    import { onDestroy, onMount } from 'svelte';
    import { Button, Search } from 'flowbite-svelte';
    import {
        delete_one,
        fetch_all,
        fetch_one,
        overview,
        type Note,
        type NoteOverview,
        set_favourite
    } from '$lib/NoteStore';
    // @ts-ignore
    import CirclePlusSolid from 'flowbite-svelte-icons/CirclePlusSolid.svelte';
    // @ts-ignore
    import BookmarkUnmarked from 'flowbite-svelte-icons/BookmarkOutline.svelte';
    // @ts-ignore
    import BookmarkMarked from 'flowbite-svelte-icons/BookmarkSolid.svelte';
    import { page } from '$app/stores';
    import { fade, fly } from 'svelte/transition';
    import { get, type Unsubscriber, type Writable } from 'svelte/store';
    import { flip } from 'svelte/animate';
    import { quintOut } from 'svelte/easing';

    const date_format: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const NOTE_ID_QUERY_PARAM = 'id';

    let loading = $page.url.searchParams.get(NOTE_ID_QUERY_PARAM) !== undefined;
    let search_term = '';
    let can_delete = false;
    let selected_note: Writable<Note> | null = null;
    let selected_note_id: number =
        $page.url.searchParams.get(NOTE_ID_QUERY_PARAM) !== null
            ? Number($page.url.searchParams.get(NOTE_ID_QUERY_PARAM))
            : -1;
    let new_note_reset = 0; // changing this value refreshes the new note
    let note_overviews: Record<number, NoteOverview> = {};
    let note_overviews_unsub: Record<number, Unsubscriber> = {};
    let overview_unsub = () => {};

    // Note list
    $: filtered_notes = filter(note_overviews, search_term);
    $: {
        // Keep the selected_note_id up to date and stored within the URL
        if (selected_note_id < 0) {
            $page.url.searchParams.delete(NOTE_ID_QUERY_PARAM);
        } else {
            $page.url.searchParams.set(NOTE_ID_QUERY_PARAM, selected_note_id.toString());
        }
        history.replaceState(history.state, '', $page.url);
    }

    // Load in initial data
    onMount(async () => {
        await fetch_all();

        // for all loaded notes
        overview_unsub = overview.subscribe((event) => {
            const current_ids = new Set(Object.keys(note_overviews));
            const new_ids = new Set(Object.keys(event));

            const deleted_keys = [...current_ids].filter((key) => !new_ids.has(key));
            const added_keys = [...new_ids].filter((key) => !current_ids.has(key));

            // unsubscribe from each of the stores of the removed notes
            deleted_keys.forEach((elem) => {
                const id = Number(elem);
                const unsub = note_overviews_unsub[id];
                if (unsub !== undefined) {
                    unsub();
                    delete note_overviews_unsub[id];
                    if (note_overviews[id] !== undefined) {
                        delete note_overviews[id];
                        note_overviews = note_overviews;
                    }
                }
            });

            // subscrive to each of the new stores of loaded notes
            added_keys.forEach((elem) => {
                const id = Number(elem);
                note_overviews_unsub[id] = event[id].subscribe((data) => {
                    note_overviews[id] = data;
                });
            });
        });

        // Try and select the note specifided in the URL
        const selected = $page.url.searchParams.get(NOTE_ID_QUERY_PARAM);
        if (selected !== undefined) {
            await select_note(Number(selected));
        }

        loading = false;
    });
    onDestroy(() => {
        overview_unsub();
        Object.values(note_overviews_unsub).forEach((unsub) => {
            unsub();
        });
    });

    /**
     * Keeps only notes with titles that contain search_term (case insensitive)
     */
    function filter(notes: Record<number, NoteOverview>, search_term: string): NoteOverview[] {
        let term = search_term.toLocaleLowerCase();

        let overviews: NoteOverview[] = [];
        Object.values(notes).forEach((entry) => {
            overviews.push(entry);
        });
        let filtered = overviews.filter((elem) => elem.title.toLocaleLowerCase().includes(term));
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
     * Deletes the currently selected note
     */
    async function delete_note() {
        if (selected_note_id < 0) {
            return;
        }

        if (!(await delete_one(selected_note_id))) {
            alert('Failed to delete note!');
            return;
        }

        if (note_overviews[selected_note_id] !== undefined) {
            let new_note_overviews: Record<number, NoteOverview> = {};
            for (let key in note_overviews) {
                new_note_overviews[key] = note_overviews[key];
            }
            note_overviews = new_note_overviews;
        }
        select_note(null);
    }

    /**
     * Selects the given note and displays it for editing
     */
    async function select_note(note_id: number | null) {
        if (note_id === null) {
            can_delete = false;
            selected_note = null;
            selected_note_id = -1;
            new_note_reset++;
        } else {
            try {
                selected_note = await fetch_one(note_id);
                selected_note_id = get(get(selected_note).overview).id;
            } catch (e) {
                selected_note_id = -1;
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
                    {#each filtered_notes as curr_note (curr_note.id)}
                        <div class="buttoncont" animate:flip={{ duration: 600, easing: quintOut }}>
                            <Button
                                on:click={() => {
                                    select_note(curr_note.id);
                                }}
                                class="note-overview bg-stone-200 text-stone-900 w-full"
                            >
                                <div
                                    class="note-overview-container"
                                    class:selected={selected_note_id === curr_note.id}
                                >
                                    <div class="note-overview">
                                        {#if curr_note.title.length > 0}
                                            <h3 class="note-overview-title">
                                                {curr_note.title}
                                            </h3>
                                        {:else}
                                            <h3
                                                class="note-overview-title note-overview-title-missing"
                                            >
                                                Untitled
                                            </h3>
                                        {/if}
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
                                                    set_favourite(curr_note.id, false);
                                                }}
                                                class="bookmark"
                                            >
                                                <BookmarkMarked />
                                            </button>
                                        {:else}
                                            <button
                                                on:click|stopPropagation={() => {
                                                    set_favourite(curr_note.id, true);
                                                }}
                                                class="bookmark"
                                            >
                                                <BookmarkUnmarked />
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            </Button>
                        </div>
                    {/each}
                {:else}
                    <p>No notes found</p>
                {/if}
            </div>
            <div class="editor-panel">
                <div class="card">
                    {#if selected_note !== null}
                        {#key get(get(selected_note).overview).id}
                            <Note
                                state={selected_note}
                                bind:can_delete
                                bind:id={selected_note_id}
                            />
                        {/key}
                    {:else}
                        {#key new_note_reset}
                            <Note bind:can_delete bind:id={selected_note_id} />
                        {/key}
                    {/if}
                </div>
                <div class="note-delete-section">
                    <Button
                        class="drop-shadow-md"
                        disabled={!can_delete}
                        on:click={() => delete_note()}>Delete</Button
                    >
                </div>
            </div>
        </div>
    {/if}
</div>

{#if !loading}
    <div transition:fade={{ duration: 300 }}>
        <p class="w-full text-center">Get images working in the backend for this</p>
    </div>
{/if}

<style>
    .selected {
        font-weight: bold;
        color: var(--color-theme-1);
    }
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
    .note-overview-title-missing {
        opacity: 50%;
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
        align-items: flex-start;
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
