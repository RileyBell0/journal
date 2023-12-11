import { get, writable, type Writable } from 'svelte/store';

// getting/setting (database)
import { backend } from '../net/backend';
import { RequestHandler } from '../net/RequestHandler';

// Note info
import type { OutputData } from '@editorjs/editorjs';
import type { PagedResult } from '$lib/net/Paging';

// The overall information of a note. Everything is accessible from here
type Note = {
    overview: Writable<NoteOverview>;
    content: OutputData;
};

// The overview information of a note - the kind of stuff you'd see in a thumbnail
type NoteOverview = {
    id: number;
    title: string;
    update_time: number;
    favourite: boolean;
};

// Fields you can pass in for updating a note
type NoteUpdatePackage = {
    title?: string,
    favourite?: boolean,
    content?: string,
}

// The overall info of a note - not related to stores, just the data
type NoteInfo = {
    id: number;
    title: string;
    update_time: number;
    favourite: boolean;
    content: OutputData;
};

/**
 * Mitigates access to all note data between the front and backend. Provides
 * stores for note data - you should subscribe to these when displaying notes,
 * or publish to these when editing notes.
 */
class Notes {
    private static readonly requests = new RequestHandler<any>();
    private static readonly notes: Writable<{ [key: number]: Writable<Note> }> = writable({});
    private static readonly note_overviews: Writable<{ [key: number]: Writable<NoteOverview> }> = writable({});

    /**
     * Creates a new note in the backend with the given content and returns the
     * store containing the note in the frontend
     *
     * @param title The title of hte note
     * @param content The content of the note
     * @returns on success - a reference to the writable store of the note, otherwise null
     */
    public static async create(
        title: string,
        content: OutputData
    ): Promise<Writable<Note> | null> {
        try {
            // Store in the backend
            const res = await backend.post('/notes', {
                content: JSON.stringify(content),
                title: title,
                favourite: false
            });
            if (res.status !== 201) {
                return null;
            }

            // construct a new store for the note
            return this.store(res.data as NoteInfo);
        } catch (e) {
            return null;
        }
    }

    /**
     * Retrives a writable store of the requested note
     * 
     * @param id The ID of the note
     */
    public static async get(id: number): Promise<Writable<Note> | null> {
        const notes = get(this.notes);

        // Check if there's a cached value we can return
        if (notes[id] !== undefined) {
            return notes[id];
        }

        return await this.requests.make(`get_${id}`, () => {
            return this.fetch(id)
        });
    }

    /**
     * Gets a batched list of notes - always hot, and fresh off the frier
     * 
     * @param page the page of notes you're wanting [0,_)
     * @param limit the number of notes per page [1,100]
     * @returns The stores for the fetched notes AND if there's more after this, or null on failure
     */
    public static async get_many(page: number = 0, limit: number = 20): Promise<null | PagedResult<Writable<Note>[]>> {
        return await this.requests.make(`get_many_${page}_${limit}`, () => {
            return this.fetch_many(page, limit);
        });
    }

    /**
     * Attempts to fetch (and load) the given note overview into the store
     * 
     * @param id the ID of the note overview being fetched
     * @returns The store to the fetched note on success, or null on failure
     */
    public static async get_overview(id: number): Promise<Writable<NoteOverview> | null> {
        const overviews = get(this.note_overviews);

        // Check if we've got a cached value we can return
        if (overviews[id] !== undefined) {
            return overviews[id];
        }

        return await this.requests.make(`get_overview_${id}`, () => {
            return this.fetch_overview(id)
        });
    }

    /**
     * Gets a batched list of notes - always hot, and fresh off the frier
     * 
     * @param page the page of notes you're wanting [0,_)
     * @param limit the number of notes per page [1,100]
     * @returns The stores for the fetched notes AND if there's more after this, or null on failure
     */
    public static async get_overview_many(page: number = 0, limit: number = 20): Promise<null | PagedResult<Writable<NoteOverview>[]>> {
        return await this.requests.make(`get_many_${page}_${limit}`, () => {
            return this.fetch_overview_many(page, limit);
        });
    }

    /**
     * Updates the given note in the backend (and locally if it's loaded)
     *
     * @param id The ID of the note
     * @param update The update you're wanting to apply to the note
     * @returns true if the note was updated successfully, false otherwise
     */
    public static async update(
        id: number,
        update: NoteUpdatePackage
    ): Promise<boolean> {
        if (update.title === undefined && update.content === undefined && update.favourite === undefined) {
            return true;
        }

        // Apply the update
        try {
            const res = await backend.patch(`/notes/${id}`, update);
            if (res.status !== 200) {
                return false;
            }
        } catch (e) {
            return false;
        }

        // Also apply the update locally
        const note_store = get(this.notes)[id];
        if (note_store !== undefined) {
            // Update the note
            if (update.content !== undefined) {
                note_store.set({ ...get(note_store), content: JSON.parse(update.content) });
            }

            // Then update its overview
            if (update.favourite !== undefined || update.title !== undefined) {
                const overview_store = get(note_store).overview;
                const overview = get(overview_store);
                overview_store.set({
                    ...get(overview_store),
                    favourite: overview.favourite ?? update.favourite,
                    title: overview.title ?? update.title
                })
            }

            this.notes.set(get(this.notes));
        }

        return true;
    }

