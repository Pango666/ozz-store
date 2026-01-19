// public/js/admin/product-edit.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initAdminLayout, toast, confirm, escapeHtml } from "./layout.js";
import { getById, create, update, generateSlug } from "./api.js";
import { supabase } from "../supabaseClient.js";

let productId = null;
let isNew = true;

// Media state
let allMedia = [];
let allVariants = [];
let currentGalleryIndex = 0;
let currentTabFilter = "base"; // "base" or variant_id

/**
 * Get images for a selected variant with fallback to base images.
 * @param {Array} productMedia - All product media items
 * @param {string|null} selectedVariantId - The variant ID to filter by (null for base)
 * @returns {Array} - Sorted array of images
 */
function getImagesForSelectedVariant(productMedia, selectedVariantId) {
    const all = Array.isArray(productMedia) ? productMedia : [];
    const base = all.filter(m => !m.variant_id);
    const specific = selectedVariantId
        ? all.filter(m => String(m.variant_id) === String(selectedVariantId))
        : [];
    const result = specific.length > 0 ? specific : base;
    return result.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/**
 * Get images for a specific filter (base or variant).
 * Does NOT fallback - returns only exact matches.
 */
function getImagesForFilter(productMedia, filter) {
    const all = Array.isArray(productMedia) ? productMedia : [];
    if (filter === "base") {
        return all.filter(m => !m.variant_id).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }
    return all.filter(m => String(m.variant_id) === String(filter)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    await initAdminLayout(access);

    const params = new URLSearchParams(window.location.search);
    productId = params.get("id");
    isNew = !productId;

    await loadSelectOptions();

    if (!isNew) {
        document.getElementById("page-title").textContent = "Editar Producto";
        await loadProduct();
        document.getElementById("variants-section").classList.remove("hidden");
        document.getElementById("media-section").classList.remove("hidden");
        await loadVariants();
        await loadMedia();
    } else {
        document.getElementById("btn-save").innerHTML = `<span class="material-symbols-outlined text-[18px]">add</span> Crear Producto`;
        // Show info box explaining that media/variants come after first save
        document.getElementById("new-product-info")?.classList.remove("hidden");
    }

    setupEventListeners();
    setupGalleryNavigation();
}

async function loadSelectOptions() {
    const store = getCurrentStore();
    try {
        const { data: categories } = await supabase.from("categories").select("*").eq("store_id", store.id).order("name");
        const catSelect = document.getElementById("category_id");
        catSelect.innerHTML = `<option value="">Seleccionar Categoría...</option>` +
            (categories || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

        const { data: brands } = await supabase.from("brands").select("*").eq("store_id", store.id).order("name");
        const brandSelect = document.getElementById("brand_id");
        brandSelect.innerHTML = `<option value="">Seleccionar Marca...</option>` +
            (brands || []).map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
    } catch (err) {
        console.error(err);
    }
}

async function loadProduct() {
    try {
        const product = await getById("products", productId);
        document.getElementById("name").value = product.name || "";
        document.getElementById("slug").value = product.slug || "";
        document.getElementById("base_price").value = product.base_price || "";
        document.getElementById("category_id").value = product.category_id || "";
        document.getElementById("brand_id").value = product.brand_id || "";
        document.getElementById("short_desc").value = product.short_desc || "";
        document.getElementById("description").value = product.description || "";
        document.getElementById("active").checked = product.active !== false;
        if (product.specs_json) document.getElementById("specs_json").value = JSON.stringify(product.specs_json, null, 2);
        if (product.landing_json) document.getElementById("landing_json").value = JSON.stringify(product.landing_json, null, 2);
    } catch (err) {
        console.error(err);
        toast("Error cargando producto", "error");
    }
}

// MEDIA FUNCTIONS
async function loadMedia() {
    try {
        const { data: media, error } = await supabase
            .from("product_media")
            .select("*")
            .eq("product_id", productId)
            .order("sort", { ascending: true });

        if (error) {
            console.error("Error loading media:", error);
            return;
        }

        allMedia = media || [];

        updateImageVariantSelect();
        updateMediaTabs();
        renderMediaList();
        renderGalleryPreview();
    } catch (err) {
        console.error("Exception loading media:", err);
    }
}

function updateImageVariantSelect() {
    const select = document.getElementById("image-variant-select");
    if (!select) return;

    select.innerHTML = `<option value=""><span class="material-symbols-outlined">home</span> Producto Base (visible para todas las variantes)</option>` +
        allVariants.map(v => `<option value="${v.id}">Variante: ${escapeHtml(v.sku || "Sin SKU")}</option>`).join("");
}

function updateMediaTabs() {
    const tabsContainer = document.getElementById("media-tabs");
    if (!tabsContainer) return;

    const baseCount = allMedia.filter(m => !m.variant_id).length;

    let html = `
        <button type="button" data-tab="base" 
            class="media-tab ${currentTabFilter === 'base' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">home</span> Base (${baseCount})
        </button>
    `;

    for (const variant of allVariants) {
        const count = allMedia.filter(m => String(m.variant_id) === String(variant.id)).length;
        const isActive = currentTabFilter === variant.id;
        html += `
            <button type="button" data-tab="${variant.id}" 
                class="media-tab ${isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">inventory_2</span> ${escapeHtml(variant.sku || "Var")} (${count})
            </button>
        `;
    }

    tabsContainer.innerHTML = html;

    // Add click handlers
    tabsContainer.querySelectorAll(".media-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            currentTabFilter = btn.dataset.tab;
            currentGalleryIndex = 0;
            updateMediaTabs();
            renderMediaList();
            renderGalleryPreview();
        });
    });
}

