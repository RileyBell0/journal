export async function load({ cookies }) {
    // Keep session_pub's state linked to the existence of 'session'
    const authenticated = cookies.get('session') !== undefined;
    const js_session_exists = cookies.get('session_pub') !== undefined;
    if (authenticated && !js_session_exists) {
        cookies.set('session_pub', 'true');
    }
    else if (!authenticated && js_session_exists) {
        cookies.delete('session_pub');
    }

    return {
        authenticated
    };
}