// public/js/admin/products.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initAdminLayout, toast, confirm, formatPrice, escapeHtml } from "./layout.js";
import { getList, remove } from "./api.js";
import { supabase } from "../supabaseClient.js";

let currentPage = 1;
let totalPages = 1;
let categories = [];

async function init() {
  const access = await requireAdmin();
  if (!access) return;

  await initAdminLayout(access);
  await loadCategories();
  await loadProducts();
  setupEventListeners();
}

async function loadCategories() {
  const store = getCurrentStore();

  try {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", store.id)
      .eq("active", true)
      .order("name");

    categories = data || [];

    const select = document.getElementById("filter-category");
    select.innerHTML = `
      <option value="">Todas las categorías</option>
      ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
    `;
  } catch (err) {
    console.error("Error loading categories:", err);
  }
}

async function loadProducts() {
  const store = getCurrentStore();
  const table = document.getElementById("products-table");
  const search = document.getElementById("search").value.trim();
  const categoryId = document.getElementById("filter-category").value;
  const status = document.getElementById("filter-status").value;

  // Show loading state
  table.innerHTML = `
        <tr>
            <td colspan="6" class="px-6 py-20 text-center text-slate-400">
                <div class="flex flex-col items-center animate-pulse">
                    <span class="material-symbols-outlined text-4xl mb-3 opacity-30">inventory_2</span>
                    <p>Cargando productos...</p>
                </div>
            </td>
        </tr>`;

  try {
    const filters = {};
    if (categoryId) filters.category_id = categoryId;
    if (status !== "") filters.active = status === "true";

    const result = await getList("products", {
      page: currentPage,
      perPage: 20,
      orderBy: "updated_at",
      orderAsc: false,
      filters,
      search: search || null,
      searchColumns: ["name", "slug"],
      select: `
        id, name, slug, base_price, active, updated_at,
        categories(name),
        variants(count)
      `
    });

    totalPages = result.totalPages;
    updatePagination(result);

    if (!result.data.length) {
      table.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-20 text-center text-slate-400">
            <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-5xl mb-3 text-slate-200">search_off</span>
                <h3 class="text-lg font-medium text-slate-900">No se encontraron productos</h3>
                <p class="text-sm mt-1">Intenta con otros filtros o crea un producto nuevo</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = result.data.map(p => `
      <tr class="hover:bg-slate-50/80 transition-colors group">
        <td class="px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 border border-indigo-100">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <div>
              <div class="font-medium text-slate-900 line-clamp-1" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
              <div class="text-xs text-slate-500 font-mono">${escapeHtml(p.slug)}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">
          ${p.categories?.name ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">${escapeHtml(p.categories.name)}</span>` : '<span class="text-slate-400 italic">Sin cat.</span>'}
        </td>
        <td class="px-6 py-4 text-sm font-semibold text-slate-900">
          ${formatPrice(p.base_price, store.currency)}
        </td>
        <td class="px-6 py-4 text-center hidden sm:table-cell">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
             ${p.variants?.[0]?.count || 0} vars
          </span>
        </td>
        <td class="px-6 py-4 text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${p.active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-slate-100 text-slate-600 border-slate-200'
      }">
            <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${p.active ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
            ${p.active ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href="product-edit?id=${p.id}" 
                class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
              <span class="material-symbols-outlined text-xl">edit</span>
            </a>
            <button onclick="deleteProduct('${p.id}')" 
                class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
              <span class="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Error loading products:", err);
    table.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-red-500 bg-red-50">
          <p class="font-bold">Error cargando productos</p>
          <p class="text-sm">${err.message}</p>
        </td>
      </tr>
    `;
  }
}

function updatePagination(result) {
  const info = document.getElementById("pagination-info");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  const from = (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.total);

  info.textContent = result.total > 0
    ? `Mostrando ${from}-${to} de ${result.total} productos`
    : '0 productos';

  btnPrev.disabled = result.page <= 1;
  btnNext.disabled = result.page >= result.totalPages;
}

function setupEventListeners() {
  // Search with debounce
  let searchTimeout;
  document.getElementById("search").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadProducts();
    }, 300);
  });

  // Filters
  document.getElementById("filter-category").addEventListener("change", () => {
    currentPage = 1;
    loadProducts();
  });

  document.getElementById("filter-status").addEventListener("change", () => {
    currentPage = 1;
    loadProducts();
  });

  // Pagination
  document.getElementById("btn-prev").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadProducts();
    }
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadProducts();
    }
  });
}

// Global function for delete button
window.deleteProduct = async function (id) {
  const confirmed = await confirm("¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.");

  if (!confirmed) return;

  try {
    await remove("products", id);
    toast("Producto eliminado", "success");
    loadProducts();
  } catch (err) {
    toast("Error al eliminar: " + err.message, "error");
  }
};

init();