function renderMediaList() {
    const container = document.getElementById("media-list");
    const emptyState = document.getElementById("media-empty");
    if (!container) return;

    const filtered = getImagesForFilter(allMedia, currentTabFilter);

    if (!filtered.length) {
        container.innerHTML = "";
        emptyState?.classList.remove("hidden");
        return;
    }

    emptyState?.classList.add("hidden");

    container.innerHTML = filtered.map((m, idx) => `
        <div class="group relative bg-slate-50 rounded-lg overflow-hidden border border-slate-200 hover:border-primary/50 transition-colors">
            <div class="aspect-square">
                <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.alt || '')}" class="w-full h-full object-cover">
            </div>
            ${idx === 0 ? '<span class="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">star</span> Principal</span>' : ''}
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div class="flex gap-1">
                    ${idx > 0 ? `<button onclick="moveMediaUp('${m.id}')" class="p-1.5 bg-white rounded-full shadow hover:bg-slate-100" title="Subir"><span class="material-symbols-outlined text-sm">arrow_upward</span></button>` : ''}
                    ${idx < filtered.length - 1 ? `<button onclick="moveMediaDown('${m.id}')" class="p-1.5 bg-white rounded-full shadow hover:bg-slate-100" title="Bajar"><span class="material-symbols-outlined text-sm">arrow_downward</span></button>` : ''}
                    <button onclick="deleteMedia('${m.id}')" class="p-1.5 bg-red-500 text-white rounded-full shadow hover:bg-red-600" title="Eliminar"><span class="material-symbols-outlined text-sm">delete</span></button>
                </div>
            </div>
            ${m.alt ? `<div class="px-2 py-1 text-xs text-slate-500 truncate border-t border-slate-100">${escapeHtml(m.alt)}</div>` : ''}
        </div>
    `).join("");
}

function renderGalleryPreview() {
    const mainImg = document.getElementById("gallery-main-image");
    const thumbsContainer = document.getElementById("gallery-thumbs");
    const indicator = document.getElementById("gallery-indicator");
    const prevBtn = document.getElementById("gallery-prev");
    const nextBtn = document.getElementById("gallery-next");
    const currentSpan = document.getElementById("gallery-current");
    const totalSpan = document.getElementById("gallery-total");

    if (!mainImg) return;

    // Use getImagesForSelectedVariant for gallery (with fallback behavior)
    const images = currentTabFilter === "base"
        ? getImagesForFilter(allMedia, "base")
        : getImagesForSelectedVariant(allMedia, currentTabFilter);

    if (!images.length) {
        mainImg.src = "https://placehold.co/600x600/f1f5f9/94a3b8?text=Sin+imagen";
        thumbsContainer.innerHTML = "";
        indicator?.classList.add("hidden");
        prevBtn?.classList.add("hidden");
        nextBtn?.classList.add("hidden");
        return;
    }

    // Clamp current index
    if (currentGalleryIndex >= images.length) currentGalleryIndex = 0;
    if (currentGalleryIndex < 0) currentGalleryIndex = images.length - 1;

    // Update main image
    mainImg.src = images[currentGalleryIndex].url;
    mainImg.alt = images[currentGalleryIndex].alt || "Imagen del producto";

    // Update indicator
    if (images.length > 1) {
        indicator?.classList.remove("hidden");
        prevBtn?.classList.remove("hidden");
        nextBtn?.classList.remove("hidden");
        if (currentSpan) currentSpan.textContent = currentGalleryIndex + 1;
        if (totalSpan) totalSpan.textContent = images.length;
    } else {
        indicator?.classList.add("hidden");
        prevBtn?.classList.add("hidden");
        nextBtn?.classList.add("hidden");
    }

    // Render thumbnails
    thumbsContainer.innerHTML = images.map((m, idx) => `
        <button type="button" onclick="setGalleryIndex(${idx})" 
            class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${idx === currentGalleryIndex ? 'border-primary' : 'border-slate-200 hover:border-slate-400'} transition-colors">
            <img src="${escapeHtml(m.url)}" alt="" class="w-full h-full object-cover">
        </button>
    `).join("");
}

