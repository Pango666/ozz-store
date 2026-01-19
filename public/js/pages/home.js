// public/js/pages/home.js
import { supabase, STORE_SLUG, assertConfig } from "../supabaseClient.js";

function qs(sel) { return document.querySelector(sel); }
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[m]));
}

function moneyBOB(n) {
  if (n === null || n === undefined || n === "") return "Precio a consultar";
  const num = Number(n);
  if (Number.isNaN(num)) return "Precio a consultar";
  return `Bs ${num.toFixed(2)}`;
}

function isHtmlMode() {
  return window.location.pathname.endsWith(".html") || /\/index\.html$/i.test(window.location.pathname);
}

function pageHref(page, params = {}) {
  const base = isHtmlMode() ? `${page}.html` : `/${page}`;
  const u = new URL(base, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") return;
    u.searchParams.set(k, String(v));
  });
  return u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : "");
}

function productHref(slug) { return pageHref("product", { slug }); }
function shopHref(params = {}) { return pageHref("shop", params); }

function pickFirstImage(mediaArr) {
  const arr = Array.isArray(mediaArr) ? [...mediaArr] : [];
  arr.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return arr[0]?.url || "https://placehold.co/1200x1200?text=Producto";
}

function normalizeLinksForRouteMode() {
  if (isHtmlMode()) return;

  document.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href") || "";
    if (!href) return;

    if (/^(?:\.\/)?shop\.html\b/i.test(href)) {
      a.setAttribute("href", href.replace(/^(?:\.\/)?shop\.html/i, "/shop"));
    }
    if (/^(?:\.\/)?product\.html\b/i.test(href)) {
      a.setAttribute("href", href.replace(/^(?:\.\/)?product\.html/i, "/product"));
    }
    if (/^(?:\.\/)?index\.html\b/i.test(href)) {
      a.setAttribute("href", href.replace(/^(?:\.\/)?index\.html/i, "/"));
    }
  });
}

async function getStoreId() {
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", STORE_SLUG)
    .eq("active", true)
    .limit(1)
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Destacados reales:
 * 1) intenta featured=true
 * 2) si no existe/0 filas, intenta is_featured=true
 * 3) fallback: últimos activos
 * ✅ Also filters out products with inactive brand/category
 */
