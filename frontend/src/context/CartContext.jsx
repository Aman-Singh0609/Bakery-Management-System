/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'amy_cart_v2';
const MAX_QTY = 50;

/**
 * The cart only remembers product ids, quantities and a display snapshot (name, image,
 * price at the time it was added). Real prices and stock always come from the server
 * quote, so a tampered localStorage entry cannot change what is charged.
 */
function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0)
      .map((item) => ({
        id: item.id,
        quantity: Math.min(item.quantity, MAX_QTY),
        name: String(item.name ?? ''),
        image: typeof item.image === 'string' ? item.image : null,
        category: typeof item.category === 'string' ? item.category : null,
        price: Number(item.price) || 0,
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage can be unavailable (private mode); the cart still works for this visit.
    }
  }, [cart]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setCart(loadCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const limit = Math.min(MAX_QTY, product.stock ?? MAX_QTY);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, limit) } : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          quantity: Math.min(quantity, limit),
          name: product.name,
          image: product.image,
          category: product.category,
          price: product.price,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.id !== productId)
        : prev.map((item) => (item.id === productId ? { ...item, quantity: Math.min(quantity, MAX_QTY) } : item)),
    );
  }, []);

  /** Applies a server quote: drops removed items, caps quantities to stock, refreshes prices. */
  const syncWithQuote = useCallback((quote) => {
    if (!quote) return;
    const lines = new Map(quote.lines.map((line) => [line.productId, line]));
    setCart((prev) => {
      const next = prev
        .filter((item) => lines.has(item.id))
        .map((item) => {
          const line = lines.get(item.id);
          return { ...item, name: line.name, image: line.image, category: line.category, price: line.unitPrice };
        });
      const changed =
        next.length !== prev.length ||
        next.some((item, i) => item.price !== prev[i].price || item.name !== prev[i].name);
      return changed ? next : prev;
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const quantityOf = (id) => cart.find((item) => item.id === id)?.quantity ?? 0;
    return { cart, addToCart, removeFromCart, updateQuantity, clearCart, syncWithQuote, totalItems, quantityOf };
  }, [cart, addToCart, removeFromCart, updateQuantity, clearCart, syncWithQuote]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
