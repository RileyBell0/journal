import type { OutputData } from "@editorjs/editorjs";
import backend from "./net/backend";

type NoteOverview = {
    id: number;
    title: string;
    update_time: number
    favourite: boolean;
};

type Note = {
    id: number;
    content: OutputData;
    time: number;
    title: string;
    favourite: boolean;
};

async function create(title: string, content: OutputData): Promise<number | null> {
    const contents = JSON.stringify(content);

    // Create the note
    let res = await backend.post('/notes', {
        content: contents,
        time: content.time ?? 0,
        title: title,
        favourite: false
    });

    if (res.status === 201) {
        return res.data
    }

    return null;
}

async function set_favourite(id: number, favourite: boolean) {
    return await backend.post(`/notes/${id}/favourite`, {
        favourite: favourite
    });
}

async function update(id: number, title: string, content: OutputData, favourite: boolean) {
    const contents = JSON.stringify(content);

    await backend.post(`/notes/${id}`, {
        content: contents,
        time: content.time ?? 0,
        title: title,
        favourite: favourite
    });
}

async function fetch_all(): Promise<NoteOverview[]> {
    // Fetch the list of notes we've got
    let res = await backend.get('/notes');
    if (res.status !== 200) {
        throw new Error();
    }

    return res.data;
}

async function fetch_one(id: number): Promise<Note> {
    let res = await backend.get(`/notes/${id}`);
    if (res.status !== 200) {
        throw new Error();
    }

    let note = res.data;
    note.content = JSON.parse(note.content) as OutputData;
    return note as Note;
}

async function delete_one(id: number): Promise<boolean> {
    let res = await backend.delete(`/notes/${id}`);
    if (res.status !== 200) {
        return false;
    }

    return true;
}

export default { create, update, fetch_all, fetch_one, delete_one, set_favourite }