function setupGalleryNavigation() {
    const prevBtn = document.getElementById("gallery-prev");
    const nextBtn = document.getElementById("gallery-next");
    const galleryPreview = document.getElementById("gallery-preview");

    prevBtn?.addEventListener("click", () => {
        currentGalleryIndex--;
        renderGalleryPreview();
    });

    nextBtn?.addEventListener("click", () => {
        currentGalleryIndex++;
        renderGalleryPreview();
    });

    // Keyboard navigation
    galleryPreview?.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            currentGalleryIndex--;
            renderGalleryPreview();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            currentGalleryIndex++;
            renderGalleryPreview();
        }
    });
}

window.setGalleryIndex = function (idx) {
    currentGalleryIndex = idx;
    renderGalleryPreview();
};

async function addMedia(url, variantId, alt) {
    if (!url) {
        toast("Ingresa una URL de imagen", "warning");
        return;
    }

    const btn = document.getElementById("btn-add-image");
    const btnText = document.getElementById("btn-add-image-text");
    const originalText = btnText?.textContent || "Agregar Imagen";

    try {
        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = "Agregando...";

        // Get current max sort for this variant/base
        const filtered = variantId
            ? allMedia.filter(m => String(m.variant_id) === String(variantId))
            : allMedia.filter(m => !m.variant_id);
        const maxSort = filtered.reduce((max, m) => Math.max(max, m.sort || 0), -1);

        const { error } = await supabase.from("product_media").insert({
            product_id: productId,
            url: url,
            alt: alt || null,
            variant_id: variantId || null,
            sort: maxSort + 1
        });

        if (error) throw error;
        toast("Imagen agregada", "success");

        // Clear inputs
        document.getElementById("new-image-url").value = "";
        document.getElementById("new-image-alt").value = "";

        // Set tab to the one we just added to
        currentTabFilter = variantId || "base";
        currentGalleryIndex = 0;

        await loadMedia();
    } catch (err) {
        console.error(err);
        toast("Error al agregar imagen: " + (err.message || ""), "error");
    } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = originalText;
    }
}

window.deleteMedia = async function (id) {
    if (!await confirm("¿Eliminar imagen?")) return;
    try {
        const { error } = await supabase.from("product_media").delete().eq("id", id);
        if (error) throw error;
        toast("Imagen eliminada", "success");
        currentGalleryIndex = 0;
        await loadMedia();
    } catch (err) {
        toast("Error al eliminar imagen", "error");
    }
};

window.moveMediaUp = async function (id) {
    const filtered = getImagesForFilter(allMedia, currentTabFilter);
    const idx = filtered.findIndex(m => m.id === id);
    if (idx <= 0) return;

    // Swap sort with previous item
    const current = filtered[idx];
    const prev = filtered[idx - 1];

    try {
        await Promise.all([
            supabase.from("product_media").update({ sort: prev.sort }).eq("id", current.id),
            supabase.from("product_media").update({ sort: current.sort }).eq("id", prev.id)
        ]);
        await loadMedia();
    } catch (err) {
        toast("Error al reordenar", "error");
    }
};

window.moveMediaDown = async function (id) {
    const filtered = getImagesForFilter(allMedia, currentTabFilter);
    const idx = filtered.findIndex(m => m.id === id);
    if (idx < 0 || idx >= filtered.length - 1) return;

    const current = filtered[idx];
    const next = filtered[idx + 1];

    try {
        await Promise.all([
            supabase.from("product_media").update({ sort: next.sort }).eq("id", current.id),
            supabase.from("product_media").update({ sort: current.sort }).eq("id", next.id)
        ]);
        await loadMedia();
    } catch (err) {
        toast("Error al reordenar", "error");
    }
};

