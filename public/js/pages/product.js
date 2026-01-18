import { supabase, STORE_SLUG, assertConfig, getConfig } from "../supabaseClient.js";
import { toast } from "../lib/ui.js";
import { handleAddToCart } from "../lib/addToCartHandler.js";

assertConfig();

function qs(sel) { return document.querySelector(sel); }

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

function moneyBOB(n) {
  if (n === null || n === undefined || n === "") return "Precio a consultar";
  const num = Number(n);
  if (Number.isNaN(num)) return "Precio a consultar";
  return `Bs ${num.toFixed(2)}`;
}

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function isPlainObject(x) { return x && typeof x === "object" && !Array.isArray(x); }
function isEmptyObject(x) { return isPlainObject(x) && Object.keys(x).length === 0; }

function shallowMerge(a, b) {
  const A = isPlainObject(a) ? a : {};
  const B = isPlainObject(b) ? b : {};
  return { ...A, ...B };
}

function sortMedia(arr) {
  const a = Array.isArray(arr) ? [...arr] : [];
  a.sort((x, y) => (x.sort ?? 0) - (y.sort ?? 0));
  return a;
}

function pickFirstImage(mediaArr) {
  const arr = sortMedia(mediaArr);
  return arr[0]?.url || "https://placehold.co/1200x1200?text=Producto";
}

function renderThumbs(mediaArr, onPick) {
  const wrap = qs("#product-thumbs");
  if (!wrap) return;
  wrap.innerHTML = "";

  const arr = sortMedia(mediaArr);
  if (arr.length <= 1) return;

  for (const m of arr) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "w-20 h-20 rounded-xl overflow-hidden border border-[#f0f0f4] dark:border-white/10 bg-white/60 dark:bg-white/5 hover:shadow";
    btn.innerHTML = `<img class="w-full h-full object-cover" src="${escapeHtml(m.url)}" alt="${escapeHtml(m.alt || "")}">`;
    btn.addEventListener("click", () => onPick(m.url));
    wrap.appendChild(btn);
  }
}

// ✅ normaliza specs: object | string(json) | array<object>
function normalizeSpecs(input) {
  if (!input) return {};

  let val = input;

  // string JSON
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return {};
    try { val = JSON.parse(s); } catch { return {}; }
  }

  // array de objetos -> merge
  if (Array.isArray(val)) {
    const merged = {};
    for (const part of val) {
      if (isPlainObject(part)) Object.assign(merged, part);
    }
    return merged;
  }

  // objeto
  if (isPlainObject(val)) return val;

  return {};
}

function renderSpecs(specsObj) {
  const box = qs("#product-specs");
  if (!box) return;

  const specs = normalizeSpecs(specsObj);
  const entries = Object.entries(specs);

  if (entries.length === 0) {
    box.innerHTML = `<div class="text-sm text-[#616189] dark:text-gray-400">Sin especificaciones.</div>`;
    return;
  }

  box.innerHTML = entries.map(([k, v]) => `
    <div class="rounded-xl border border-[#f0f0f4] dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
      <div class="text-[10px] font-bold uppercase tracking-widest text-[#616189] dark:text-white/40">${escapeHtml(k)}</div>
      <div class="text-sm font-bold mt-1">${escapeHtml(String(v))}</div>
    </div>
  `).join("");
}

function renderDescription(desc) {
  const el = qs("#product-description");
  if (!el) return;

  const raw = (desc ?? "").toString();
  if (!raw.trim()) {
    el.innerHTML = `<div class="text-sm text-[#616189] dark:text-gray-400">Sin descripción.</div>`;
    return;
  }

  // si viene con HTML, lo sanitizamos
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  if (looksLikeHtml && window.DOMPurify) {
    el.innerHTML = window.DOMPurify.sanitize(raw, {
      ADD_TAGS: ["iframe", "style"],
      ADD_ATTR: ["class", "id", "style", "src", "href", "target", "rel", "allow", "allowfullscreen", "frameborder", "scrolling", "loading", "referrerpolicy"]
    });
  } else {
    el.textContent = raw;
  }
}

