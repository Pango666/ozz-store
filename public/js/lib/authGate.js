// public/js/lib/authGate.js
// Auth Gate: Require login for protected actions like cart
import { supabase } from '../supabaseClient.js';

const LOGIN_URL = '/auth/login.html';

/**
 * Check if user is logged in
 * @returns {Promise<{user: object}|null>}
 */
export async function getUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

/**
 * Redirect to login if not authenticated
 * Saves current URL as return_to parameter
 * @param {string} customMessage - Optional message to show on login page
 * @returns {Promise<object|null>} - User if logged in, null if redirected
 */
export async function requireAuth(customMessage = null) {
    const user = await getUser();

    if (!user) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        let loginUrl = `${LOGIN_URL}?return_to=${returnTo}`;
        if (customMessage) {
            loginUrl += `&message=${encodeURIComponent(customMessage)}`;
        }
        window.location.href = loginUrl;
        return null;
    }

    return user;
}

/**
 * Check auth before action (for buttons/links)
 * Returns false if not logged in (and redirects)
 * @param {string} actionMessage - Message for login page
 * @returns {Promise<boolean>}
 */
export async function checkAuthForAction(actionMessage = 'Inicia sesión para continuar') {
    const user = await getUser();

    if (!user) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `${LOGIN_URL}?return_to=${returnTo}&message=${encodeURIComponent(actionMessage)}`;
        return false;
    }

    return true;
}

/**
 * Handle return_to after login
 * Call this on login success
 */
export function handleLoginRedirect() {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('return_to');

    if (returnTo) {
        window.location.href = decodeURIComponent(returnTo);
    } else {
        window.location.href = '/index.html';
    }
}
