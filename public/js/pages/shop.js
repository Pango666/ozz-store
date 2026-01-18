// public/js/pages/shop.js
import { supabase, STORE_SLUG, assertConfig } from "../supabaseClient.js";
assertConfig();

function qs(sel) { return document.querySelector(sel); }
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}
function moneyBOB(n) {
  if (n === null || n === undefined || n === "") return "Precio a consultar";
  const num = Number(n);
  if (Number.isNaN(num)) return "Precio a consultar";
  return `Bs ${num.toFixed(2)}`;
}
function isHtmlMode() {
  return window.location.pathname.endsWith(".html");
}
function productHref(slug) {
  return isHtmlMode()
    ? `product.html?slug=${encodeURIComponent(slug)}`
    : `/product?slug=${encodeURIComponent(slug)}`;
}
function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}
function setParam(name, value) {
  const u = new URL(window.location.href);
  if (!value) u.searchParams.delete(name);
  else u.searchParams.set(name, value);
  window.history.replaceState({}, "", u.toString());
}
function getFirstImage(p) {
  const arr = Array.isArray(p.product_media) ? [...p.product_media] : [];
  arr.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return arr[0]?.url || "https://placehold.co/900x900?text=Producto";
}

// -------------------- state --------------------
let storeId = null;

let categories = [];
let brands = [];

let allProducts = [];      // productos del store (filtrados solo por search)
let baseProducts = [];     // allProducts filtrados por cats + brands (sin facets)
let filteredProducts = []; // baseProducts filtrados por facets + sort

let facets = [];               // [{ group:{id,name,input_type}, values:[...] }]
let variants = [];
let variantGroups = new Map(); // variant_id -> Map(group_id -> option_value_id)

// selected facets: group_id -> Set(option_value_id)
let selected = {};

// filtros principales
const state = {
  q: "",
  cats: new Set(),     // category slug(s)
  brands: new Set(),   // brand slug(s)
  sort: "latest",
};

// -------------------- queries --------------------
async function getStoreId() {
  const { data, error } = await supabase
    .from("stores")
    .select("id,slug")
    .eq("slug", STORE_SLUG)
    .eq("active", true)
    .limit(1)
    .single();
  if (error) throw error;
  return data.id;
}

async function loadCategories() {
  const { data: cats, error: e1 } = await supabase
    .from("categories")
    .select("id,name,slug,sort,active")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("sort", { ascending: true });
  if (e1) throw e1;

  // Solo categorías que tengan productos activos (SIN exigir precio)
  const { data: prods, error: e2 } = await supabase
    .from("products")
    .select("category_id")
    .eq("store_id", storeId)
    .eq("active", true);
  if (e2) throw e2;

  const used = new Set((prods || []).map(x => x.category_id).filter(Boolean));
  categories = (cats || []).filter(c => used.has(c.id));
}

async function loadBrands() {
  // ✅ TU TABLA brands NO tiene sort -> ordenamos por name
  const { data: brs, error } = await supabase
    .from("brands")
    .select("id,name,slug,active")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;

  // Solo marcas que tengan productos activos (SIN exigir precio)
  const { data: prods, error: e2 } = await supabase
    .from("products")
    .select("brand_id")
    .eq("store_id", storeId)
    .eq("active", true);
  if (e2) throw e2;

  const used = new Set((prods || []).map(x => x.brand_id).filter(Boolean));
  brands = (brs || []).filter(b => used.has(b.id));
}

async function loadProducts() {
  // 🔥 NO filtramos por cats/brands en DB -> lo hacemos en cliente
  // para poder mostrar contadores por filtro correctamente.
  let q = supabase
    .from("products")
    .select("id,name,slug,short_desc,base_price,created_at,category_id,brand_id,product_media(url,alt,sort)")
    .eq("store_id", storeId)
    .eq("active", true);

  if (state.q) {
    q = q.or(`name.ilike.%${state.q}%,slug.ilike.%${state.q}%`);
  }

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  allProducts = data || [];
}