// VARIANTS FUNCTIONS
async function loadVariants() {
    const container = document.getElementById("variants-list");
    try {
        const { data: variants } = await supabase
            .from("variants")
            .select("*")
            .eq("product_id", productId)
            .order("created_at");

        allVariants = variants || [];

        // Update variant select for image uploader
        updateImageVariantSelect();
        // Update tabs to show variant tabs
        updateMediaTabs();

        if (!allVariants.length) {
            container.innerHTML = `
                <div class="px-6 py-8 text-center text-slate-400 flex flex-col items-center">
                     <span class="material-symbols-outlined text-3xl mb-2 opacity-50">layers_clear</span>
                     <p class="text-sm">No hay variantes registradas</p>
                     <button onclick="openVariantModal()" class="mt-2 text-primary hover:underline text-sm font-medium">Agregar la primera</button>
                </div>`;
            return;
        }

        container.innerHTML = allVariants.map(v => `
      <div class="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
        <div class="flex items-center gap-4">
           <div class="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-mono text-xs font-bold">
               ${escapeHtml(v.sku?.substring(0, 3) || 'VAR')}
           </div>
           <div>
               <div class="font-bold text-slate-900 font-mono text-sm">${escapeHtml(v.sku || "Sin SKU")}</div>
               <div class="text-sm text-slate-500">$ ${Number(v.price || 0).toFixed(2)}</div>
           </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${v.active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}">
            ${v.active ? "Activo" : "Inactivo"}
          </span>
          <button onclick="editVariant('${v.id}', '${v.sku}', ${v.price})" 
            class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
            <span class="material-symbols-outlined text-xl">edit</span>
          </button>
        </div>
      </div>
    `).join("");
    } catch (err) {
        console.error(err);
    }
}

function setupEventListeners() {
    const form = document.getElementById("product-form");
    const nameInput = document.getElementById("name");
    const slugInput = document.getElementById("slug");

    nameInput.addEventListener("input", () => {
        if (isNew || !slugInput.value) slugInput.value = generateSlug(nameInput.value);
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveProduct();
    });

    // Media
    document.getElementById("btn-add-image")?.addEventListener("click", () => {
        const url = document.getElementById("new-image-url").value.trim();
        const variantId = document.getElementById("image-variant-select").value || null;
        const alt = document.getElementById("new-image-alt").value.trim();
        addMedia(url, variantId, alt);
    });

    // Variants
    document.getElementById("btn-add-variant")?.addEventListener("click", () => openVariantModal());
    document.getElementById("variant-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveVariant();
    });
}

async function saveProduct() {
    const store = getCurrentStore();
    const btn = document.getElementById("btn-save");
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Guardando...`;

        let specsJson = {};
        try {
            const raw = document.getElementById("specs_json").value.trim();
            if (raw) specsJson = JSON.parse(raw);
        } catch {
            return toast("JSON specs inválido", "error");
        }

        let landingJson = {};
        try {
            const raw = document.getElementById("landing_json").value.trim();
            if (raw) landingJson = JSON.parse(raw);
        } catch {
            return toast("JSON landing inválido", "error");
        }

        const data = {
            name: document.getElementById("name").value.trim(),
            slug: document.getElementById("slug").value.trim() || generateSlug(document.getElementById("name").value),
            base_price: parseFloat(document.getElementById("base_price").value) || 0,
            category_id: document.getElementById("category_id").value || null,
            brand_id: document.getElementById("brand_id").value || null,
            short_desc: document.getElementById("short_desc").value.trim() || null,
            description: document.getElementById("description").value.trim() || null,
            active: document.getElementById("active").checked,
            specs_json: specsJson,
            landing_json: landingJson
        };

        if (isNew) {
            data.store_id = store.id;
            const result = await create("products", data);
            toast("Producto creado", "success");
            setTimeout(() => window.location.replace(`product-edit.html?id=${result.id}`), 1000);
        } else {
            await update("products", productId, data);
            toast("Producto actualizado", "success");
        }
    } catch (err) {
        toast("Error: " + err.message, "error");
    } finally {
        if (!isNew) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// Variant Modal
window.openVariantModal = function (id = null, sku = "", price = "") {
    document.getElementById("modal-variant").classList.remove("hidden");
    document.getElementById("variant-modal-title").textContent = id ? "Editar Variante" : "Nueva Variante";
    document.getElementById("variant-id").value = id || "";
    document.getElementById("variant-sku").value = sku || "";
    document.getElementById("variant-price").value = price || document.getElementById("base_price").value || "";
    setTimeout(() => document.getElementById("variant-sku").focus(), 100);
};

window.closeVariantModal = () => document.getElementById("modal-variant").classList.add("hidden");
window.editVariant = (id, sku, price) => openVariantModal(id, sku, price);

async function saveVariant() {
    const store = getCurrentStore();
    const id = document.getElementById("variant-id").value;
    const sku = document.getElementById("variant-sku").value.trim();
    const price = parseFloat(document.getElementById("variant-price").value) || 0;

    const btn = document.querySelector("#variant-form button[type='submit']");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        if (id) {
            await update("variants", id, { sku, price });
            toast("Variante actualizada", "success");
        } else {
            await create("variants", { store_id: store.id, product_id: productId, sku, price, active: true });
            toast("Variante creada", "success");
        }
        closeVariantModal();
        await loadVariants();
        // Update media tabs to reflect new variant
        updateMediaTabs();
    } catch (err) {
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

init();
