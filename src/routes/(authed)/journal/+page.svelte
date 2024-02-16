<script lang="ts">
    import Card from '$lib/components/Card.svelte';
    import NoteEditor from '$lib/components/Note/NoteEditor.svelte';
    import { Notes } from '$lib/data/NoteStore';
    import type { NoteInfo } from '$lib/data/NoteStore';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    // @ts-ignore
    import CirclePlusSolid from 'flowbite-svelte-icons/CirclePlusSolid.svelte';
    import NewJournal from '$lib/components/Note/NewJournal.svelte';

    const DATE_FORMAT = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    } as Intl.DateTimeFormatOptions;
    const PAGE_SIZE = 2;

    // Loaded notes
    let diaries: NoteInfo[] = [];

    // Note creation modal
    function showJournalPopup() {
        popupVisible = true;
    }
    let popupVisible = false;

    // If an entry for today's note exists
    $: todaysEntryExists = !(
        diaries.length === 0 ||
        diaries[0].created_at.toLocaleDateString() !== new Date().toLocaleDateString()
    );

    /**
     * Loads the next page of unloaded notes into the page
     *
     * TODO what if we get a note ID that already exists when doing an update??
     * - the current system does nothing with the IDs of the notes that are here does it?
     */
    const loadMoreNotes = async () => {
        loadingMore = true;

        // Grab the next page of notes
        const notes = await Notes.get_diary_many(pagesLoaded, PAGE_SIZE);
        if (notes === null) {
            loadingMore = false;
            alert('Failed to load notes');
            return;
        }
        pagesLoaded++;

        const sortedNotes = notes.data
            .map((store) => Notes.toNoteInfo(store))
            .toSorted((a, b) => {
                if (a.created_at > b.created_at) {
                    return -1;
                } else if (a.created_at < b.created_at) {
                    return 1;
                }
                return 0;
            });

        // Add the received notes to the diaries list
        more = notes.more;
        diaries = [...diaries, ...sortedNotes];
        loadingMore = false;
    };
    let pagesLoaded = 0;
    let more = false; // if there's more notes we COULD load
    let loadingMore = false;

    /**
     * Load the initial page of notes on page load
     */
    onMount(async () => {
        await loadMoreNotes();
        loading = false;
    });
    let loading = true;
</script>

<svelte:head>
    <title>Journal</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<NewJournal bind:showPopup={popupVisible} selectedDate={todaysEntryExists ? null : new Date()} />
<div class="page" class:hidden={loading} in:fade={{ duration: 300 }}>
    <div class="new-journal">
        <button class="button-primary new-button" on:click={showJournalPopup}>
            <CirclePlusSolid class="plus-icon" /> New
        </button>
    </div>
    {#if !todaysEntryExists}
        <div class="diary-entry">
            <h2 class="diary-date">
                {new Date().toLocaleString(undefined, DATE_FORMAT)}
            </h2>
            <Card>
                <NoteEditor diary={true} />
            </Card>
        </div>
    {/if}
    {#each diaries as diary (diary.id)}
        <div class="diary-entry">
            <h2 class="diary-date">
                {diary.created_at.toLocaleString(undefined, DATE_FORMAT)}
            </h2>
            <Card>
                <NoteEditor initialState={diary} />
            </Card>
        </div>
    {/each}
    <button class:hidden={!more || loadingMore} on:click={loadMoreNotes}>Show more</button>
</div>

<style lang="less">
    @import '$styles/styles.less';
    @import '$styles/buttons.less';

    .hidden {
        display: none !important;
    }

    .page {
        display: flex;
        flex-direction: column;
        align-items: center;

        gap: 20px;
        width: 100%;
        padding: 20px 20px 140px 20px;

        .new-journal {
            width: 100%;

            .new-button {
                margin-left: auto;
            }
        }

        .diary-entry {
            display: flex;
            flex-direction: column;

            width: 100%;
            max-width: 650px;

            .diary-date {
                margin: 0px;
                color: @text;
            }
        }
    }
</style>