async function loadVariantFacets(productIds) {
  facets = [];
  variants = [];
  variantGroups = new Map();
  selected = {}; // reset subfiltros al cambiar cat/brand/busqueda

  if (!productIds.length) return;

  const { data: vars, error: e1 } = await supabase
    .from("variants")
    .select("id,product_id,sku,price,active")
    .eq("store_id", storeId)
    .eq("active", true)
    .in("product_id", productIds);
  if (e1) throw e1;

  variants = vars || [];
  const variantIds = variants.map(v => v.id);
  if (!variantIds.length) return;

  const { data: piv, error: e2 } = await supabase
    .from("variant_option_values")
    .select("variant_id, option_value_id")
    .in("variant_id", variantIds);
  if (e2) throw e2;

  const optionValueIds = [...new Set((piv || []).map(x => x.option_value_id))];
  if (!optionValueIds.length) return;

  const { data: ovs, error: e3 } = await supabase
    .from("option_values")
    .select(`
      id, label, value, color_hex, sort, option_group_id,
      option_group:option_groups ( id, name, slug, input_type )
    `)
    .in("id", optionValueIds);
  if (e3) throw e3;

  const ovMap = new Map();
  const groupMap = new Map(); // group_id -> { group, values: Map(ov_id -> ov) }

  for (const ov of (ovs || [])) {
    ovMap.set(ov.id, ov);
    const g = ov.option_group;
    const gId = g?.id || ov.option_group_id;
    if (!gId) continue;
    if (!groupMap.has(gId)) groupMap.set(gId, { group: g, values: new Map() });
    groupMap.get(gId).values.set(ov.id, ov);
  }

  for (const row of (piv || [])) {
    const ov = ovMap.get(row.option_value_id);
    const gId = ov?.option_group?.id || ov?.option_group_id;
    if (!gId) continue;

    if (!variantGroups.has(row.variant_id)) variantGroups.set(row.variant_id, new Map());
    variantGroups.get(row.variant_id).set(gId, row.option_value_id);
  }

  facets = [...groupMap.values()].map(x => ({
    group: x.group,
    values: [...x.values.values()].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
  }));
}

// -------------------- filtering --------------------
function filterByCatsBrands(list) {
  let out = list;

  if (state.cats.size > 0) {
    const catIds = new Set(
      categories.filter(c => state.cats.has(c.slug)).map(c => c.id)
    );
    out = out.filter(p => p.category_id && catIds.has(p.category_id));
  }

  if (state.brands.size > 0) {
    const brandIds = new Set(
      brands.filter(b => state.brands.has(b.slug)).map(b => b.id)
    );
    out = out.filter(p => p.brand_id && brandIds.has(p.brand_id));
  }

  return out;
}

// ✅ SOLO grupos con size>0 cuentan como “activos”
function activeSelectedGroups() {
  return Object.entries(selected)
    .filter(([_, set]) => set && set.size > 0)
    .map(([gid]) => gid);
}

// AND entre grupos, OR dentro del grupo
function productMatchesSelected(productId) {
  const groupsSelected = activeSelectedGroups();
  if (!groupsSelected.length) return true;

  const vars = variants.filter(v => v.product_id === productId);
  if (!vars.length) return false;

  for (const v of vars) {
    const gmap = variantGroups.get(v.id) || new Map();
    let ok = true;

    for (const gid of groupsSelected) {
      const needed = selected[gid];
      const variantOv = gmap.get(gid);
      if (!variantOv || !needed.has(variantOv)) { ok = false; break; }
    }

    if (ok) return true;
  }
  return false;
}

function applySort(list) {
  const s = state.sort;

  if (s === "latest") {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return;
  }

  if (s === "price_asc") {
    list.sort((a, b) => {
      const av = (a.base_price == null) ? Number.POSITIVE_INFINITY : Number(a.base_price);
      const bv = (b.base_price == null) ? Number.POSITIVE_INFINITY : Number(b.base_price);
      return av - bv;
    });
    return;
  }

  if (s === "price_desc") {
    list.sort((a, b) => {
      const av = (a.base_price == null) ? Number.NEGATIVE_INFINITY : Number(a.base_price);
      const bv = (b.base_price == null) ? Number.NEGATIVE_INFINITY : Number(b.base_price);
      return bv - av;
    });
    return;
  }

  if (s === "name_asc") {
    list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
    return;
  }

  if (s === "name_desc") {
    list.sort((a, b) => String(b.name || "").localeCompare(String(a.name || ""), "es"));
    return;
  }
}