/**
 * landing_json puede venir como:
 * - string (HTML crudo)
 * - object { html: "<div>...</div>" }
 * - object { content: "<div>...</div>" }
 */
function extractLandingHtml(landingField) {
  if (!landingField) return "";
  if (typeof landingField === "string") return landingField;
  if (isPlainObject(landingField)) {
    if (typeof landingField.html === "string") return landingField.html;
    if (typeof landingField.content === "string") return landingField.content;
    if (typeof landingField.raw_html === "string") return landingField.raw_html;
  }
  return "";
}

function renderLandingHtml(rawHtml) {
  const root = qs("#product-landing");
  if (!root) return;

  if (!rawHtml || typeof rawHtml !== "string" || !rawHtml.trim()) {
    root.innerHTML = "";
    return;
  }

  const clean = window.DOMPurify
    ? window.DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["iframe", "style"],
      ADD_ATTR: [
        "class", "id", "style",
        "src", "href", "target", "rel",
        "allow", "allowfullscreen", "frameborder", "scrolling",
        "loading", "referrerpolicy",
        "data-*", "aria-*", "role"
      ],
    })
    : rawHtml;

  root.innerHTML = clean;

  root.querySelectorAll("iframe").forEach((iframe) => {
    if (!iframe.hasAttribute("sandbox")) {
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    }
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("referrerpolicy", "no-referrer");
  });
}

function buildWhatsappUrl({ phone, message }) {
  const p = String(phone || "").replace(/\D/g, "");
  const text = encodeURIComponent(message || "");
  return `https://wa.me/${p}?text=${text}`;
}

function buildWhatsappMessage({ product, variant, selectedLabels, qty }) {
  const lines = [];
  lines.push("Hola 👋, quiero pedir este producto:");
  lines.push("");
  lines.push(`🛒 Producto: ${product.name}`);
  if (selectedLabels?.length) lines.push(`⚙️ Opciones: ${selectedLabels.join(" | ")}`);
  if (variant?.sku) lines.push(`🔖 SKU: ${variant.sku}`);
  lines.push(`📦 Cantidad: ${qty}`);
  const price = variant?.price ?? product.base_price;
  lines.push(`💰 Precio: ${moneyBOB(price)}`);
  lines.push("");
  lines.push(`🔗 Link: ${window.location.href}`);
  return lines.join("\n");
}

function mediaForVariant(allMedia, variantId) {
  const media = Array.isArray(allMedia) ? allMedia : [];
  const base = media.filter(m => !m.variant_id);
  const specific = variantId ? media.filter(m => String(m.variant_id) === String(variantId)) : [];
  const merged = specific.length ? [...specific, ...base] : base;
  return sortMedia(merged);
}

/** Supabase fetch */
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

async function getWhatsappNumber(storeId) {
  const envPhone = getConfig().WHATSAPP_NUMBER || window.__ENV?.WHATSAPP_NUMBER || "";
  if (envPhone) return envPhone;

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("key", "whatsapp_admin_number")
    .limit(1)
    .single();

  if (!error && data?.value) return data.value;
  return "";
}

