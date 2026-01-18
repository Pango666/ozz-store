// public/js/pages/cart.js
// Cart page with auth requirement - server-side cart
import { requireAuth, getUser } from '../lib/authGate.js';
import { getCartItems, updateQuantity, removeFromCart, clearCart, getCartSubtotal } from '../lib/cartService.js';

function moneyBOB(n) {
  if (n === null || n === undefined) return "Bs 0.00";
  return `Bs ${Number(n).toFixed(2)}`;
}

async function renderCartItems() {
  const container = document.getElementById('cart-items-container');
  const sidebarContainer = document.getElementById('cart-items');
  const emptyState = document.getElementById('empty-left');
  const checkoutForm = document.getElementById('checkout-form-container');
  const clearBtn = document.getElementById('btn-clear-cart');
  const itemsCount = document.getElementById('items-count');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');

  const items = await getCartItems();

  if (!items.length) {
    if (container) container.innerHTML = '';
    if (sidebarContainer) sidebarContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Sin productos</p>';
    if (emptyState) emptyState.classList.remove('hidden');
    if (checkoutForm) checkoutForm.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (itemsCount) itemsCount.textContent = '0 items';
    if (subtotalEl) subtotalEl.textContent = 'Bs 0.00';
    if (totalEl) totalEl.textContent = 'Bs 0.00';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (checkoutForm) checkoutForm.classList.remove('hidden');
  if (clearBtn) clearBtn.classList.remove('hidden');

  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = await getCartSubtotal();

  if (itemsCount) itemsCount.textContent = `${totalQty} item${totalQty > 1 ? 's' : ''}`;
  if (subtotalEl) subtotalEl.textContent = moneyBOB(subtotal);
  if (totalEl) totalEl.textContent = moneyBOB(subtotal);

  // Main container
  if (container) {
    container.innerHTML = items.map(item => `
      <div class="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-4" data-item-id="${item.id}">
        <div class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 dark:text-white truncate">${item.name}</h3>
          ${item.options_text ? `<p class="text-sm text-gray-500 dark:text-gray-400">${item.options_text}</p>` : ''}
          ${item.sku ? `<p class="text-xs text-gray-400">SKU: ${item.sku}</p>` : ''}
          <p class="text-primary font-bold mt-2">${moneyBOB(item.price)}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <button class="btn-remove text-gray-400 hover:text-red-500 p-1" data-id="${item.id}" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
          <div class="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <button class="btn-qty-minus px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700" data-id="${item.id}">−</button>
            <span class="qty-display px-3 font-semibold">${item.quantity}</span>
            <button class="btn-qty-plus px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700" data-id="${item.id}">+</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Sidebar container (compact)
  if (sidebarContainer) {
    sidebarContainer.innerHTML = items.map(item => `
      <div class="flex gap-3 py-2">
        <div class="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${item.name}</p>
          <p class="text-xs text-gray-500">${item.quantity} x ${moneyBOB(item.price)}</p>
        </div>
      </div>
    `).join('');
  }
}

function setupListeners() {
  const container = document.getElementById('cart-items-container');
  const clearBtn = document.getElementById('btn-clear-cart');
  const checkoutForm = document.getElementById('checkout-form');
  const goWhatsappBtn = document.getElementById('btn-go-whatsapp');

  if (container) {
    container.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const itemId = target.dataset.id;
      if (!itemId) return;

      if (target.classList.contains('btn-remove')) {
        await removeFromCart(itemId);
        renderCartItems();
      } else if (target.classList.contains('btn-qty-minus')) {
        const itemEl = target.closest('[data-item-id]');
        const qtyEl = itemEl?.querySelector('.qty-display');
        const currentQty = parseInt(qtyEl?.textContent || '1');
        if (currentQty > 1) {
          await updateQuantity(itemId, currentQty - 1);
          renderCartItems();
        }
      } else if (target.classList.contains('btn-qty-plus')) {
        const itemEl = target.closest('[data-item-id]');
        const qtyEl = itemEl?.querySelector('.qty-display');
        const currentQty = parseInt(qtyEl?.textContent || '1');
        await updateQuantity(itemId, currentQty + 1);
        renderCartItems();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('¿Vaciar el carrito?')) {
        await clearCart();
        renderCartItems();
      }
    });
  }

  // WhatsApp checkout
  async function sendToWhatsapp() {
    const items = await getCartItems();
    if (!items.length) return;

    const firstName = document.getElementById('f-first')?.value || '';
    const lastName = document.getElementById('f-last')?.value || '';
    const email = document.getElementById('f-email')?.value || '';
    const address = document.getElementById('f-address')?.value || '';
    const city = document.getElementById('f-city')?.value || '';
    const notes = document.getElementById('f-notes')?.value || '';

    const subtotal = await getCartSubtotal();

    let message = `*NUEVO PEDIDO*\n\n`;
    message += `*Cliente:* ${firstName} ${lastName}\n`;
    if (email) message += `*Email:* ${email}\n`;
    if (address) message += `*Dirección:* ${address}\n`;
    if (city) message += `*Ciudad:* ${city}\n`;
    message += `\n*PRODUCTOS:*\n`;

    items.forEach(item => {
      message += `• ${item.name}`;
      if (item.options_text) message += ` (${item.options_text})`;
      message += ` x${item.quantity} - ${moneyBOB(item.price * item.quantity)}\n`;
    });

    message += `\n*TOTAL:* ${moneyBOB(subtotal)}\n`;
    if (notes) message += `\n*Notas:* ${notes}`;

    const whatsappNumber = window.__ENV?.WHATSAPP_NUMBER || '59172078692';
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendToWhatsapp();
    });
  }

  if (goWhatsappBtn) {
    goWhatsappBtn.addEventListener('click', sendToWhatsapp);
  }
}

async function init() {
  // REQUIRE AUTH - redirect if not logged in
  const user = await requireAuth('Inicia sesión para ver tu carrito');
  if (!user) return; // Will redirect

  await renderCartItems();
  setupListeners();

  // Listen for cart changes
  window.addEventListener('cart:changed', renderCartItems);
}

// Handle back button (BFCache)
window.addEventListener('pageshow', async (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

document.addEventListener('DOMContentLoaded', init);
