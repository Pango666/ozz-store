// public/js/admin/page-edit.js
import { requireAdmin } from "./auth.js";
import { initLayout, toast } from "./layout.js";
import { getById, create, update, generateSlug } from "./api.js";

let pageId = null;
let isNew = true;

async function init() {
    const access = await requireAdmin();
    if (!access) return;
    await initLayout();

    const params = new URLSearchParams(window.location.search);
    pageId = params.get("id");
    isNew = !pageId;

    if (!isNew) {
        document.getElementById("page-title").textContent = "Editar Página";
        await loadPage();
    }

    setupEventListeners();
}

async function loadPage() {
    try {
        const page = await getById("pages", pageId);

        document.getElementById("title").value = page.title || "";
        document.getElementById("slug").value = page.slug || "";
        document.getElementById("status").value = page.status || "draft";
        document.getElementById("seo_title").value = page.seo_title || "";
        document.getElementById("seo_description").value = page.seo_description || "";
        document.getElementById("og_image_url").value = page.og_image_url || "";

    } catch (err) {
        console.error("Error loading page:", err);
        toast("Error cargando página", "error");
    }
}

function setupEventListeners() {
    const titleInput = document.getElementById("title");
    const slugInput = document.getElementById("slug");

    titleInput.addEventListener("input", () => {
        if (isNew || !slugInput.value) {
            slugInput.value = generateSlug(titleInput.value);
        }
    });

    document.getElementById("page-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await savePage();
    });
}

async function savePage() {
    const btn = document.getElementById("btn-save");
    const originalText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = "Guardando...";

        const data = {
            title: document.getElementById("title").value.trim(),
            slug: document.getElementById("slug").value.trim() || generateSlug(document.getElementById("title").value),
            status: document.getElementById("status").value,
            seo_title: document.getElementById("seo_title").value.trim() || null,
            seo_description: document.getElementById("seo_description").value.trim() || null,
            og_image_url: document.getElementById("og_image_url").value.trim() || null
        };

        if (isNew) {
            const result = await create("pages", data);
            toast("Página creada", "success");
            window.location.replace(`page-edit.html?id=${result.id}`);
        } else {
            await update("pages", pageId, data);
            toast("Página guardada", "success");
        }

    } catch (err) {
        console.error("Error saving page:", err);
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

init();
