// public/js/admin/categories.js
import { requireAdmin } from "./auth.js";
import { initAdminLayout, toast, confirm, escapeHtml } from "./layout.js";
import { getList, create, update, remove, generateSlug } from "./api.js";
import { supabase } from "../supabaseClient.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    await initAdminLayout(access);
    await loadCategories();
    setupEventListeners();
}

async function loadCategories() {
    const container = document.getElementById("categories-list");

    try {
        // Obtenemos categorías ordenadas por sort, luego por nombre
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('sort', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        if (!data.length) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-16 text-center text-slate-400">
                        <div class="flex flex-col items-center">
                            <span class="material-symbols-outlined text-5xl mb-3 text-slate-300">category</span>
                            <h3 class="text-lg font-medium text-slate-900">No hay categorías</h3>
                            <p class="text-sm mt-1">Crea tu primera categoría para organizar productos</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        container.innerHTML = data.map(c => `
            <tr class="hover:bg-slate-50/80 transition-colors group">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" 
                             style="background-color: ${c.color_hex || '#cbd5e1'}">
                            <span class="material-symbols-outlined">${c.icon || 'category'}</span>
                        </div>
                        <div>
                            <div class="font-medium text-slate-900">${escapeHtml(c.name)}</div>
                            <div class="text-xs text-slate-500 font-mono">${c.slug}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate" title="${escapeHtml(c.description || '')}">
                    ${escapeHtml(c.description || '—')}
                </td>
                <td class="px-6 py-4 text-center hidden sm:table-cell">
                    <span class="text-slate-600 font-mono text-sm bg-slate-100 px-2 py-1 rounded">${c.sort || 0}</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex flex-col gap-1 items-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }">
                           ${c.active ? 'Activa' : 'Inactiva'}
                        </span>
                        ${c.featured
                ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">Destacada</span>'
                : ''
            }
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editCategory('${c.id}')" 
                            class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <span class="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button onclick="deleteCategory('${c.id}')" 
                            class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <span class="material-symbols-outlined text-xl">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (err) {
        console.error(err);
        container.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500">Error: ${err.message}</td></tr>`;
    }
}

function setupEventListeners() {
    document.getElementById("btn-new").addEventListener("click", () => openModal());

    document.getElementById("category-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveCategory();
    });

    // Auto-slug
    document.getElementById("edit-name").addEventListener("input", (e) => {
        if (!document.getElementById("edit-id").value) {
            document.getElementById("edit-slug").value = generateSlug(e.target.value);
        }
    });

    // Color picker sync
    const colorInput = document.getElementById("edit-color");
    const colorPicker = document.getElementById("edit-color-picker");

    colorPicker.addEventListener("input", (e) => colorInput.value = e.target.value);
    colorInput.addEventListener("input", (e) => colorPicker.value = e.target.value);
}

function openModal(category = null) {
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");

    document.getElementById("modal-title").textContent = category ? "Editar categoría" : "Nueva categoría";

    document.getElementById("edit-id").value = category?.id || "";
    document.getElementById("edit-name").value = category?.name || "";
    document.getElementById("edit-slug").value = category?.slug || "";
    document.getElementById("edit-icon").value = category?.icon || "";
    document.getElementById("edit-color").value = category?.color_hex || "#3b82f6";
    document.getElementById("edit-color-picker").value = category?.color_hex || "#3b82f6";
    document.getElementById("edit-description").value = category?.description || "";
    document.getElementById("edit-sort").value = category?.sort || 0;
    document.getElementById("edit-active").checked = category?.active !== false;
    document.getElementById("edit-featured").checked = category?.featured || false;
}

window.closeModal = function () {
    document.getElementById("modal").classList.add("hidden");
}

async function saveCategory() {
    const id = document.getElementById("edit-id").value;
    const btn = document.querySelector("#category-form button[type='submit']");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";

    const data = {
        name: document.getElementById("edit-name").value.trim(),
        slug: document.getElementById("edit-slug").value.trim() || generateSlug(document.getElementById("edit-name").value),
        icon: document.getElementById("edit-icon").value.trim() || null,
        color_hex: document.getElementById("edit-color").value.trim() || null,
        description: document.getElementById("edit-description").value.trim() || null,
        sort: parseInt(document.getElementById("edit-sort").value) || 0,
        active: document.getElementById("edit-active").checked,
        featured: document.getElementById("edit-featured").checked
    };

    try {
        if (id) {
            await update("categories", id, data);
            toast("Categoría actualizada", "success");
        } else {
            await create("categories", data);
            toast("Categoría creada", "success");
        }
        closeModal();
        await loadCategories();
    } catch (err) {
        console.error(err);
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

window.editCategory = async function (id) {
    try {
        const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
        if (error) throw error;
        if (data) openModal(data);
    } catch (err) {
        toast("Error cargando categoría", "error");
    }
};

window.deleteCategory = async function (id) {
    if (!await confirm("¿Eliminar esta categoría?")) return;

    try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        toast("Categoría eliminada", "success");
        await loadCategories();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
};

init();
