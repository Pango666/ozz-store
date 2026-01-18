// public/js/lib/auth.js
import { supabase, assertConfig } from "../supabaseClient.js";

assertConfig();

const RETURN_KEY = "techstore:return_to";

function splitFullName(fullName = "") {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first_name: "", last_name: "" };
    if (parts.length === 1) return { first_name: parts[0], last_name: "" };
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export const Auth = {
    // ✅ versión "safe" (NO revienta tu UI)
    async getSessionSafe() {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) return null;
            return data.session || null;
        } catch {
            return null;
        }
    },

    async getUser() {
        const { data, error } = await supabase.auth.getUser();
        if (error) return null;
        return data.user || null;
    },

    async signUp({ email, password, full_name = "" }) {
        email = String(email || "").trim();
        password = String(password || "");

        if (!email) throw new Error("Email requerido.");
        if (password.length < 6) throw new Error("Password mínimo 6 caracteres.");

        const nameParts = splitFullName(full_name);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: full_name || "",
                    ...nameParts,
                },
            },
        });

        if (error) throw error;
        return data;
    },

    async signIn({ email, password }) {
        email = String(email || "").trim();
        password = String(password || "");

        if (!email) throw new Error("Email requerido.");
        if (!password) throw new Error("Password requerido.");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    async signOut() {
        await supabase.auth.signOut();
    },

    /**
     * Si NO hay usuario, manda a login y vuelve al returnTo.
     * Usa location.replace para que "Back" no deje entrar al carrito.
     */
    async requireLogin(returnTo = "/") {
        const u = await this.getUser();
        if (u) return true;

        sessionStorage.setItem(RETURN_KEY, returnTo);

        const next = encodeURIComponent(returnTo);
        window.location.replace(`/auth/login.html?next=${next}`);
        return false;
    },

    consumeReturnTo() {
        const url = new URL(window.location.href);
        const q = url.searchParams.get("next");
        const saved = sessionStorage.getItem(RETURN_KEY);

        if (q) return q;
        if (saved) {
            sessionStorage.removeItem(RETURN_KEY);
            return saved;
        }
        return "/";
    },
};