function rebuildFiltered() {
  // baseProducts ya viene filtrado por cats+brands
  filteredProducts = baseProducts.filter(p => productMatchesSelected(p.id));
  applySort(filteredProducts);
}

// -------------------- render helpers --------------------
function setProductCounters() {
  const badge = qs("#product-count");
  const showing = qs("#showing-text");

  if (badge) badge.textContent = `${filteredProducts.length} productos`;
  if (showing) showing.textContent = `Mostrando ${filteredProducts.length} productos`;
}

function countsByCategory(list) {
  const map = new Map();
  for (const p of list) {
    if (!p.category_id) continue;
    map.set(p.category_id, (map.get(p.category_id) || 0) + 1);
  }
  return map;
}

function countsByBrand(list) {
  const map = new Map();
  for (const p of list) {
    if (!p.brand_id) continue;
    map.set(p.brand_id, (map.get(p.brand_id) || 0) + 1);
  }
  return map;
}

// -------------------- render --------------------
function renderCategories() {
  const root = qs("#category-filters");
  if (!root) return;

  // para contadores: respeta búsqueda + marcas (pero no categorías)
  const forCounts = filterByCatsBrands(allProducts).filter(p => {
    // quitamos cats para que el conteo de cats tenga sentido
    if (state.cats.size === 0) return true;
    return true;
  });
  // en realidad: si hay cats seleccionadas, igual queremos mostrar conteos del universo actual por marcas + búsqueda
  // y que el usuario entienda cuánto hay en cada cat (sin aplicar cats). Entonces:
  const listCounts = state.brands.size > 0 ? filterByCatsBrands(allProducts) : allProducts;
  const catCount = countsByCategory(listCounts);

  const allChecked = (state.cats.size === 0);

  const items = [];
  items.push(`
    <label class="flex items-center justify-between gap-3 cursor-pointer">
      <span class="flex items-center gap-3">
        <input type="checkbox" data-cat="__ALL__"
          class="rounded border-[#dbdbe6] text-primary focus:ring-primary/20"
          ${allChecked ? "checked" : ""}>
        <span class="text-sm text-[#616189]">Todas</span>
      </span>
      <span class="text-xs text-[#9aa0b4]">${listCounts.length}</span>
    </label>
  `);

  for (const c of categories) {
    const checked = state.cats.has(c.slug);
    const count = catCount.get(c.id) || 0;

    items.push(`
      <label class="flex items-center justify-between gap-3 cursor-pointer">
        <span class="flex items-center gap-3">
          <input type="checkbox" data-cat="${escapeHtml(c.slug)}"
            class="rounded border-[#dbdbe6] text-primary focus:ring-primary/20"
            ${checked ? "checked" : ""}>
          <span class="text-sm text-[#616189]">${escapeHtml(c.name)}</span>
        </span>
        <span class="text-xs text-[#9aa0b4]">${count}</span>
      </label>
    `);
  }

  root.innerHTML = items.join("");

  root.querySelectorAll("input[type=checkbox][data-cat]").forEach(ch => {
    ch.addEventListener("change", async (e) => {
      const slug = e.target.getAttribute("data-cat");

      if (slug === "__ALL__") {
        state.cats.clear();
      } else {
        if (e.target.checked) state.cats.add(slug);
        else state.cats.delete(slug);
      }

      setParam("cats", [...state.cats].join(","));
      // al cambiar cats => recargar facets desde baseProducts
      await refreshBaseAndFacets();
    });
  });
}

