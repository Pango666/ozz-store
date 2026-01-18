// public/js/lib/addToCartHandler.js
// Handler for add-to-cart buttons that requires auth
import { checkAuthForAction } from './authGate.js';
import { addToCart } from './cartService.js';

/**
 * Handle add-to-cart click with auth gate
 * @param {string} productId 
 * @param {string|null} variantId 
 * @param {number} quantity 
 * @returns {Promise<boolean>} - true if added, false if redirected to login
 */
export async function handleAddToCart(productId, variantId = null, quantity = 1) {
    // Check auth first - will redirect if not logged in
    const isAuthed = await checkAuthForAction('Inicia sesión para agregar productos al carrito');
    if (!isAuthed) return false;

    try {
        await addToCart(productId, variantId, quantity);

        // Show toast if available
        if (typeof window.showToast === 'function') {
            window.showToast('Producto agregado al carrito', 'success');
        } else {
            // Fallback toast
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
            toast.textContent = '✓ Producto agregado al carrito';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        return true;
    } catch (err) {
        console.error('Error adding to cart:', err);

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = 'Error al agregar al carrito';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        return false;
    }
}

/**
 * Initialize add-to-cart buttons on page
 * Buttons must have:
 * - class="btn-add-to-cart" or data-add-to-cart
 * - data-product-id="uuid"
 * - data-variant-id="uuid" (optional)
 * - data-quantity="1" (optional, default 1)
 */
export function initAddToCartButtons() {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-add-to-cart], .btn-add-to-cart');
        if (!btn) return;

        e.preventDefault();

        const productId = btn.dataset.productId;
        const variantId = btn.dataset.variantId || null;
        const quantity = parseInt(btn.dataset.quantity) || 1;

        if (!productId) {
            console.error('Add to cart: missing product-id');
            return;
        }

        // Disable button while processing
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Agregando...';

        await handleAddToCart(productId, variantId, quantity);

        // Restore button
        btn.disabled = false;
        btn.textContent = originalText;
    });
}
