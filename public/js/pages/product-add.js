// public/js/pages/product-add.js
import { Auth } from "../lib/auth.js";
import { Cart } from "../lib/cart.js";

function showMsg(text, ok = false) {
  const box = document.getElementById("cart-msg");
  if (!box) return;
  box.classList.remove("hidden");
  box.className = "mt-3 text-sm " + (ok ? "text-green-600" : "text-red-600");
  box.textContent = text;
}

function getVariantInfoFromCtx() {
  const ctx = window.__PRODUCT_CTX || null;
  const v = ctx?.getCurrentVariant ? ctx.getCurrentVariant() : ctx?.currentVariant;
  const labels = ctx?.selectedLabels || [];
  return {
    variantId: v?.id || null,
    variantKey: v?.id ? `variant:${v.id}` : "default",
    variantLabel: labels.length ? labels.join(" • ") : ""
  };
}

function getBasicProductInfoFallback() {
  const title = document.getElementById("product-title")?.textContent?.trim() || "Producto";
  const priceText = document.getElementById("product-price")?.textContent || "0";
  const image = document.getElementById("product-main-image")?.getAttribute("src") || "";

  const params = new URLSearchParams(location.search);
  const id = params.get("id") || params.get("product_id") || params.get("slug") || title;

  return { id, title, priceText, image };
}

async function onAddToCart() {
  try {
    // ✅ fuerza login
    const ok = await Auth.requireLogin(location.pathname + location.search);
    if (!ok) return;

    const btn = document.getElementById("btn-add-cart");
    btn?.setAttribute("disabled", "disabled");
    btn?.classList.add("opacity-70", "cursor-not-allowed");

    const { id, title, priceText, image } = getBasicProductInfoFallback();
    const v = getVariantInfoFromCtx();

    await Cart.add({
      id,
      title,
      price: priceText,
      image,
      url: location.pathname + location.search,
      variantId: v.variantId,
      variantKey: v.variantKey,
      variantLabel: v.variantLabel
    }, 1);

    showMsg("Agregado al carrito ✓", true);

    if (btn) {
      btn.innerHTML = "Agregado ✓";
      setTimeout(() => {
        btn.innerHTML =
          '<span class="material-symbols-outlined">add_shopping_cart</span> Agregar al carrito';
      }, 900);
    }
  } catch (err) {
    console.error("[add-to-cart] error:", err);
    showMsg(err?.message || "No se pudo agregar al carrito.");
  } finally {
    const btn = document.getElementById("btn-add-cart");
    btn?.removeAttribute("disabled");
    btn?.classList.remove("opacity-70", "cursor-not-allowed");
  }
}

function bind() {
  const btn = document.getElementById("btn-add-cart");
  if (!btn) return;
  btn.addEventListener("click", onAddToCart);
}

// Si product.js dispara eventos, lo soportamos; si no, igual funciona.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bind);
} else {
  bind();
}

window.addEventListener("techstore:product:ready", () => {
  // opcional: aquí podrías refresh UI si quieres
});
