// public/js/lib/cart.js
// ✅ Carrito local consistente (un solo key) + evento global

const CART_KEY = "techstore:cart:v1";

function safeJsonParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function readCart() {
  const raw = localStorage.getItem(CART_KEY);
  const items = safeJsonParse(raw, []);
  return Array.isArray(items) ? items : [];
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("techstore:cart:changed", { detail: { items } }));
}

function normQty(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export const Cart = {
  key: CART_KEY,

  getItems() {
    return readCart();
  },

  clear() {
    writeCart([]);
  },

  remove(key) {
    const items = readCart().filter(it => it.key !== key);
    writeCart(items);
  },

  setQty(key, qty) {
    const items = readCart();
    const idx = items.findIndex(it => it.key === key);
    if (idx === -1) return;

    const next = Number(qty);
    if (!Number.isFinite(next) || next <= 0) {
      items.splice(idx, 1);
      writeCart(items);
      return;
    }

    items[idx].qty = normQty(next);
    writeCart(items);
  },

  add(item) {
    if (!item || !item.key) throw new Error("Cart.add: falta item.key");

    const items = readCart();
    const idx = items.findIndex(it => it.key === item.key);

    if (idx >= 0) {
      items[idx].qty = normQty((Number(items[idx].qty) || 0) + (Number(item.qty) || 1));
    } else {
      items.push({
        key: String(item.key),
        title: item.title || "Producto",
        price: Number(item.price) || 0,
        qty: normQty(item.qty || 1),
        image: item.image || "",
        sku: item.sku || "",
        variantLabel: item.variantLabel || "",
        productSlug: item.productSlug || "",
        variantId: item.variantId || null,
        productId: item.productId || null,
        storeId: item.storeId || null,
      });
    }

    writeCart(items);
    return items;
  },
};