async function getFeaturedProducts(storeId, limit = 10) {
  // Get active brands and categories first for filtering
  const { data: activeBrands } = await supabase
    .from("brands")
    .select("id")
    .eq("store_id", storeId)
    .eq("active", true);

  const { data: activeCats } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", storeId)
    .eq("active", true);

  const activeBrandIds = new Set((activeBrands || []).map(b => b.id));
  const activeCatIds = new Set((activeCats || []).map(c => c.id));

  function filterByActive(products) {
    return (products || []).filter(p => {
      if (p.category_id && !activeCatIds.has(p.category_id)) return false;
      if (p.brand_id && !activeBrandIds.has(p.brand_id)) return false;
      return true;
    });
  }

  // 1) featured=true
  {
    const { data, error } = await supabase
      .from("products")
      .select(`id,slug,name,short_desc,base_price,created_at,category_id,brand_id,product_media(url,alt,sort)`)
      .eq("store_id", storeId)
      .eq("active", true)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(limit * 2); // fetch more in case some get filtered

    const filtered = filterByActive(data);
    if (!error && filtered.length) return filtered.slice(0, limit);
  }

  // 2) is_featured=true
  {
    const { data, error } = await supabase
      .from("products")
      .select(`id,slug,name,short_desc,base_price,created_at,category_id,brand_id,product_media(url,alt,sort)`)
      .eq("store_id", storeId)
      .eq("active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    const filtered = filterByActive(data);
    if (!error && filtered.length) return filtered.slice(0, limit);
  }

  // 3) fallback: últimos activos
  const { data, error } = await supabase
    .from("products")
    .select(`id,slug,name,short_desc,base_price,created_at,category_id,brand_id,product_media(url,alt,sort)`)
    .eq("store_id", storeId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (error) throw error;
  return filterByActive(data).slice(0, limit);
}

async function getBrands(storeId) {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, description, image")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

async function getHomeCategories(storeId, limit = 6) {
  // 1) Try featured categories first
  {
    const { data: featured, error } = await supabase
      .from("categories")
      .select("id,name,slug,description,icon,color_hex,sort")
      .eq("store_id", storeId)
      .eq("active", true)
      .eq("featured", true)
      .order("sort", { ascending: true })
      .limit(limit);

    if (!error && featured?.length) return featured;
  }

  // 2) Fallback: categories with products, sorted
  const { data: cats, error: e1 } = await supabase
    .from("categories")
    .select("id,name,slug,description,icon,color_hex,sort")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("sort", { ascending: true });
  if (e1) throw e1;

  const { data: prods, error: e2 } = await supabase
    .from("products")
    .select("category_id")
    .eq("store_id", storeId)
    .eq("active", true);
  if (e2) throw e2;

  const used = new Set((prods || []).map(x => x.category_id).filter(Boolean));
  return (cats || []).filter(c => used.has(c.id)).slice(0, limit);
}

function perView() {
  const w = window.innerWidth;
  if (w >= 1024) return 3;
  if (w >= 640) return 2;
  return 1;
}

function renderCategories(categories) {
  const root = qs("#home-categories-grid");
  if (!root) return;

  const defaultIcons = {
    'laptops': 'laptop', 'componentes': 'memory', 'perifericos': 'keyboard',
    'audio': 'headphones', 'monitores': 'desktop_windows', 'gaming': 'sports_esports',
    'placas': 'developer_board', 'motherboard': 'developer_board', 'base': 'developer_board',
    'procesadores': 'memory', 'cpu': 'memory', 'ram': 'memory',
    'almacenamiento': 'storage', 'storage': 'storage', 'ssd': 'storage',
    'fuentes': 'bolt', 'power': 'bolt', 'psu': 'bolt',
    'tarjetas': 'videocam', 'gpu': 'videocam', 'graficas': 'videocam'
  };

  // Check if icon is a valid Material Symbols name (lowercase, underscores, no URLs)
  function isValidMaterialIcon(icon) {
    if (!icon || typeof icon !== 'string') return false;
    // Reject URLs, HTML tags, or very short/weird strings
    if (icon.includes('://') || icon.includes('<') || icon.includes('>') || icon.length < 2) return false;
    // Reject if it contains spaces (Material Symbols use underscores, not spaces)
    if (icon.includes(' ')) return false;
    // Reject if it's all uppercase (likely "ALT" or placeholder text)
    if (icon === icon.toUpperCase() && icon.length <= 5) return false;
    return true;
  }

  function getIcon(cat) {
    if (cat.icon && isValidMaterialIcon(cat.icon)) return cat.icon;
    const slug = cat.slug?.toLowerCase() || '';
    for (const [key, icon] of Object.entries(defaultIcons)) {
      if (slug.includes(key)) return icon;
    }
    return 'category';
  }

  root.innerHTML = categories.map(c => {
    const color = c.color_hex || '#2563eb';
    const icon = getIcon(c);
    const desc = c.description ? c.description.slice(0, 50) + '...' : 'Ver productos';

    return `
      <a class="group block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300" 
         href="${escapeHtml(shopHref({ cats: c.slug }))}">
        <div class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style="background-color: ${color}15">
          <span class="material-symbols-outlined text-2xl" style="color: ${color}">${icon}</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">${escapeHtml(c.name)}</h3>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">${escapeHtml(desc)}</p>
        <div class="mt-4 flex items-center text-blue-600 text-sm font-medium">
          <span>Explorar</span>
          <span class="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
      </a>
    `;
  }).join("");
}

/**
 * ✅ Pinta DESTACADOS EN TU MISMO APARTADO:
 * - Usa el div existente: #home-loading-grid
 * - Oculta #home-loading-hint
 * - Reemplaza skeleton por carrusel real
 */
function renderFeaturedCarousel(products) {
  const container = qs("#home-loading-grid");     // <- tu HTML ya lo tiene
  const hint = qs("#home-loading-hint");
  const errBox = qs("#home-error");
  if (!container) return;

  if (hint) hint.classList.add("hidden");
  if (errBox) errBox.classList.add("hidden");

  // crea contador arriba (sin tocar HTML)
  let countEl = qs("#home-featured-count");
  if (!countEl) {
    countEl = document.createElement("div");
    countEl.id = "home-featured-count";
    countEl.className = "text-center text-sm text-gray-600 dark:text-gray-400 -mt-6 mb-6";
    container.parentElement?.insertBefore(countEl, container);
  }

  if (!products || products.length === 0) {
    countEl.textContent = "No hay productos destacados todavía.";
    container.className = "mt-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 text-sm text-gray-600 dark:text-gray-300";
    container.innerHTML = `Marca algunos productos como <b>featured</b> (o <b>is_featured</b>) para que aparezcan aquí.`;
    return;
  }

  countEl.textContent = `Mostrando ${products.length} productos`;
  container.className = "relative"; // quitamos el grid del skeleton para que el carrusel funcione

  const slides = products.map(p => {
    const img = pickFirstImage(p.product_media);
    return `
      <div class="shrink-0 px-2" data-slide>
        <a class="product-card group block h-full" href="${escapeHtml(productHref(p.slug))}">
          <div class="aspect-[4/3] bg-gray-100 overflow-hidden">
            <img class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                 src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}">
          </div>
          <div class="p-4">
            <div class="text-primary font-black">${escapeHtml(moneyBOB(p.base_price))}</div>
            <div class="mt-2 font-black line-clamp-2">${escapeHtml(p.name)}</div>
            ${p.short_desc ? `<div class="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">${escapeHtml(p.short_desc)}</div>` : ""}
            <div class="mt-3 text-xs font-black uppercase tracking-[0.2em] text-primary">Ver detalles</div>
          </div>
        </a>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="relative">
      <button type="button"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-white dark:bg-[#111118]
               border border-gray-200 dark:border-white/10 shadow flex items-center justify-center"
        data-prev aria-label="Anterior">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>

      <div class="overflow-hidden">
        <div class="flex transition-transform duration-500 ease-out" data-track>
          ${slides}
        </div>
      </div>

      <button type="button"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-white dark:bg-[#111118]
               border border-gray-200 dark:border-white/10 shadow flex items-center justify-center"
        data-next aria-label="Siguiente">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  `;

  const track = container.querySelector("[data-track]");
  const prev = container.querySelector("[data-prev]");
  const next = container.querySelector("[data-next]");
  const slideEls = [...container.querySelectorAll("[data-slide]")];

  let page = 0;

  function pages() {
    return Math.max(1, Math.ceil(slideEls.length / perView()));
  }

  function layout() {
    const pv = perView();
    const w = 100 / pv;

    slideEls.forEach(el => {
      el.style.width = `${w}%`;
      el.style.flexBasis = `${w}%`;
    });

    const max = pages() - 1;
    if (page > max) page = max;
    update();
  }

  function update() {
    track.style.transform = `translateX(-${page * 100}%)`;
  }

  prev?.addEventListener("click", () => {
    page = (page - 1 + pages()) % pages();
    update();
  });

  next?.addEventListener("click", () => {
    page = (page + 1) % pages();
    update();
  });

  window.addEventListener("resize", layout);
  layout();
}

/**
 * Renderiza Carrusel de Marcas (similar al de productos)
 */
function renderBrandsCarousel(brands) {
  const container = qs("#home-brands-container");
  if (!container) return;

  if (!brands || brands.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-400 py-8">No hay marcas configuradas.</div>`;
    return;
  }

  // Predefined colors for brands without images
  const palette = [
    { bg: ['from-red-500/10', 'to-orange-500/10'], text: 'text-red-500' },
    { bg: ['from-blue-500/10', 'to-cyan-500/10'], text: 'text-blue-500' },
    { bg: ['from-green-500/10', 'to-emerald-500/10'], text: 'text-green-500' },
    { bg: ['from-purple-500/10', 'to-pink-500/10'], text: 'text-purple-500' },
    { bg: ['from-yellow-500/10', 'to-amber-500/10'], text: 'text-yellow-600' },
  ];

  function getColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  const slides = brands.map(b => {
    let content = "";
    if (b.image) {
      content = `<img src="${escapeHtml(b.image)}" class="max-h-16 w-auto object-contain group-hover:scale-110 transition-transform duration-300" alt="${escapeHtml(b.name)}">`;
    } else {
      const c = getColor(b.name || "?");
      content = `
        <div class="flex flex-col items-center space-y-3">
          <div class="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br ${c.bg[0]} ${c.bg[1]} group-hover:scale-110 transition-transform">
             <div class="text-xl font-bold ${c.text}">${escapeHtml((b.name || "").substring(0, 4).toUpperCase())}</div>
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${escapeHtml(b.name)}</span>
        </div>
      `;
    }

    return `
      <div class="shrink-0 px-2 flex justify-center" data-slide>
        <a href="${escapeHtml(shopHref({ brand: b.slug }))}" class="brand-card group w-full h-full flex items-center justify-center min-h-[120px]">
           ${content}
        </a>
      </div>
    `;
  }).join("");

  // Reusing the carousel structure
  container.innerHTML = `
    <div class="relative">
      <button type="button" class="absolute -left-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-white dark:bg-[#111118] border border-gray-200 dark:border-white/10 shadow flex items-center justify-center opacity-75 hover:opacity-100" data-prev>
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <div class="overflow-hidden">
        <div class="flex transition-transform duration-500 ease-out" data-track>
            ${slides}
        </div>
      </div>
      <button type="button" class="absolute -right-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-white dark:bg-[#111118] border border-gray-200 dark:border-white/10 shadow flex items-center justify-center opacity-75 hover:opacity-100" data-next>
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  `;

  // Init Carousel Logic (Simplified for Brands)
  const track = container.querySelector("[data-track]");
  const prev = container.querySelector("[data-prev]");
  const next = container.querySelector("[data-next]");
  const slideEls = [...container.querySelectorAll("[data-slide]")];

  // Custom perView for brands (smaller items = more visible)
  function brandPerView() {
    const w = window.innerWidth;
    if (w >= 1280) return 6;
    if (w >= 1024) return 5;
    if (w >= 768) return 4;
    if (w >= 640) return 3;
    return 2;
  }

  let page = 0;
  function pages() { return Math.max(1, Math.ceil(slideEls.length / brandPerView())); }

  function layout() {
    const pv = brandPerView();
    const w = 100 / pv;
    slideEls.forEach(el => { el.style.width = `${w}%`; el.style.flexBasis = `${w}%`; });
    if (page >= pages()) page = pages() - 1;
    update();
  }
  function update() { track.style.transform = `translateX(-${page * 100}%)`; }

  prev.addEventListener("click", () => { page = (page - 1 + pages()) % pages(); update(); });
  next.addEventListener("click", () => { page = (page + 1) % pages(); update(); });
  window.addEventListener("resize", layout);
  layout();
}

async function main() {
  normalizeLinksForRouteMode();

  try { assertConfig(); } catch (e) {
    console.error(e);
    const errBox = qs("#home-error");
    if (errBox) {
      errBox.classList.remove("hidden");
      errBox.textContent = "Falta configurar Supabase (env.js).";
    }
    return;
  }

  try {
    const storeId = await getStoreId();

    const cats = await getHomeCategories(storeId, 6);
    renderCategories(cats);

    const featured = await getFeaturedProducts(storeId, 10);
    renderFeaturedCarousel(featured);

    const brands = await getBrands(storeId);
    renderBrandsCarousel(brands);
  } catch (e) {
    console.error(e);
    const errBox = qs("#home-error");
    if (errBox) {
      errBox.classList.remove("hidden");
      errBox.textContent = `Error cargando destacados (mira consola F12).`;
    }
  }
}

document.addEventListener("DOMContentLoaded", main);