async function getProductBySlug(storeId, slug) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, store_id, category_id, brand_id,
      name, slug, short_desc, description, base_price,
      default_specs_json, specs_json, landing_json, active,
      categories:categories ( id, name, slug ),
      product_media:product_media ( url, alt, sort, variant_id )
    `)
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("active", true)
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

async function getVariantsForProduct(storeId, productId) {
  const { data, error } = await supabase
    .from("variants")
    .select(`
      id, product_id, sku, price, compare_at_price, active,
      specs_override_json, landing_override_json
    `)
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("active", true)
    .order("price", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Variants -> options map */
async function getVariantOptionMap(variantIds) {
  if (!variantIds.length) return { byVariant: new Map(), optionValues: new Map(), groups: new Map() };

  const { data: piv, error: e1 } = await supabase
    .from("variant_option_values")
    .select("variant_id, option_value_id")
    .in("variant_id", variantIds);
  if (e1) throw e1;

  const optionValueIds = [...new Set((piv || []).map(x => x.option_value_id))];
  if (!optionValueIds.length) {
    return { byVariant: new Map(), optionValues: new Map(), groups: new Map() };
  }

  const { data: ovs, error: e2 } = await supabase
    .from("option_values")
    .select(`
      id, label, value, color_hex, sort, option_group_id,
      option_group:option_groups ( id, name, slug, input_type )
    `)
    .in("id", optionValueIds);
  if (e2) throw e2;

  const optionValues = new Map();
  const groups = new Map();
  for (const ov of (ovs || [])) {
    optionValues.set(ov.id, ov);
    if (ov.option_group?.id) groups.set(ov.option_group.id, ov.option_group);
  }

  const byVariant = new Map();
  for (const row of (piv || [])) {
    if (!byVariant.has(row.variant_id)) byVariant.set(row.variant_id, new Set());
    byVariant.get(row.variant_id).add(row.option_value_id);
  }

  return { byVariant, optionValues, groups };
}

function findMatchingVariant(variants, byVariantSet, selectedByGroup) {
  const required = new Set(Object.values(selectedByGroup));
  for (const v of variants) {
    const set = byVariantSet.get(v.id) || new Set();
    let ok = true;
    for (const need of required) {
      if (!set.has(need)) { ok = false; break; }
    }
    if (ok) return v;
  }
  return null;
}

function buildSelectedLabels(selectedByGroup, optionValues, groups) {
  const parts = [];
  for (const [groupId, ovId] of Object.entries(selectedByGroup || {})) {
    const g = groups.get(groupId);
    const ov = optionValues.get(ovId);
    if (!g || !ov) continue;
    parts.push(`${g.name}: ${ov.label}`);
  }
  return parts;
}

function renderSelectors({ variants, byVariant, optionValues, groups, onChange, initialVariant }) {
  const root = qs("#variant-selectors");
  if (!root) return { selectedByGroup: {} };

  root.innerHTML = "";
  if (!variants.length || groups.size === 0) return { selectedByGroup: {} };

  const groupToValues = new Map();
  for (const v of variants) {
    const set = byVariant.get(v.id) || new Set();
    for (const ovId of set) {
      const ov = optionValues.get(ovId);
      if (!ov?.option_group?.id) continue;
      const gId = ov.option_group.id;
      if (!groupToValues.has(gId)) groupToValues.set(gId, new Map());
      groupToValues.get(gId).set(ovId, ov);
    }
  }

  const selectedByGroup = {};
  const initSet = byVariant.get(initialVariant.id) || new Set();
  for (const ovId of initSet) {
    const ov = optionValues.get(ovId);
    if (!ov?.option_group?.id) continue;
    selectedByGroup[ov.option_group.id] = ovId;
  }

  const groupEntries = [...groups.entries()].sort((a, b) =>
    String(a[1]?.name || "").localeCompare(String(b[1]?.name || ""))
  );

  for (const [groupId, group] of groupEntries) {
    const valuesMap = groupToValues.get(groupId);
    if (!valuesMap || valuesMap.size === 0) continue;

    const values = [...valuesMap.values()].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const isColor = (group.input_type === "color") || values.some(v => v.color_hex);

    const block = document.createElement("div");
    block.className = "space-y-2";

    const label = document.createElement("div");
    label.className = "text-sm font-bold uppercase tracking-wider text-[#616189] dark:text-white/60";
    label.textContent = group.name || "Opción";
    block.appendChild(label);

    const row = document.createElement("div");
    row.className = "flex flex-wrap gap-2";

    for (const ov of values) {
      const isActive = selectedByGroup[groupId] === ov.id;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.groupId = groupId;
      btn.dataset.ovId = ov.id;

      btn.className = isColor
        ? `h-10 w-10 rounded-full border-2 ${isActive ? "border-primary" : "border-transparent"} bg-white/60 dark:bg-white/5 hover:border-primary/40 p-1`
        : `h-11 px-4 rounded-xl border ${isActive ? "border-primary bg-primary/5" : "border-[#f0f0f4] dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-primary/40"} text-sm font-bold`;

      if (isColor) {
        const hex = ov.color_hex || "#d1d5db";
        btn.innerHTML = `<span class="block w-full h-full rounded-full" style="background:${hex}"></span>`;
        btn.title = ov.label;
      } else {
        btn.textContent = ov.label;
      }

      btn.addEventListener("click", () => {
        selectedByGroup[groupId] = ov.id;

        row.querySelectorAll("button").forEach(b => {
          const active = b.dataset.ovId === String(ov.id);
          if (isColor) {
            b.className = `h-10 w-10 rounded-full border-2 ${active ? "border-primary" : "border-transparent"} bg-white/60 dark:bg-white/5 hover:border-primary/40 p-1`;
          } else {
            b.className = `h-11 px-4 rounded-xl border ${active ? "border-primary bg-primary/5" : "border-[#f0f0f4] dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-primary/40"} text-sm font-bold`;
          }
        });

        onChange({ ...selectedByGroup });
      });

      row.appendChild(btn);
    }

    block.appendChild(row);
    root.appendChild(block);
  }

  onChange({ ...selectedByGroup });
  return { selectedByGroup };
}

function safeKey(product, variant) {
  const pKey = (product?.id != null && product.id !== "")
    ? String(product.id)
    : (product?.slug ? String(product.slug) : `p_${Date.now()}`);
  const vKey = (variant?.id != null && variant.id !== "")
    ? String(variant.id)
    : "base";
  return `${pKey}:${vKey}`;
}

function randomKey() {
  try { return crypto.randomUUID(); }
  catch { return `k_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
}

