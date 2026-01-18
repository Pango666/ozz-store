// public/js/admin/inquiries.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initLayout, toast, formatPrice, formatDate, escapeHtml } from "./layout.js";
import { getList, update } from "./api.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;
    await initLayout();
    await loadInquiries();
    setupEventListeners();
}

async function loadInquiries() {
    const table = document.getElementById("inquiries-table");
    const status = document.getElementById("filter-status").value;
    const store = getCurrentStore();

    try {
        const filters = {};
        if (status) filters.status = status;

        const result = await getList("inquiries", {
            perPage: 50,
            orderBy: "created_at",
            orderAsc: false,
            filters
        });

        if (!result.data.length) {
            table.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No hay consultas</td></tr>`;
            return;
        }

        const statusColors = {
            pending: "bg-yellow-100 text-yellow-700",
            confirmed: "bg-blue-100 text-blue-700",
            completed: "bg-green-100 text-green-700",
            cancelled: "bg-red-100 text-red-700"
        };

        const statusLabels = {
            pending: "Pendiente",
            confirmed: "Confirmado",
            completed: "Completado",
            cancelled: "Cancelado"
        };

        table.innerHTML = result.data.map(inq => `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 font-mono text-sm">${escapeHtml(inq.code)}</td>
        <td class="px-4 py-3 font-medium">${escapeHtml(inq.customer_name || "—")}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(inq.phone || "—")}</td>
        <td class="px-4 py-3 font-medium">${formatPrice(inq.total, store.currency)}</td>
        <td class="px-4 py-3">
          <select onchange="updateStatus('${inq.id}', this.value)" class="text-xs px-2 py-1 rounded border ${statusColors[inq.status] || ''}">
            ${Object.entries(statusLabels).map(([value, label]) =>
            `<option value="${value}" ${inq.status === value ? 'selected' : ''}>${label}</option>`
        ).join('')}
          </select>
        </td>
        <td class="px-4 py-3 text-sm text-gray-500">${formatDate(inq.created_at)}</td>
        <td class="px-4 py-3 text-right">
          <a href="inquiry-detail.html?id=${inq.id}" class="text-primary hover:underline text-sm">Ver detalle</a>
        </td>
      </tr>
    `).join("");

    } catch (err) {
        console.error("Error loading inquiries:", err);
        table.innerHTML = `<tr><td colspan="7" class="px-4 py-4 text-red-500">Error: ${err.message}</td></tr>`;
    }
}

function setupEventListeners() {
    document.getElementById("filter-status").addEventListener("change", loadInquiries);
}

window.updateStatus = async function (id, status) {
    try {
        await update("inquiries", id, { status });
        toast("Estado actualizado", "success");
    } catch (err) {
        toast("Error: " + err.message, "error");
        loadInquiries();
    }
};

init();
