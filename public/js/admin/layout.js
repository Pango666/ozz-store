// public/js/admin/layout.js
// Cargador de layout (sidebar + topbar) para admin
import { getCurrentStore, getCurrentRole, adminLogout, getMyStores } from "./auth.js";

const SIDEBAR_URL = "/admin/partials/sidebar.html";
const TOPBAR_URL = "/admin/partials/topbar.html";

/**
 * Inyectar sidebar y topbar
 */
export async function initLayout() {
    await Promise.all([
        injectPartial("#admin-sidebar", SIDEBAR_URL),
        injectPartial("#admin-topbar", TOPBAR_URL)
    ]);

    // Configurar datos dinámicos
    setupSidebar();
    setupTopbar();
    highlightCurrentPage();
}

async function injectPartial(selector, url) {
    const el = document.querySelector(selector);
    if (!el) return;

    try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`Failed to load ${url}`);
        el.innerHTML = await res.text();
    } catch (err) {
        console.error(`Error loading partial ${url}:`, err);
        el.innerHTML = `<div class="p-4 text-red-500">Error cargando ${url}</div>`;
    }
}

function setupSidebar() {
    const store = getCurrentStore();
    const role = getCurrentRole();

    // Nombre de tienda
    const storeNameEl = document.getElementById("sidebar-store-name");
    if (storeNameEl && store) {
        storeNameEl.textContent = store.name;
    }

    // Rol
    const roleEl = document.getElementById("sidebar-role");
    if (roleEl && role) {
        const roleLabels = {
            owner: "Propietario",
            admin: "Administrador",
            editor: "Editor",
            viewer: "Solo lectura"
        };
        roleEl.textContent = roleLabels[role] || role;
    }

    // Logout button
    const logoutBtn = document.getElementById("btn-admin-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await adminLogout();
        });
    }
}

async function setupTopbar() {
    const store = getCurrentStore();

    // Breadcrumb - store name
    const breadcrumbStore = document.getElementById("breadcrumb-store");
    if (breadcrumbStore && store) {
        breadcrumbStore.textContent = store.name;
    }

    // Página actual
    const breadcrumbPage = document.getElementById("breadcrumb-page");
    if (breadcrumbPage) {
        const pageTitles = {
            "index.html": "Dashboard",
            "products.html": "Productos",
            "product-edit.html": "Editar Producto",
            "categories.html": "Categorías",
            "brands.html": "Marcas",
            "inventory.html": "Inventario",
            "inquiries.html": "Consultas",
            "inquiry-detail.html": "Detalle Consulta",
            "pages.html": "Páginas",
            "page-edit.html": "Editar Página",
            "settings.html": "Configuración",
            "options.html": "Opciones"
        };
        const currentPage = window.location.pathname.split("/").pop() || "index.html";
        breadcrumbPage.textContent = pageTitles[currentPage] || "Admin";
    }

    // Store selector (si hay múltiples tiendas)
    const stores = await getMyStores();
    const selectorContainer = document.getElementById("store-selector-container");

    if (selectorContainer && stores.length > 1) {
        selectorContainer.classList.remove("hidden");
        const selector = document.getElementById("store-selector");
        if (selector) {
            selector.innerHTML = stores.map(s =>
                `<option value="${s.id}" ${s.id === store?.id ? "selected" : ""}>${s.name}</option>`
            ).join("");

            selector.addEventListener("change", () => {
                localStorage.setItem("admin:current_store", selector.value);
                window.location.reload();
            });
        }
    }
}

function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll("#admin-sidebar a[href]");

    links.forEach(link => {
        const href = link.getAttribute("href");
        if (currentPath.endsWith(href) || (href === "index.html" && currentPath.endsWith("/admin/"))) {
            link.classList.add("bg-primary/10", "text-primary", "font-semibold");
            link.classList.remove("text-gray-600", "hover:bg-gray-100");
        }
    });
}

/**
 * Mostrar toast notification
 */
export function toast(message, type = "info") {
    const container = document.getElementById("toast-container") || createToastContainer();

    const colors = {
        success: "bg-green-500",
        error: "bg-red-500",
        warning: "bg-yellow-500",
        info: "bg-blue-500"
    };

    const toast = document.createElement("div");
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`;
    toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="ml-2 hover:opacity-80">×</button>
  `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2";
    document.body.appendChild(container);
    return container;
}

/**
 * Mostrar modal de confirmación
 */
export function confirm(message) {
    return new Promise((resolve) => {
        const modal = document.createElement("div");
        modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
        modal.innerHTML = `
      <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <p class="text-lg mb-6">${message}</p>
        <div class="flex justify-end gap-3">
          <button id="confirm-cancel" class="px-4 py-2 rounded-lg border hover:bg-gray-50">
            Cancelar
          </button>
          <button id="confirm-ok" class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">
            Confirmar
          </button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        modal.querySelector("#confirm-cancel").onclick = () => {
            modal.remove();
            resolve(false);
        };

        modal.querySelector("#confirm-ok").onclick = () => {
            modal.remove();
            resolve(true);
        };
    });
}

/**
 * Formatear precio
 */
export function formatPrice(amount, currency = "BOB") {
    const symbols = { BOB: "Bs", USD: "$", EUR: "€" };
    const num = Number(amount) || 0;
    return `${symbols[currency] || currency} ${num.toFixed(2)}`;
}

/**
 * Formatear fecha
 */
export function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-BO", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

/**
 * Escapar HTML
 */
export function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Aliases for compatibility
export const initAdminLayout = initLayout;
export const showToast = toast;
export const showConfirm = confirm;

export function setBreadcrumb(pageName) {
    const breadcrumbPage = document.getElementById("breadcrumb-page");
    if (breadcrumbPage) {
        breadcrumbPage.textContent = pageName;
    }
}