function renderBrands() {
  const root = qs("#brand-filters");
  if (!root) return;

  // conteo por marca respetando búsqueda + categorías (pero no marcas)
  const listCounts = state.cats.size > 0 ? filterByCatsBrands(allProducts) : allProducts;
  // como filterByCatsBrands usa brands también, temporalmente calculemos counts sin brands:
  const listNoBrand = (state.cats.size > 0)
    ? allProducts.filter(p => {
        const catIds = new Set(categories.filter(c => state.cats.has(c.slug)).map(c => c.id));
        return p.category_id && catIds.has(p.category_id);
      })
    : allProducts;

  const brandCount = countsByBrand(listNoBrand);
  const allChecked = (state.brands.size === 0);

  const items = [];
  items.push(`
    <label class="flex items-center justify-between gap-3 cursor-pointer">
      <span class="flex items-center gap-3">
        <input type="checkbox" data-brand="__ALL__"
          class="rounded border-[#dbdbe6] text-primary focus:ring-primary/20"
          ${allChecked ? "checked" : ""}>
        <span class="text-sm text-[#616189]">Todas</span>
      </span>
      <span class="text-xs text-[#9aa0b4]">${listNoBrand.length}</span>
    </label>
  `);

  for (const b of brands) {
    const checked = state.brands.has(b.slug);
    const count = brandCount.get(b.id) || 0;

    items.push(`
      <label class="flex items-center justify-between gap-3 cursor-pointer">
        <span class="flex items-center gap-3">
          <input type="checkbox" data-brand="${escapeHtml(b.slug)}"
            class="rounded border-[#dbdbe6] text-primary focus:ring-primary/20"
            ${checked ? "checked" : ""}>
          <span class="text-sm text-[#616189]">${escapeHtml(b.name)}</span>
        </span>
        <span class="text-xs text-[#9aa0b4]">${count}</span>
      </label>
    `);
  }

  root.innerHTML = items.join("");

  root.querySelectorAll("input[type=checkbox][data-brand]").forEach(ch => {
    ch.addEventListener("change", async (e) => {
      const slug = e.target.getAttribute("data-brand");

      if (slug === "__ALL__") {
        state.brands.clear();
      } else {
        if (e.target.checked) state.brands.add(slug);
        else state.brands.delete(slug);
      }

      // soporta brands= (multi) y también mantiene brand= (single) si venía del home
      const brandsStr = [...state.brands].join(",");
      setParam("brands", brandsStr);
      if (state.brands.size === 1) setParam("brand", [...state.brands][0]);
      else setParam("brand", "");

      await refreshBaseAndFacets();
    });
  });
}

function renderFacets() {
  const wrap = qs("#spec-facets-wrap");
  const root = qs("#spec-facets");
  if (!wrap || !root) return;

  if (!facets.length) {
    wrap.classList.add("hidden");
    root.innerHTML = "";
    return;
  }

  wrap.classList.remove("hidden");
  root.innerHTML = "";

  for (const f of facets) {
    const g = f.group;
    const gId = g?.id;
    if (!gId) continue;

    const block = document.createElement("div");
    block.className = "space-y-3";
    block.innerHTML = `
      <h5 class="text-xs font-black uppercase tracking-[0.2em] text-[#616189]">${escapeHtml(g.name || "Filtro")}</h5>
      <div class="space-y-2" data-group="${escapeHtml(gId)}"></div>
    `;

    const list = block.querySelector("[data-group]");

    for (const ov of f.values) {
      const checked = !!(selected[gId] && selected[gId].has(ov.id));
      const id = `facet_${gId}_${ov.id}`;

      const row = document.createElement("label");
      row.className = "flex items-center gap-3 cursor-pointer";
      row.innerHTML = `
        <input id="${id}" type="checkbox"
          class="rounded border-[#dbdbe6] text-primary focus:ring-primary/20"
          ${checked ? "checked" : ""} />
        <span class="text-sm text-[#616189]">${escapeHtml(ov.label)}</span>
      `;

      row.querySelector("input").addEventListener("change", (e) => {
        if (!selected[gId]) selected[gId] = new Set();

        if (e.target.checked) selected[gId].add(ov.id);
        else selected[gId].delete(ov.id);

        if (selected[gId].size === 0) delete selected[gId];

        renderActiveFilters();
        rebuildFiltered();
        renderProducts();
      });

      list.appendChild(row);
    }

    root.appendChild(block);
  }
}

