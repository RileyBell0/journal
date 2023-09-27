export async function load({ cookies }) {
    const authenticated = cookies.get('session_pub') !== undefined;
    const awesome = 'awesome';
    return {
        authenticated
    };
}