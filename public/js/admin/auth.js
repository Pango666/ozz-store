// public/js/admin/auth.js
// Verificación de sesión y permisos para admin
import { supabase } from "../supabaseClient.js";

let currentStore = null;
let currentRole = null;

/**
 * Verificar si el usuario está autenticado y tiene acceso a alguna tienda
 * @returns {Promise<{user, store, role} | null>}
 */
export async function checkAdminAccess() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log("[Admin Auth] Session check:", { session: !!session, error: sessionError });

        if (sessionError || !session?.user) {
            console.log("[Admin Auth] No session found");
            return null;
        }

        console.log("[Admin Auth] User ID:", session.user.id);

        // Obtener membresías del usuario
        const { data: memberships, error: memberError } = await supabase
            .from("store_members")
            .select(`
        store_id,
        role,
        stores (id, name, slug, active, currency)
      `)
            .eq("user_id", session.user.id);

        console.log("[Admin Auth] Memberships query:", {
            data: memberships,
            error: memberError,
            count: memberships?.length
        });

        if (memberError) {
            console.error("[Admin Auth] Error fetching memberships:", memberError);
            return null;
        }

        if (!memberships?.length) {
            console.log("[Admin Auth] No memberships found for user");
            return null;
        }

        // Usar la primera tienda activa (o la primera si ninguna tiene active=true)
        let activeMembership = memberships.find(m => m.stores?.active === true);

        // Fallback: si no hay tienda con active=true, usar la primera
        if (!activeMembership && memberships.length > 0) {
            activeMembership = memberships[0];
            console.log("[Admin Auth] No active store found, using first membership");
        }

        if (!activeMembership?.stores) {
            console.log("[Admin Auth] No valid store in membership");
            return null;
        }

        currentStore = activeMembership.stores;
        currentRole = activeMembership.role;

        console.log("[Admin Auth] Access granted:", { store: currentStore.name, role: currentRole });

        return {
            user: session.user,
            store: currentStore,
            role: currentRole
        };
    } catch (err) {
        console.error("[Admin Auth] Exception:", err);
        return null;
    }
}

/**
 * Obtener el store actual (ya cacheado)
 */
export function getCurrentStore() {
    return currentStore;
}

/**
 * Obtener el rol actual
 */
export function getCurrentRole() {
    return currentRole;
}

/**
 * Verificar si el usuario puede escribir (no es viewer)
 */
export function canWrite() {
    return currentRole && currentRole !== "viewer";
}

/**
 * Verificar si es admin/owner
 */
export function isAdmin() {
    return currentRole === "admin" || currentRole === "owner";
}

/**
 * Verificar si es owner
 */
export function isOwner() {
    return currentRole === "owner";
}

/**
 * Redirigir a login si no hay acceso
 */
export async function requireAdmin() {
    const access = await checkAdminAccess();

    if (!access) {
        window.location.replace("/admin/login.html");
        return null;
    }

    return access;
}

/**
 * Logout
 */
export async function adminLogout() {
    await supabase.auth.signOut();
    window.location.replace("/admin/login.html");
}

/**
 * Obtener todas las tiendas del usuario (para selector)
 */
export async function getMyStores() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data, error } = await supabase
        .from("store_members")
        .select(`
      store_id,
      role,
      stores:store_id (id, name, slug, active)
    `)
        .eq("user_id", session.user.id);

    if (error) return [];
    return data?.filter(m => m.stores?.active).map(m => ({
        ...m.stores,
        role: m.role
    })) || [];
}

/**
 * Cambiar de tienda activa
 */
export function switchStore(storeId) {
    localStorage.setItem("admin:current_store", storeId);
    window.location.reload();
}
