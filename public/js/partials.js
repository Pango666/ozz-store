// public/js/partials.js
import { Auth } from "./lib/auth.js";

async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  el.innerHTML = await res.text();
}

function getCartLocal() {
  try {
    const raw = localStorage.getItem("techstore:cart:v1");
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function updateCartDot() {
  const dot = document.getElementById("cart-dot");
  if (!dot) return;

  const cart = getCartLocal();
  const qty = cart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  dot.classList.toggle("hidden", qty <= 0);
}

async function paintHeaderAccount() {
  const acc = document.getElementById("btn-account");
  const accLink = document.getElementById("account-link");
  const user = await Auth.getUser();

  const href = user ? "/auth/profile.html" : "/auth/login.html";
  if (accLink) accLink.setAttribute("href", href);
  if (acc) acc.onclick = () => (location.href = href);
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.allSettled([
    inject("#site-header", "/partials/header.html"),
    inject("#site-footer", "/partials/footer.html"),
  ]);

  updateCartDot();
  await paintHeaderAccount();

  // ✅ escucha el evento correcto + mantiene el antiguo por si acaso
  window.addEventListener("techstore:cart:changed", updateCartDot);
  window.addEventListener("techstore:cart:change", updateCartDot);

  window.addEventListener("storage", updateCartDot);
  window.addEventListener("focus", updateCartDot);

  window.addEventListener("techstore:auth:change", paintHeaderAccount);
});

window.TechStore = window.TechStore || {};
window.TechStore.refreshHeader = updateCartDot;
