const KEY = "techstore:cart:v1";

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

export function getCart() {
  const raw = localStorage.getItem(KEY);
  const data = safeParse(raw, { items: [] });
  if (!data || !Array.isArray(data.items)) return { items: [] };
  return data;
}

function saveCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated"));
}

export function clearCart() {
  saveCart({ items: [] });
}

export function getCartCount() {
  return getCart().items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
}

export function getCartSubtotal() {
  return getCart().items.reduce((acc, it) => {
    const price = Number(it.price) || 0;
    const qty = Number(it.qty) || 0;
    return acc + price * qty;
  }, 0);
}

export function addToCart(item, qty = 1) {
  const cart = getCart();
  const q = Math.max(1, Number(qty) || 1);

  // clave única: producto + variante (si existe)
  const key = `${item.product_id}::${item.variant_id || "base"}`;

  const found = cart.items.find(x => x.key === key);
  if (found) {
    found.qty = (Number(found.qty) || 0) + q;
  } else {
    cart.items.push({
      key,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      slug: item.slug || "",
      name: item.name || "Producto",
      image: item.image || "https://placehold.co/200x200?text=Producto",
      price: Number(item.price) || 0,
      sku: item.sku || "",
      options_text: item.options_text || "",
      qty: q,
    });
  }

  saveCart(cart);
}

export function removeFromCart(key) {
  const cart = getCart();
  cart.items = cart.items.filter(it => it.key !== key);
  saveCart(cart);
}

export function setQty(key, qty) {
  const cart = getCart();
  const q = Number(qty) || 1;
  for (const it of cart.items) {
    if (it.key === key) it.qty = Math.max(1, q);
  }
  saveCart(cart);
}
