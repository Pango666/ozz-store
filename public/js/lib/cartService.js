// public/js/lib/cartService.js
// Server-side cart service using Supabase
import { supabase, STORE_SLUG } from '../supabaseClient.js';
import { getUser } from './authGate.js';

let cachedStoreId = null;

async function getStoreId() {
    if (cachedStoreId) return cachedStoreId;

    const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', STORE_SLUG)
        .single();

    cachedStoreId = data?.id;
    return cachedStoreId;
}

async function getOrCreateCart(userId) {
    const storeId = await getStoreId();
    if (!storeId) throw new Error('Store not found');

    // Try to get existing cart
    const { data: existing } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .single();

    if (existing) return existing.id;

    // Create new cart
    const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ user_id: userId, store_id: storeId })
        .select('id')
        .single();

    if (error) throw error;
    return newCart.id;
}

/**
 * Get cart items for current user
 * @returns {Promise<Array>}
 */
/**
 * Get cart items for current user
 * @returns {Promise<Array>}
 */
/**
 * Get cart items for current user
 * @returns {Promise<Array>}
 */
export async function getCartItems() {
    const user = await getUser();
    if (!user) return [];

    const storeId = await getStoreId();

    const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .single();

    if (!cart) return [];

    // 1. Get raw items (No product join because FK is missing)
    const { data: items } = await supabase
        .from('cart_items')
        .select(`
            *,
            variant:variant_id (sku)
        `)
        .eq('cart_id', cart.id);

    if (!items || !items.length) return [];

    // 2. Manual "Join" to get slugs (Application-side)
    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))];
    const productMap = new Map();

    if (productIds.length > 0) {
        const { data: products } = await supabase
            .from('products')
            .select('id, slug, name')
            .in('id', productIds);

        if (products) {
            products.forEach(p => productMap.set(p.id, p));
        }
    }

    // 3. Merge data
    return items.map(item => {
        const p = productMap.get(item.product_id) || {};
        const v = Array.isArray(item.variant) ? item.variant[0] : (item.variant || {});

        return {
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            slug: p.slug || '',
            name: item.title || p.name || 'Producto',
            image: item.image || item.url || 'https://placehold.co/200x200?text=Producto',
            price: Number(item.price || 0),
            sku: item.variant_key || v.sku || '',
            quantity: item.quantity,
            options_text: item.variant_key && item.variant_key !== 'default' ? item.variant_key : ''
        };
    });
}

/**
 * Add item to cart
 * @param {string} productId 
 * @param {string|null} variantId 
 * @param {number} quantity 
 */
export async function addToCart(productId, variantId = null, quantity = 1) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated');

    const cartId = await getOrCreateCart(user.id);

    // 1. Fetch Product Details (Required to satisfy DB constraints: title, price)
    const { data: product, error: pErr } = await supabase
        .from('products')
        .select('name, base_price, id')
        .eq('id', productId)
        .single();

    if (pErr || !product) throw new Error("Producto no encontrado o error de conexión");

    // 2. Fetch Variant Details (if any)
    let price = product.base_price || 0;
    let variantKey = 'default';

    if (variantId) {
        const { data: variant } = await supabase
            .from('variants')
            .select('price, sku')
            .eq('id', variantId)
            .single();
        if (variant) {
            price = variant.price;
            variantKey = variant.sku || 'default';
        }
    }

    // 3. Fetch Image (First one)
    let imageUrl = null;
    const { data: media } = await supabase
        .from('product_media')
        .select('url')
        .eq('product_id', productId)
        .order('sort', { ascending: true })
        .limit(1);

    if (media && media.length > 0) imageUrl = media[0].url;

    // 4. Check if item exists in cart
    let query = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', productId);

    if (variantId) query = query.eq('variant_id', variantId);
    else query = query.is('variant_id', null);

    const { data: existing } = await query.single();

    if (existing) {
        // Update quantity (Sync both 'quantity' and 'qty' to be safe)
        const newQty = existing.quantity + quantity;
        const { error } = await supabase
            .from('cart_items')
            .update({
                quantity: newQty,
                qty: newQty,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

        if (error) throw error;
    } else {
        // Insert with ALL fields
        const { error } = await supabase
            .from('cart_items')
            .insert({
                cart_id: cartId,
                product_id: productId,
                variant_id: variantId,
                title: product.name,     // Satisfies NOT NULL
                price: price,            // Satisfies NOT NULL
                image: imageUrl,
                quantity: quantity,
                qty: quantity,           // Sync for schema compatibility
                variant_key: variantKey
            });

        if (error) throw error;
    }

    emitCartChanged();
}

/**
 * Update item quantity
 * @param {string} itemId 
 * @param {number} quantity 
 */
export async function updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
        return removeFromCart(itemId);
    }

    const { error } = await supabase
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', itemId);

    if (error) throw error;
    emitCartChanged();
}

/**
 * Remove item from cart
 * @param {string} itemId 
 */
export async function removeFromCart(itemId) {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

    if (error) throw error;
    emitCartChanged();
}

/**
 * Clear entire cart
 */
export async function clearCart() {
    const user = await getUser();
    if (!user) return;

    const storeId = await getStoreId();

    const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .single();

    if (!cart) return;

    await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

    emitCartChanged();
}

/**
 * Get cart count
 * @returns {Promise<number>}
 */
export async function getCartCount() {
    const items = await getCartItems();
    return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get cart subtotal
 * @returns {Promise<number>}
 */
export async function getCartSubtotal() {
    const items = await getCartItems();
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function emitCartChanged() {
    window.dispatchEvent(new CustomEvent('cart:changed'));
}
