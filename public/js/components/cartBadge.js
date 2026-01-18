// public/js/components/cartBadge.js
// Cart badge that updates from server-side cart
import { getUser } from '../lib/authGate.js';
import { getCartCount } from '../lib/cartService.js';

let updateTimeout = null;

export async function refreshCartBadge({ animate = false } = {}) {
  const badge = document.getElementById("cart-badge");
  const dot = document.getElementById("cart-dot");

  // Get user first
  const user = await getUser();

  let qty = 0;
  if (user) {
    try {
      qty = await getCartCount();
    } catch (e) {
      console.error('Error getting cart count:', e);
    }
  }

  if (badge) {
    badge.textContent = String(qty);
    badge.classList.toggle("hidden", qty <= 0);

    if (animate && qty > 0) {
      badge.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
        { duration: 260, easing: "ease-out" }
      );
    }
  }

  if (dot) {
    dot.classList.toggle("hidden", qty <= 0);
  }

  // Animate cart icon if exists
  if (animate && qty > 0) {
    const cartLink =
      document.querySelector('a[title="Carrito"]') ||
      document.querySelector('a[href$="cart.html"]');

    cartLink?.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-2px)" }, { transform: "translateY(0)" }],
      { duration: 240, easing: "ease-out" }
    );
  }
}

// Debounced refresh
function debouncedRefresh() {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => refreshCartBadge({ animate: true }), 100);
}

export function initCartBadge() {
  if (window.__cart_badge_inited) return;
  window.__cart_badge_inited = true;

  // Initial load
  refreshCartBadge({ animate: false });

  // Listen for cart changes
  window.addEventListener("cart:changed", debouncedRefresh);

  // Refresh on focus/visibility
  window.addEventListener("focus", () => refreshCartBadge({ animate: false }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshCartBadge({ animate: false });
  });
}
