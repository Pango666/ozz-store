// public/js/admin/inquiry-detail.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initLayout, formatPrice, formatDate, escapeHtml } from "./layout.js";
import { getById } from "./api.js";
import { supabase } from "../supabaseClient.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;
    await initLayout();

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        window.location.replace("inquiries.html");
        return;
    }

    await loadInquiry(id);
}

async function loadInquiry(id) {
    const store = getCurrentStore();

    try {
        const inquiry = await getById("inquiries", id);

        // Status badges
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

        document.getElementById("inq-code").textContent = inquiry.code;
        document.getElementById("inq-status").innerHTML = `
      <span class="px-2 py-1 text-xs font-medium rounded ${statusColors[inquiry.status] || ''}">
        ${statusLabels[inquiry.status] || inquiry.status}
      </span>
    `;
        document.getElementById("inq-customer").textContent = inquiry.customer_name || "—";
        document.getElementById("inq-phone").textContent = inquiry.phone || "—";
        document.getElementById("inq-notes").textContent = inquiry.notes || "Sin notas";
        document.getElementById("inq-date").textContent = formatDate(inquiry.created_at);
        document.getElementById("inq-total").textContent = formatPrice(inquiry.total, store.currency);

        // WhatsApp button
        if (inquiry.phone) {
            const phone = inquiry.phone.replace(/\D/g, "");
            const message = encodeURIComponent(`Hola ${inquiry.customer_name || ""}, respecto a tu consulta ${inquiry.code}...`);
            document.getElementById("btn-whatsapp").href = `https://wa.me/${phone}?text=${message}`;
        }

        // Load items
        await loadItems(id);

    } catch (err) {
        console.error("Error loading inquiry:", err);
    }
}

async function loadItems(inquiryId) {
    const store = getCurrentStore();
    const container = document.getElementById("inq-items");

    try {
        const { data: items, error } = await supabase
            .from("inquiry_items")
            .select(`
        id, qty, unit_price, line_total,
        variants(sku, products(name))
      `)
            .eq("inquiry_id", inquiryId);

        if (error) throw error;

        if (!items?.length) {
            container.innerHTML = `<p class="text-gray-400">No hay productos</p>`;
            return;
        }

        container.innerHTML = items.map(item => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <div class="font-medium">${escapeHtml(item.variants?.products?.name || "Producto")}</div>
          <div class="text-sm text-gray-500">SKU: ${escapeHtml(item.variants?.sku || "—")}</div>
        </div>
        <div class="text-right">
          <div class="font-medium">${formatPrice(item.line_total, store.currency)}</div>
          <div class="text-sm text-gray-500">${item.qty} × ${formatPrice(item.unit_price, store.currency)}</div>
        </div>
      </div>
    `).join("");

    } catch (err) {
        console.error("Error loading items:", err);
        container.innerHTML = `<p class="text-red-500">Error cargando items</p>`;
    }
}

init();
