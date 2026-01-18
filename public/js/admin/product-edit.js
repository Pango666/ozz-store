// public/js/admin/product-edit.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initAdminLayout, toast, confirm, escapeHtml } from "./layout.js";
import { getById, create, update, generateSlug } from "./api.js";
import { supabase } from "../supabaseClient.js";

let productId = null;
let isNew = true;

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    await initAdminLayout(access);

    const params = new URLSearchParams(window.location.search);
    productId = params.get("id");
    isNew = !productId;

    // Debug banner removed

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
    }

    setupEventListeners();
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
    const container = document.getElementById("media-list");
    try {
        const { data: media } = await supabase
            .from("product_media")
            .select("*")
            .eq("product_id", productId)
            .order("sort_order", { ascending: true });

        if (!media?.length) {
            container.innerHTML = `<p class="col-span-full text-center text-slate-400 py-4 text-sm">No hay imágenes cargadas</p>`;
            return;
        }

        container.innerHTML = media.map(m => `
            <div class="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img src="${escapeHtml(m.url)}" class="w-full h-full object-cover">
                <button onclick="deleteMedia('${m.id}')" 
                    class="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm">
                    <span class="material-symbols-outlined text-[16px] block">delete</span>
                </button>
            </div>
        `).join("");
    } catch (err) {
        console.error(err);
    }
}

async function addMedia(url) {
    if (!url) return;
    try {
        const { error } = await supabase.from("product_media").insert({
            product_id: productId,
            url: url,
            type: "image",
            sort_order: 0
        });
        if (error) throw error;
        toast("Imagen agregada", "success");
        document.getElementById("new-image-url").value = "";
        await loadMedia();
    } catch (err) {
        toast("Error al agregar imagen", "error");
    }
}

window.deleteMedia = async function (id) {
    if (!await confirm("¿Eliminar imagen?")) return;
    try {
        const { error } = await supabase.from("product_media").delete().eq("id", id);
        if (error) throw error;
        toast("Imagen eliminada", "success");
        await loadMedia();
    } catch (err) {
        toast("Error al eliminar imagen", "error");
    }
}

// VARIANTS FUNCTIONS
async function loadVariants() {
    const container = document.getElementById("variants-list");
    try {
        const { data: variants } = await supabase
            .from("variants")
            .select("*")
            .eq("product_id", productId)
            .order("created_at");

        if (!variants?.length) {
            container.innerHTML = `
                <div class="px-6 py-8 text-center text-slate-400 flex flex-col items-center">
                     <span class="material-symbols-outlined text-3xl mb-2 opacity-50">layers_clear</span>
                     <p class="text-sm">No hay variantes registradas</p>
                     <button onclick="openVariantModal()" class="mt-2 text-primary hover:underline text-sm font-medium">Agregar la primera</button>
                </div>`;
            return;
        }

        container.innerHTML = variants.map(v => `
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
        addMedia(document.getElementById("new-image-url").value.trim());
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

        let specsJson = null;
        try {
            const raw = document.getElementById("specs_json").value.trim();
            if (raw) specsJson = JSON.parse(raw);
        } catch {
            return toast("JSON specs inválido", "error");
        }

        let landingJson = null;
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
    } catch (err) {
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

init();
