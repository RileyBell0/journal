export async function load({ cookies }) {
    // A current session coolie means we're authenticated (private cookie - contains our session key)
    return {
        authenticated: cookies.get('session') !== undefined
    };
}