    /**
     * Attempts to delete the note with the given ID
     * 
     * @param id The ID of the note
     * @returns
     */
    public static async delete(id: number): Promise<boolean> {
        // Try and delete the note
        // TODO try deleting a note that doesnt exist and see what axios does. 
        // If we tried deleting it and it doesn't exist in the backend,
        // we should still just remove it from our store
        try {
            let res = await backend.delete(`/notes/${id}`);
            if (res.status !== 200) {
                return false;
            }
        } catch (e) {
            return false;
        }

        // Remove the note from the store(s)
        const overviews = get(this.note_overviews);
        const notes = get(this.notes);
        if (overviews[id] !== undefined) {
            delete overviews[id];
            this.note_overviews.set(overviews);
        }
        if (notes[id] !== undefined) {
            delete notes[id];
            this.notes.set(notes);
        }

        return true;
    }

    /**
     * Attempts to fetch (and load) the given note into the store
     * 
     * @param id the ID of the note being fetched
     * @returns The store to the fetched note on success, or null on failure
     */
    private static async fetch(id: number): Promise<null | Writable<Note>> {
        try {
            // Fetch the note
            const res = await backend.get(`/notes/${id}`);
            if (res.status !== 200) {
                return null;
            }

            // Parse the returned note.content
            const note = res.data;
            note.content = JSON.parse(note.content) as OutputData;

            return this.store(note as NoteInfo);
        }
        catch (e) {
            return null;
        }
    }

    /**
     * Get a page of notes
     * 
     * @param page the page you want to fetch [0,_)
     * @param limit the number of notes you want to fetch. [1,100]
     * 
     * @returns the stores for the received notes on success, or null on failure
     */
    private static async fetch_many(page: number = 0, limit: number = 20): Promise<null | PagedResult<Writable<Note>[]>> {
        try {
            // Fetch a page of notes
            let res = await backend.get(`/notes?page=${page}&page_size=${limit}`);
            if (res.status !== 200) {
                return null;
            }

            // Store all received notes
            const notes: Writable<Note>[] = res.data.data.map((note: NoteInfo) => {
                return this.store(note);
            });

            return { data: notes, more: res.data.more };
        } catch (e) {
            return null;
        }
    }

    /**
     * Attempts to fetch (and load) the given note into the store
     * 
     * @param id the ID of the note being fetched
     * @returns The store to the fetched note on success, or null on failure
     */
    private static async fetch_overview(id: number): Promise<null | Writable<NoteOverview>> {
        try {
            const res = await backend.get(`/notes/${id}/overview`);
            if (res.status !== 200) {
                return null;
            }

            return this.store_overview(res.data)
        }
        catch (e) {
            return null;
        }
    }

    /**
     * Fetch a page of overviews
     * 
     * @param page The page number you want [0,_)
     * @param limit the number of notes you want to fetch. [1,100]
     * @returns the stores for the received overviews on success, or null on failure
     */
    private static async fetch_overview_many(page: number = 0, limit: number = 20): Promise<null | PagedResult<Writable<NoteOverview>[]>> {
        try {
            // Fetch a page of notes
            let res = await backend.get(`/notes?overview=true&page=${page}&page_size=${limit}`);
            if (res.status !== 200) {
                return null;
            }

            // Store all received notes
            const overviews: Writable<NoteOverview>[] = res.data.data.map((overview: NoteOverview) => {
                return this.store_overview(overview);
            });

            return { data: overviews, more: res.data.more };
        } catch (e) {
            return null;
        }
    }

    /**
     * Adds a new note to the store, and returns the reference to said note in the store
     *
     * @param id The id of the note
     * @param content The editorjs content of the note
     * @param title The string title of the note
     * @param favourite Whether or not the note is favourited
     *
     * @returns the writable store of the note that's been added
     */
    private static store(
        note: NoteInfo
    ): Writable<Note> {
        // Store the overview
        const overview = this.store_overview({
            id: note.id,
            update_time: note.update_time,
            title: note.title,
            favourite: note.favourite
        });

        // Store the note if it doesn't exist yet
        let current_note = get(this.notes)[note.id];
        if (current_note === undefined) {
            current_note = writable({ overview, content: note.content } as Note);
            this.notes.set({ ...get(this.notes), [note.id]: current_note });
            return current_note;
        }

        // If the note already existed, update it
        if (note.update_time > get(get(current_note).overview).update_time) {
            current_note.set({ overview, content: note.content } as Note);
        }

        return current_note;
    }

    /**
     * Stores the given note overview. Mostly this would be used when loading
     * in notes, especially if we're just wanting to load their overviews for
     * displaying a whole bunch of them, rather than loading the entire note.
     *
     * @param id The ID of the note
     * @param update_time When the note was last updated
     * @param title The title of the note
     * @param favourite If the note is favourited
     * @returns the writable store of the note overview that we've stored/updated
     */
    private static store_overview(
        overview: NoteOverview
    ): Writable<NoteOverview> {
        // Store and return the overview if it doesn't exist
        let current_overview = get(this.note_overviews)[overview.id];
        if (current_overview === undefined) {
            current_overview = writable(overview);
            this.note_overviews.set({ ...get(this.note_overviews), [overview.id]: current_overview });
            return current_overview;
        }

        // Update the stored overview with the more recent data
        if (overview.update_time > get(current_overview).update_time) {
            current_overview.set(overview);
        }

        return current_overview;
    }
}

export { Notes, type Note, type NoteOverview };
