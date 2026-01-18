// public/js/admin/brands.js
import { requireAdmin } from "./auth.js";
import { initAdminLayout, toast, confirm, escapeHtml } from "./layout.js";
import { getList, create, update, remove, generateSlug } from "./api.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    // Initialize shared layout
    await initAdminLayout(access);

    // Load content
    await loadBrands();
    setupEventListeners();
}

async function loadBrands() {
    const container = document.getElementById("brands-list");

    try {
        const result = await getList("brands", { perPage: 100, orderBy: "name", orderAsc: true });

        if (!result.data.length) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-16 text-center text-slate-400">
                        <div class="flex flex-col items-center">
                            <span class="material-symbols-outlined text-5xl mb-3 text-slate-300">branding_watermark</span>
                            <h3 class="text-lg font-medium text-slate-900">No hay marcas</h3>
                            <p class="text-sm mt-1">Agrega tu primera marca para comenzar</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        container.innerHTML = result.data.map(b => `
            <tr class="hover:bg-slate-50/80 transition-colors group">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                            ${b.image
                ? `<img src="${escapeHtml(b.image)}" class="w-full h-full object-contain" onerror="this.src='https://placehold.co/100x100?text=Logo'">`
                : `<span class="material-symbols-outlined text-slate-300">image_not_supported</span>`
            }
                        </div>
                        <div class="font-medium text-slate-900">${escapeHtml(b.name)}</div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-500 hidden md:table-cell font-mono text-xs">${b.slug}</td>
                <td class="px-6 py-4 text-sm text-slate-500 hidden sm:table-cell max-w-xs truncate" title="${escapeHtml(b.description || '')}">
                    ${escapeHtml(b.description || '—')}
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${b.active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }">
                        <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${b.active ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                        ${b.active ? 'Activa' : 'Inactiva'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editBrand('${b.id}')" 
                            class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <span class="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button onclick="deleteBrand('${b.id}')" 
                            class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <span class="material-symbols-outlined text-xl">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-red-500">
                    Error cargando marcas: ${err.message}
                </td>
            </tr>`;
    }
}

function setupEventListeners() {
    document.getElementById("btn-new").addEventListener("click", () => openModal());

    document.getElementById("brand-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveBrand();
    });

    // Auto-generate slug
    document.getElementById("edit-name").addEventListener("input", (e) => {
        const slugInput = document.getElementById("edit-slug");
        if (!document.getElementById("edit-id").value) {
            slugInput.value = generateSlug(e.target.value);
        }
    });

    // Image preview
    const imgInput = document.getElementById("edit-image");
    imgInput.addEventListener("input", updateImagePreview);
    imgInput.addEventListener("change", updateImagePreview);
}

function updateImagePreview() {
    const url = document.getElementById("edit-image").value.trim();
    const preview = document.getElementById("preview-image");
    const placeholder = document.getElementById("preview-placeholder");

    if (url) {
        preview.src = url;
        preview.classList.remove("hidden");
        placeholder.classList.add("hidden");
    } else {
        preview.classList.add("hidden");
        placeholder.classList.remove("hidden");
        preview.src = "";
    }
}

function openModal(brand = null) {
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");
    // Trigger reflow for transition
    void modal.offsetWidth;
    // modal.querySelector('div').classList.add('scale-100');

    document.getElementById("modal-title").textContent = brand ? "Editar marca" : "Nueva marca";

    document.getElementById("edit-id").value = brand?.id || "";
    document.getElementById("edit-name").value = brand?.name || "";
    document.getElementById("edit-slug").value = brand?.slug || "";
    document.getElementById("edit-image").value = brand?.image || "";
    document.getElementById("edit-description").value = brand?.description || "";
    document.getElementById("edit-active").checked = brand?.active !== false;

    updateImagePreview();
}

window.closeModal = function () {
    document.getElementById("modal").classList.add("hidden");
};

async function saveBrand() {
    const id = document.getElementById("edit-id").value;
    const btn = document.querySelector("#brand-form button[type='submit']");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";

    const data = {
        name: document.getElementById("edit-name").value.trim(),
        slug: document.getElementById("edit-slug").value.trim() || generateSlug(document.getElementById("edit-name").value),
        image: document.getElementById("edit-image").value.trim() || null,
        description: document.getElementById("edit-description").value.trim() || null,
        active: document.getElementById("edit-active").checked
    };

    try {
        if (id) {
            await update("brands", id, data);
            toast("Marca actualizada", "success");
        } else {
            await create("brands", data);
            toast("Marca creada", "success");
        }
        closeModal();
        await loadBrands();
    } catch (err) {
        console.error(err);
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

window.editBrand = async function (id) {
    try {
        const result = await getList("brands", { filters: { id } });
        if (result.data[0]) openModal(result.data[0]);
    } catch (err) {
        toast("Error cargando marca", "error");
    }
};

window.deleteBrand = async function (id) {
    if (!await confirm("¿Estás seguro de eliminar esta marca?")) return;

    try {
        await remove("brands", id);
        toast("Marca eliminada", "success");
        await loadBrands();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
};

init();
