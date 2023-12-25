<script lang="ts">
    import NoteBacking from '$lib/components/Note/NoteBacking.svelte';
    import NoteEditor from '$lib/components/Note/NoteEditor.svelte';
    import { Notes } from '$lib/data/NoteStore';
    import type { NoteInfo } from '$lib/data/NoteStore';
    import { onMount } from 'svelte';

    const DATE_FORMAT = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    } as Intl.DateTimeFormatOptions;

    // Loaded notes
    let diaries: NoteInfo[] = [];

    // If we've got more notes we COULD load
    let more = false;

    // Cleanup
    let loading = true;
    let diary_unsubscribers = {};

    $: todaysEntryExists = !(
        diaries.length === 0 ||
        diaries[0].created_at.toLocaleDateString() !== new Date().toLocaleDateString()
    );

    onMount(async () => {
        // Grab the top few diaries
        const notes = await Notes.get_diary_many(0, 5);
        if (notes === null) {
            alert('Failed to load notes');
            loading = false;
            return;
        }

        // Store them :)
        more = notes.more;
        diaries = notes.data
            .map((store) => Notes.toNoteInfo(store))
            .toSorted((a, b) => {
                if (a.created_at > b.created_at) {
                    return -1;
                } else if (a.created_at < b.created_at) {
                    return 1;
                }
                return 0;
            });
        loading = false;
    });
</script>

<svelte:head>
    <title>Home</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<div class="page" class:hidden={loading}>
    {#if !todaysEntryExists}
        <div class="diary-entry">
            <h2 class="diary-date">
                {new Date().toLocaleString(undefined, DATE_FORMAT)}
            </h2>
            <NoteBacking>
                <NoteEditor diary={true} />
            </NoteBacking>
        </div>
    {/if}
    {#each diaries as diary, index}
        {#if !todaysEntryExists || index !== 0}
            <p>-</p>
        {/if}
        <div class="diary-entry">
            <h2 class="diary-date">
                {diary.created_at.toLocaleString(undefined, DATE_FORMAT)}
            </h2>
            <NoteBacking>
                <NoteEditor initialState={diary} />
            </NoteBacking>
        </div>
    {/each}
</div>

<style lang="less">
    .hidden {
        display: none !important;
    }

    .page {
        display: flex;
        flex-direction: column;
        align-items: center;

        gap: 20px;
        width: 100%;
        padding-top: 40px;

        .diary-entry {
            display: flex;
            flex-direction: column;

            width: 100%;
            max-width: 650px;

            .diary-date {
                margin: 0px;
                color: var(--text);
            }
        }
    }
</style>
