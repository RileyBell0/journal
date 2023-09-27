import { redirect } from '@sveltejs/kit';

export function load({ cookies }) {
    if (!cookies.get('session')) {
        throw redirect(303, `/login`);
    }
}