function renderActiveFilters() {
  const root = qs("#active-filters");
  const btnClear = qs("#clear-all");
  if (!root) return;

  const pills = [];

  // categorías
  for (const slug of state.cats) {
    const cat = categories.find(c => c.slug === slug);
    if (!cat) continue;
    pills.push(`
      <button data-clear="cat" data-slug="${escapeHtml(slug)}"
        class="px-3 py-1 rounded-full bg-primary text-white text-xs font-black flex items-center gap-2">
        ${escapeHtml(cat.name)} <span class="opacity-80">×</span>
      </button>
    `);
  }

  // marcas
  for (const slug of state.brands) {
    const br = brands.find(b => b.slug === slug);
    if (!br) continue;
    pills.push(`
      <button data-clear="brand" data-slug="${escapeHtml(slug)}"
        class="px-3 py-1 rounded-full bg-[#111118] text-white text-xs font-black flex items-center gap-2">
        ${escapeHtml(br.name)} <span class="opacity-80">×</span>
      </button>
    `);
  }

  // facets
  for (const [gid, set] of Object.entries(selected)) {
    if (!set || set.size === 0) continue;

    const g = facets.find(x => String(x.group?.id) === String(gid))?.group;
    const gName = g?.name || "Filtro";

    for (const ovId of set) {
      const ov = facets.flatMap(x => x.values).find(v => String(v.id) === String(ovId));
      if (!ov) continue;

      pills.push(`
        <button data-clear="facet" data-gid="${escapeHtml(gid)}" data-ovid="${escapeHtml(ovId)}"
          class="px-3 py-1 rounded-full bg-[#2b2b38] text-white text-xs font-black flex items-center gap-2">
          ${escapeHtml(gName)}: ${escapeHtml(ov.label)} <span class="opacity-80">×</span>
        </button>
      `);
    }
  }

  root.innerHTML = pills.join("");

  if (btnClear) {
    btnClear.classList.toggle("hidden", pills.length === 0);
    btnClear.onclick = async () => {
      state.cats.clear();
      state.brands.clear();
      setParam("cats", "");
      setParam("brands", "");
      setParam("brand", "");
      selected = {};
      await refreshBaseAndFacets();
    };
  }

  root.querySelectorAll("button[data-clear='cat']").forEach(b => {
    b.addEventListener("click", async () => {
      const slug = b.getAttribute("data-slug");
      if (slug) state.cats.delete(slug);
      setParam("cats", [...state.cats].join(","));
      selected = {};
      await refreshBaseAndFacets();
    });
  });

  root.querySelectorAll("button[data-clear='brand']").forEach(b => {
    b.addEventListener("click", async () => {
      const slug = b.getAttribute("data-slug");
      if (slug) state.brands.delete(slug);
      setParam("brands", [...state.brands].join(","));
      if (state.brands.size === 1) setParam("brand", [...state.brands][0]);
      else setParam("brand", "");
      selected = {};
      await refreshBaseAndFacets();
    });
  });

  root.querySelectorAll("button[data-clear='facet']").forEach(b => {
    b.addEventListener("click", () => {
      const gid = b.getAttribute("data-gid");
      const ovid = b.getAttribute("data-ovid");
      if (gid && ovid && selected[gid]) {
        selected[gid].delete(Number(ovid));
        if (selected[gid].size === 0) delete selected[gid];
        renderActiveFilters();
        rebuildFiltered();
        renderProducts();
        renderFacets();
        setProductCounters();
      }
    });
  });
}

function productCard(p) {
  const img = getFirstImage(p);
  const price = moneyBOB(p.base_price);

  return `
    <a href="${productHref(p.slug)}"
      class="product-card group block rounded-xl overflow-hidden bg-white border border-[#dbdbe6] hover:shadow-md transition">
      <div class="relative aspect-square bg-[#f0f0f4]">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}"
          class="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"/>
      </div>

      <div class="p-3">
        <div class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Producto</div>
        <h3 class="mt-2 font-black text-sm leading-snug line-clamp-2">${escapeHtml(p.name)}</h3>
        <div class="mt-2 font-black text-sm">${escapeHtml(price)}</div>
        ${p.short_desc ? `<p class="mt-2 text-xs text-[#616189] line-clamp-2">${escapeHtml(p.short_desc)}</p>` : ``}
      </div>
    </a>
  `;
}