async function main() {
  const slug = getParam("slug");
  if (!slug) {
    qs("#product-title").textContent = "Producto no encontrado";
    qs("#product-subtitle").textContent = "Falta el parámetro ?slug=...";
    return;
  }

  const storeId = await getStoreId();
  const phone = await getWhatsappNumber(storeId);

  const product = await getProductBySlug(storeId, slug);

  qs("#product-title").textContent = product.name || "Producto";
  const bc = qs("#breadcrumb-product");
  if (bc) bc.textContent = product.name || "Producto";
  qs("#product-subtitle").textContent = product.short_desc || "—";

  // ✅ pinta descripción a la izquierda
  renderDescription(product.description);

  const catName = product.categories?.name || "—";
  qs("#product-category").textContent = catName;
  const pill = qs("#product-category-pill");
  if (pill && product.categories?.name) {
    pill.textContent = product.categories.name;
    pill.classList.remove("hidden");
  }

  const variants = await getVariantsForProduct(storeId, product.id);
  let currentVariant = variants[0] || null;

  const priceEl = qs("#product-price");
  const compareEl = qs("#product-compare");
  const skuEl = qs("#product-sku");
  const btnWA = qs("#btn-whatsapp");
  const btnWAText = qs("#btn-whatsapp-text");
  const btnAdd = qs("#btn-add-cart");

  let selectedLabels = [];
  let qty = 1;

  const updateMedia = (variant) => {
    const mainImg = qs("#product-main-image");
    const filtered = mediaForVariant(product.product_media, variant?.id || null);
    const first = pickFirstImage(filtered);
    if (mainImg) mainImg.src = first;
    renderThumbs(filtered, (url) => { if (mainImg) mainImg.src = url; });
  };

  const updateDetail = (variant) => {
    // ✅ base specs: PRIORIDAD default_specs_json
    const baseSpecs = normalizeSpecs(product.default_specs_json || product.specs_json || {});
    const overrideSpecs = normalizeSpecs(variant?.specs_override_json || {});
    const mergedSpecs = shallowMerge(baseSpecs, overrideSpecs);
    renderSpecs(mergedSpecs);

    // landing: override si existe, sino product.landing_json
    const landingField =
      (!isEmptyObject(variant?.landing_override_json) && variant?.landing_override_json)
        ? variant.landing_override_json
        : product.landing_json;

    const html = extractLandingHtml(landingField);
    renderLandingHtml(html);
  };

  const updateUI = (variant) => {
    const price = variant?.price ?? product.base_price;
    if (priceEl) priceEl.textContent = moneyBOB(price);

    if (compareEl) {
      if (variant?.compare_at_price) {
        compareEl.textContent = moneyBOB(variant.compare_at_price);
        compareEl.classList.remove("hidden");
      } else {
        compareEl.classList.add("hidden");
      }
    }

    if (skuEl) skuEl.textContent = variant?.sku || "—";

    updateMedia(variant);
    updateDetail(variant);

    if (btnWA && btnWAText) {
      if (variants.length && !variant) {
        btnWA.disabled = true;
        btnWA.classList.add("opacity-60", "cursor-not-allowed");
        btnWAText.textContent = "Sin combinación disponible";
      } else {
        btnWA.disabled = false;
        btnWA.classList.remove("opacity-60", "cursor-not-allowed");
        btnWAText.textContent = `Pedir por WhatsApp — ${moneyBOB(price)}`;
      }
    }
  };

  if (!variants.length) {
    updateUI(null);
  } else {
    const { byVariant, optionValues, groups } = await getVariantOptionMap(variants.map(v => v.id));
    if (groups.size > 0) {
      renderSelectors({
        variants,
        byVariant,
        optionValues,
        groups,
        initialVariant: currentVariant,
        onChange: (sel) => {
          const match = findMatchingVariant(variants, byVariant, sel);
          currentVariant = match;
          selectedLabels = buildSelectedLabels(sel, optionValues, groups);
          updateUI(match);
        },
      });
    } else {
      updateUI(currentVariant);
    }
  }

  // ✅ Add to cart (con key SIEMPRE)
  // ✅ Add to cart (con key SIEMPRE)
  if (btnAdd) {
    btnAdd.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        if (variants.length && !currentVariant) {
          toast({ type: "warning", title: "Falta selección", message: "Selecciona una combinación válida." });
          return;
        }

        const variant = variants.length ? currentVariant : null;
        const productId = product.id;
        const variantId = variant?.id || null;

        // Disable button while processing
        const originalText = btnAdd.innerHTML;
        btnAdd.disabled = true;
        btnAdd.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full opacity-75 mr-2"></span>`;

        // Use the auth-gated handler
        // This handles: Auth check, Redirect to login, Server add, Success toast
        await handleAddToCart(productId, variantId, 1);

        // Re-enable (toast handled by handleAddToCart or we can add extra here if needed)
        btnAdd.disabled = false;
        btnAdd.innerHTML = originalText;

      } catch (err) {
        console.error(err);
        toast({
          type: "error",
          title: "No se pudo agregar",
          message: err?.message ? String(err.message) : "Error agregando al carrito.",
        });
        btnAdd.disabled = false;
      }
    });
  }

  // WhatsApp
  btnWA?.addEventListener("click", () => {
    if (!phone) {
      toast({ type: "warning", title: "WhatsApp no configurado", message: "Configura WHATSAPP_NUMBER o settings.whatsapp_admin_number." });
      return;
    }

    const message = buildWhatsappMessage({
      product,
      variant: variants.length ? currentVariant : null,
      selectedLabels,
      qty
    });

    const url = buildWhatsappUrl({ phone, message });
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

main().catch(err => {
  console.error(err);
  const t = qs("#product-title");
  const s = qs("#product-subtitle");
  if (t) t.textContent = "Error cargando producto";
  if (s) s.textContent = err?.message ? String(err.message) : "Mira la consola (F12)";
  toast({ type: "error", title: "Error", message: err?.message ? String(err.message) : "Mira consola F12" });
});
