// public/js/admin/pages.js
import { requireAdmin } from "./auth.js";
import { initLayout, toast, confirm, formatDate, escapeHtml } from "./layout.js";
import { getList, remove } from "./api.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;
    await initLayout();
    await loadPages();
}

async function loadPages() {
    const container = document.getElementById("pages-list");

    try {
        const result = await getList("pages", {
            perPage: 50,
            orderBy: "updated_at",
            orderAsc: false
        });

        if (!result.data.length) {
            container.innerHTML = `<div class="p-8 text-center text-gray-400">No hay páginas</div>`;
            return;
        }

        const statusColors = {
            published: "bg-green-100 text-green-700",
            draft: "bg-gray-100 text-gray-600"
        };

        container.innerHTML = result.data.map(p => `
      <div class="flex items-center justify-between p-4 hover:bg-gray-50">
        <div>
          <div class="font-medium">${escapeHtml(p.title)}</div>
          <div class="text-sm text-gray-500">/${p.slug} · ${formatDate(p.updated_at)}</div>
        </div>
        <div class="flex items-center gap-4">
          <span class="px-2 py-0.5 text-xs rounded ${statusColors[p.status] || 'bg-gray-100'}">
            ${p.status === 'published' ? 'Publicada' : 'Borrador'}
          </span>
          <div class="flex gap-2">
            <a href="page-edit.html?id=${p.id}" class="text-primary hover:underline text-sm">Editar</a>
            <button onclick="deletePage('${p.id}')" class="text-red-500 hover:underline text-sm">Eliminar</button>
          </div>
        </div>
      </div>
    `).join("");

    } catch (err) {
        console.error("Error loading pages:", err);
        container.innerHTML = `<div class="p-4 text-red-500">Error: ${err.message}</div>`;
    }
}

window.deletePage = async function (id) {
    if (!await confirm("¿Eliminar esta página?")) return;

    try {
        await remove("pages", id);
        toast("Página eliminada", "success");
        await loadPages();
    } catch (err) {
        toast("Error: " + err.message, "error");
    }
};

init();
