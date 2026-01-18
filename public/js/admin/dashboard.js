// public/js/admin/dashboard.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initLayout, formatPrice, formatDate } from "./layout.js";
import { supabase } from "../supabaseClient.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    await initLayout();
    await loadStats();
    await loadRecentInquiries();
    await loadLowStockItems();
}

async function loadStats() {
    const store = getCurrentStore();

    try {
        // Products count
        const { count: productsCount } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("store_id", store.id)
            .eq("active", true);

        document.getElementById("stat-products").textContent = productsCount || 0;

        // Variants count
        const { count: variantsCount } = await supabase
            .from("variants")
            .select("*", { count: "exact", head: true })
            .eq("store_id", store.id)
            .eq("active", true);

        document.getElementById("stat-variants").textContent = variantsCount || 0;

        // Pending inquiries
        const { count: inquiriesCount } = await supabase
            .from("inquiries")
            .select("*", { count: "exact", head: true })
            .eq("store_id", store.id)
            .eq("status", "pending");

        document.getElementById("stat-inquiries").textContent = inquiriesCount || 0;

        // Low stock items
        const { data: lowStock } = await supabase
            .from("inventory")
            .select(`
        variant_id,
        stock_on_hand,
        low_stock_threshold,
        variants!inner(store_id)
      `)
            .eq("variants.store_id", store.id)
            .filter("stock_on_hand", "lte", "low_stock_threshold");

        document.getElementById("stat-low-stock").textContent = lowStock?.length || 0;

    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

async function loadRecentInquiries() {
    const store = getCurrentStore();
    const container = document.getElementById("recent-inquiries");

    try {
        const { data } = await supabase
            .from("inquiries")
            .select("id, code, customer_name, status, total, created_at")
            .eq("store_id", store.id)
            .order("created_at", { ascending: false })
            .limit(5);

        if (!data?.length) {
            container.innerHTML = `
        <div class="p-8 text-center text-gray-400">
          <p>No hay consultas aún</p>
        </div>
      `;
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

        container.innerHTML = data.map(inq => `
      <a href="inquiry-detail.html?id=${inq.id}" class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div>
          <div class="font-medium text-gray-900">${inq.customer_name || "Sin nombre"}</div>
          <div class="text-sm text-gray-500">${inq.code} · ${formatDate(inq.created_at)}</div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium">${formatPrice(inq.total, store.currency)}</span>
          <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColors[inq.status] || "bg-gray-100 text-gray-700"}">
            ${statusLabels[inq.status] || inq.status}
          </span>
        </div>
      </a>
    `).join("");

    } catch (err) {
        console.error("Error loading inquiries:", err);
        container.innerHTML = `<div class="p-4 text-red-500 text-sm">Error cargando consultas</div>`;
    }
}

async function loadLowStockItems() {
    const store = getCurrentStore();
    const container = document.getElementById("low-stock-items");

    try {
        const { data } = await supabase
            .from("inventory")
            .select(`
        variant_id,
        stock_on_hand,
        low_stock_threshold,
        variants!inner(
          id,
          sku,
          store_id,
          products(name)
        )
      `)
            .eq("variants.store_id", store.id)
            .order("stock_on_hand", { ascending: true })
            .limit(5);

        // Filter for low stock
        const lowStockItems = data?.filter(item =>
            item.stock_on_hand <= (item.low_stock_threshold || 5)
        ) || [];

        if (!lowStockItems.length) {
            container.innerHTML = `
        <div class="p-8 text-center text-gray-400">
          <p>No hay alertas de stock</p>
        </div>
      `;
            return;
        }

        container.innerHTML = lowStockItems.map(item => `
      <div class="flex items-center justify-between p-4 hover:bg-gray-50">
        <div>
          <div class="font-medium text-gray-900">${item.variants?.products?.name || "Producto"}</div>
          <div class="text-sm text-gray-500">SKU: ${item.variants?.sku || "—"}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-lg font-bold ${item.stock_on_hand === 0 ? "text-red-600" : "text-yellow-600"}">
            ${item.stock_on_hand}
          </span>
          <span class="text-sm text-gray-400">unidades</span>
        </div>
      </div>
    `).join("");

    } catch (err) {
        console.error("Error loading low stock:", err);
        container.innerHTML = `<div class="p-4 text-red-500 text-sm">Error cargando inventario</div>`;
    }
}

init();