function renderHeaderBits() {
  const title = qs("#page-title");
  const subtitle = qs("#result-subtitle");
  const crumbWrap = qs("#crumb-category-wrap");
  const crumb = qs("#crumb-category");

  if (title) title.textContent = "Tienda";

  const parts = [];

  if (state.cats.size > 0) {
    const names = [...state.cats]
      .map(slug => categories.find(c => c.slug === slug)?.name)
      .filter(Boolean);
    if (names.length) parts.push(names.join(" + "));
  }

  if (state.brands.size > 0) {
    const names = [...state.brands]
      .map(slug => brands.find(b => b.slug === slug)?.name)
      .filter(Boolean);
    if (names.length) parts.push(`Marca: ${names.join(" + ")}`);
  }

  if (subtitle) subtitle.textContent = parts.length ? `Mostrando resultados • ${parts.join(" • ")}` : "Mostrando resultados";

  if (crumbWrap && crumb) {
    if (state.cats.size > 0) {
      const names = [...state.cats]
        .map(slug => categories.find(c => c.slug === slug)?.name)
        .filter(Boolean);
      crumb.textContent = names.join(" + ");
      crumbWrap.classList.remove("hidden");
    } else {
      crumbWrap.classList.add("hidden");
    }
  }
}

function renderProducts() {
  const grid = qs("#product-grid");
  if (!grid) return;

  if (!filteredProducts.length) {
    grid.innerHTML = `
      <div class="col-span-full rounded-xl border border-[#dbdbe6] bg-white p-6 text-sm text-[#616189]">
        No hay productos para los filtros seleccionados.
      </div>
    `;
    setProductCounters();
    return;
  }

  grid.innerHTML = filteredProducts.map(productCard).join("");
  setProductCounters();
}

// -------------------- refresh flow --------------------
async function refreshBaseAndFacets() {
  // base (cats+brands)
  baseProducts = filterByCatsBrands(allProducts);

  renderHeaderBits();
  renderCategories();
  renderBrands();

  await loadVariantFacets(baseProducts.map(p => p.id));

  renderFacets();
  renderActiveFilters();

  rebuildFiltered();
  renderProducts();
}

async function refreshAll() {
  try {
    const subtitle = qs("#result-subtitle");
    if (subtitle) subtitle.textContent = "Cargando productos...";

    await loadProducts();
    await refreshBaseAndFacets();
  } catch (err) {
    console.error(err);
    const subtitle = qs("#result-subtitle");
    const grid = qs("#product-grid");
    if (subtitle) subtitle.textContent = "Error cargando tienda (mira consola F12)";
    if (grid) grid.innerHTML = `<div class="col-span-full text-red-600 text-sm">Error cargando datos.</div>`;
  }
}

// -------------------- UI --------------------
function bindUI() {
  const input = qs("#search-input");
  const btnClear = qs("#search-clear");
  const sortSel = qs("#sort-select");

  if (input) {
    input.value = state.q || "";
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        state.q = (input.value || "").trim();
        setParam("q", state.q);
        selected = {};
        await refreshAll();
      }
    });
  }

  if (btnClear && input) {
    btnClear.addEventListener("click", async () => {
      input.value = "";
      state.q = "";
      setParam("q", "");
      selected = {};
      await refreshAll();
    });
  }

  if (sortSel) {
    sortSel.value = state.sort || "latest";
    sortSel.addEventListener("change", () => {
      state.sort = sortSel.value || "latest";
      setParam("sort", state.sort);
      rebuildFiltered();
      renderProducts();
    });
  }
}

// -------------------- init --------------------
(async function init() {
  state.q = (getParam("q") || "").trim();
  state.sort = (getParam("sort") || "latest").trim();

  // cats=monitores,audifonos
  const catsStr = (getParam("cats") || "").trim();
  state.cats = new Set(catsStr ? catsStr.split(",").map(s => s.trim()).filter(Boolean) : []);

  // soporta brand=asus (home) y brands=asus,corsair (multi)
  const brandsStr = (getParam("brands") || "").trim();
  const singleBrand = (getParam("brand") || "").trim();

  const initialBrands = brandsStr
    ? brandsStr.split(",").map(s => s.trim()).filter(Boolean)
    : (singleBrand ? [singleBrand] : []);

  state.brands = new Set(initialBrands);

  storeId = await getStoreId();
  await loadCategories();
  await loadBrands();

  bindUI();
  await refreshAll();
})();
