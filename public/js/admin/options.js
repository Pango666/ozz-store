// public/js/admin/options.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initAdminLayout, toast, confirm, escapeHtml } from "./layout.js";
import { create, update, remove, generateSlug } from "./api.js";
import { supabase } from "../supabaseClient.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    await initAdminLayout(access);
    await loadGroups();
    setupEventListeners();
}

async function loadGroups() {
    const store = getCurrentStore();
    const container = document.getElementById("groups-list");

    try {
        const { data: groups, error } = await supabase
            .from("option_groups")
            .select(`*, option_values(*)`)
            .eq("store_id", store.id)
            .order("name");

        if (error) throw error;

        if (!groups?.length) {
            container.innerHTML = `
                <div class="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400 shadow-sm">
                    <div class="flex flex-col items-center">
                        <span class="material-symbols-outlined text-5xl mb-4 text-slate-300">tune</span>
                        <h3 class="text-xl font-bold text-slate-900 mb-2">No hay grupos de opciones</h3>
                        <p class="text-slate-500 max-w-sm mx-auto mb-6">Crea grupos como "Talla" o "Color" para agregar variaciones a tus productos.</p>
                        <button onclick="openGroupModal()" class="text-primary hover:underline font-medium">Crear primer grupo</button>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = groups.map(g => {
            const values = (g.option_values || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
            const typeLabels = { select: "Lista desplegable", color: "Color", buttons: "Botones" };
            const typeIcons = { select: "list_alt", color: "palette", buttons: "smart_button" };

            return `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <!-- Header -->
                <div class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                            <span class="material-symbols-outlined">${typeIcons[g.input_type] || 'settings'}</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-900 text-lg">${escapeHtml(g.name)}</h3>
                            <div class="flex items-center gap-2 text-xs text-slate-500">
                                <span class="bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">${typeLabels[g.input_type] || g.input_type}</span>
                                
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="editGroup('${g.id}')" 
                            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-lg">edit</span> Editar
                        </button>
                        <button onclick="deleteGroup('${g.id}')" 
                            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                        <button onclick="addValue('${g.id}')" 
                            class="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark shadow-sm transition-colors">
                            <span class="material-symbols-outlined text-lg">add</span> Agregar Valor
                        </button>
                    </div>
                </div>

                <!-- Values -->
                <div class="p-6 bg-white min-h-[80px]">
                    ${values.length > 0
                    ? `<div class="flex flex-wrap gap-2">
                            ${values.map(v => `
                                <div class="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-primary/30 hover:bg-blue-50/30 transition-all cursor-pointer select-none"
                                     onclick="editValue('${g.id}', '${v.id}')">
                                    ${v.color_hex
                            ? `<span class="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style="background:${v.color_hex}"></span>`
                            : ''}
                                    <span class="font-medium text-slate-700 text-sm">${escapeHtml(v.label)}</span>
                                    <span class="hidden group-hover:flex absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] shadow"
                                          onclick="event.stopPropagation(); deleteValue('${v.id}')">
                                        ✕
                                    </span>
                                </div>
                            `).join('')}
                           </div>`
                    : `<p class="text-slate-400 italic text-sm text-center py-2">No hay valores definidos. Haz clic en "Agregar Valor".</p>`
                }
                </div>
            </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Error loading groups:", err);
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error: ${err.message}</div>`;
    }
}

function setupEventListeners() {
    document.getElementById("btn-new-group").addEventListener("click", () => openGroupModal());

    document.getElementById("group-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveGroup();
    });

    document.getElementById("value-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveValue();
    });

    // Value form slug gen
    document.getElementById("value-label").addEventListener("input", (e) => {
        if (!document.getElementById("value-id").value) {
            document.getElementById("value-value").value = generateSlug(e.target.value);
        }
    });

    // Color picker sync
    const cp = document.getElementById("value-color-picker");
    const ci = document.getElementById("value-color");
    cp.addEventListener("input", e => ci.value = e.target.value);
    ci.addEventListener("input", e => cp.value = e.target.value);
}

// Group modal
window.openGroupModal = function (group = null) {
    document.getElementById("modal-group").classList.remove("hidden");
    document.getElementById("modal-group-title").textContent = group ? "Editar Grupo" : "Nuevo Grupo";

    document.getElementById("group-id").value = group?.id || "";
    document.getElementById("group-name").value = group?.name || "";
    document.getElementById("group-input-type").value = group?.input_type || "select";
    document.getElementById("group-active").checked = group?.active !== false;
}

window.closeGroupModal = function () {
    document.getElementById("modal-group").classList.add("hidden");
};

async function saveGroup() {
    const id = document.getElementById("group-id").value;
    const name = document.getElementById("group-name").value.trim();

    const data = {
        name,
        slug: generateSlug(name),
        input_type: document.getElementById("group-input-type").value,
        active: document.getElementById("group-active").checked,
        store_id: getCurrentStore().id // Ensure store_id
    };

    try {
        if (id) {
            await update("option_groups", id, data);
            toast("Grupo actualizado", "success");
        } else {
            await create("option_groups", data);
            toast("Grupo creado", "success");
        }
        closeGroupModal();
        await loadGroups();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
}

window.editGroup = async function (id) {
    const { data, error } = await supabase
        .from("option_groups")
        .select("*")
        .eq("id", id)
        .single();

    if (!error && data) openGroupModal(data);
};

window.deleteGroup = async function (id) {
    if (!await confirm("¿Eliminar este grupo y todos sus valores?")) return;

    try {
        await remove("option_groups", id);
        toast("Grupo eliminado", "success");
        await loadGroups();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
};

// Value modal
window.addValue = function (groupId) {
    openValueModal(groupId, null);
};

window.editValue = async function (groupId, valueId) {
    const { data, error } = await supabase
        .from("option_values")
        .select("*")
        .eq("id", valueId)
        .single();

    if (!error && data) openValueModal(groupId, data);
};

function openValueModal(groupId, value = null) {
    document.getElementById("modal-value").classList.remove("hidden");
    document.getElementById("modal-value-title").textContent = value ? "Editar Valor" : "Nuevo Valor";

    document.getElementById("value-id").value = value?.id || "";
    document.getElementById("value-group-id").value = groupId;
    document.getElementById("value-label").value = value?.label || "";
    document.getElementById("value-value").value = value?.value || "";
    document.getElementById("value-color").value = value?.color_hex || "";
    document.getElementById("value-color-picker").value = value?.color_hex || "#000000";
}

window.closeValueModal = function () {
    document.getElementById("modal-value").classList.add("hidden");
};

async function saveValue() {
    const id = document.getElementById("value-id").value;
    const groupId = document.getElementById("value-group-id").value;
    const label = document.getElementById("value-label").value.trim();

    const data = {
        option_group_id: groupId,
        label,
        value: document.getElementById("value-value").value.trim() || generateSlug(label),
        color_hex: document.getElementById("value-color").value.trim() || null,
        active: true
    };

    try {
        if (id) {
            const { error } = await supabase.from("option_values").update(data).eq("id", id);
            if (error) throw error;
            toast("Valor actualizado", "success");
        } else {
            const { error } = await supabase.from("option_values").insert(data);
            if (error) throw error;
            toast("Valor creado", "success");
        }
        closeValueModal();
        await loadGroups();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
}

window.deleteValue = async function (id) {
    if (!await confirm("¿Eliminar este valor?")) return;
    try {
        const { error } = await supabase.from('option_values').delete().eq('id', id);
        if (error) throw error;
        toast("Valor eliminado", "success");
        await loadGroups();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
}

init();
