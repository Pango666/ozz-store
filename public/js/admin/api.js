// public/js/admin/api.js
// CRUD helpers genéricos para admin
import { supabase } from "../supabaseClient.js";
import { getCurrentStore } from "./auth.js";

/**
 * Obtener lista con paginación y filtros
 */
export async function getList(table, {
    page = 1,
    perPage = 20,
    orderBy = "created_at",
    orderAsc = false,
    filters = {},
    search = null,
    searchColumns = ["name"],
    select = "*"
} = {}) {
    const store = getCurrentStore();
    if (!store) throw new Error("No store selected");

    let query = supabase
        .from(table)
        .select(select, { count: "exact" });

    // Filtrar por store_id si la tabla lo tiene
    const tablesWithStoreId = [
        "products", "variants", "categories", "brands",
        "option_groups", "pages", "inquiries", "settings"
    ];

    if (tablesWithStoreId.includes(table)) {
        query = query.eq("store_id", store.id);
    }

    // Aplicar filtros adicionales
    for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== "") {
            query = query.eq(key, value);
        }
    }

    // Búsqueda
    if (search && searchColumns.length > 0) {
        const searchFilter = searchColumns
            .map(col => `${col}.ilike.%${search}%`)
            .join(",");
        query = query.or(searchFilter);
    }

    // Ordenamiento
    query = query.order(orderBy, { ascending: orderAsc });

    // Paginación
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
        data: data || [],
        total: count || 0,
        page,
        perPage,
        totalPages: Math.ceil((count || 0) / perPage)
    };
}

/**
 * Obtener un registro por ID
 */
export async function getById(table, id, select = "*") {
    const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Crear registro
 */
export async function create(table, data) {
    const store = getCurrentStore();

    // Añadir store_id automáticamente si aplica
    const tablesWithStoreId = [
        "products", "variants", "categories", "brands",
        "option_groups", "pages", "inquiries", "settings"
    ];

    const payload = { ...data };
    if (tablesWithStoreId.includes(table) && !payload.store_id) {
        payload.store_id = store.id;
    }

    const { data: result, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return result;
}

/**
 * Actualizar registro
 */
export async function update(table, id, data) {
    const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return result;
}

/**
 * Eliminar registro
 */
export async function remove(table, id) {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

    if (error) throw error;
    return true;
}

/**
 * Upsert (crear o actualizar)
 */
export async function upsert(table, data, conflictColumns = ["id"]) {
    const store = getCurrentStore();

    const tablesWithStoreId = [
        "products", "variants", "categories", "brands",
        "option_groups", "pages", "inquiries", "settings"
    ];

    const payload = { ...data };
    if (tablesWithStoreId.includes(table) && !payload.store_id) {
        payload.store_id = store.id;
    }

    const { data: result, error } = await supabase
        .from(table)
        .upsert(payload, { onConflict: conflictColumns.join(",") })
        .select()
        .single();

    if (error) throw error;
    return result;
}

/**
 * Subir archivo a storage
 */
export async function uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
}

/**
 * Generar slug único
 */
export function generateSlug(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
