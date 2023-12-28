import { writable } from "svelte/store";

const authenticated = writable(false);

export { authenticated };