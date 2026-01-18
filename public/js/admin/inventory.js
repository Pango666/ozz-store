// public/js/admin/inventory.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initAdminLayout, toast, escapeHtml } from "./layout.js";
import { supabase } from "../supabaseClient.js";

async function init() {
    const access = await requireAdmin();
    if (!access) return;

    await initAdminLayout(access);
    await loadInventory();
    setupEventListeners();
}

async function loadInventory() {
    const store = getCurrentStore();
    const table = document.getElementById("inventory-table");
    const filter = document.getElementById("filter-stock").value;

    try {
        const { data: variants, error } = await supabase
            .from("variants")
            .select(`
        id, sku, price, active,
        products(name),
        inventory(stock_on_hand, low_stock_threshold)
      `)
            .eq("store_id", store.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        let items = variants.map(v => ({
            variant_id: v.id,
            sku: v.sku,
            product_name: v.products?.name || "—",
            stock: v.inventory?.[0]?.stock_on_hand ?? 0,
            threshold: v.inventory?.[0]?.low_stock_threshold ?? 5,
            active: v.active
        }));

        // Calculate stats
        const zeroStock = items.filter(i => i.stock === 0).length;
        const lowStock = items.filter(i => i.stock > 0 && i.stock <= i.threshold).length;
        document.getElementById("stat-zero").textContent = zeroStock;
        document.getElementById("stat-low").textContent = lowStock;

        // Apply filter
        if (filter === "low") {
            items = items.filter(i => i.stock <= i.threshold && i.stock > 0);
        } else if (filter === "zero") {
            items = items.filter(i => i.stock === 0);
        }

        if (!items.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-20 text-center text-slate-400">
                        <div class="flex flex-col items-center">
                            <span class="material-symbols-outlined text-5xl mb-3 text-slate-200">check_circle</span>
                            <h3 class="text-lg font-medium text-slate-900">Todo en orden</h3>
                            <p class="text-sm mt-1">No hay items que coincidan con el filtro</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        table.innerHTML = items.map(item => {
            const isZero = item.stock === 0;
            const isLow = !isZero && item.stock <= item.threshold;

            let statusBadge = '';
            if (isZero) {
                statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                    <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>Sin Stock
                </span>`;
            } else if (isLow) {
                statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-amber-500"></span>Bajo
                </span>`;
            } else {
                statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                   <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-emerald-500"></span>OK
                </span>`;
            }

            return `
        <tr class="hover:bg-slate-50/80 transition-colors group">
          <td class="px-6 py-4">
             <div class="font-medium text-slate-900">${escapeHtml(item.product_name)}</div>
          </td>
          <td class="px-6 py-4 text-sm text-slate-500 font-mono">${escapeHtml(item.sku || "—")}</td>
          <td class="px-6 py-4 text-center">
            <span class="text-lg font-bold ${isZero ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-700"}">${item.stock}</span>
          </td>
          <td class="px-6 py-4 text-center text-sm text-slate-400 hidden sm:table-cell">${item.threshold}</td>
          <td class="px-6 py-4 text-center">
            ${statusBadge}
          </td>
          <td class="px-6 py-4 text-right">
            <button onclick="editStock('${item.variant_id}', ${item.stock}, ${item.threshold})" 
                class="px-3 py-1.5 text-sm font-medium text-primary bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              Ajustar
            </button>
          </td>
        </tr>
      `;
        }).join("");

    } catch (err) {
        console.error("Error loading inventory:", err);
        table.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500">Error: ${err.message}</td></tr>`;
    }
}

function setupEventListeners() {
    document.getElementById("filter-stock").addEventListener("change", loadInventory);

    document.getElementById("stock-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveStock();
    });
}

window.editStock = function (variantId, stock, threshold) {
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");

    document.getElementById("edit-variant-id").value = variantId;
    document.getElementById("edit-stock").value = stock;
    document.getElementById("edit-threshold").value = threshold;

    // Auto focus stock input
    setTimeout(() => document.getElementById("edit-stock").select(), 100);
};

window.closeModal = function () {
    document.getElementById("modal").classList.add("hidden");
};

async function saveStock() {
    const variantId = document.getElementById("edit-variant-id").value;
    const stock = parseInt(document.getElementById("edit-stock").value) || 0;
    const threshold = parseInt(document.getElementById("edit-threshold").value) || 5;

    const btn = document.querySelector("#stock-form button[type='submit']");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-lg">sync</span> Guardando...`;

    try {
        const { error } = await supabase
            .from("inventory")
            .upsert({
                variant_id: variantId,
                stock_on_hand: stock,
                low_stock_threshold: threshold,
                updated_at: new Date().toISOString()
            }, { onConflict: "variant_id" });

        if (error) throw error;

        toast("Stock actualizado", "success");
        closeModal();
        await loadInventory();
    } catch (err) {
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

init();
