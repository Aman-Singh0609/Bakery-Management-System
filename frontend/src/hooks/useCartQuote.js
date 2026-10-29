import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../lib/api';
import { useCart } from '../context/CartContext';

/** Fetches the server-side price for the current cart whenever it changes. */
export function useCartQuote() {
  const { cart, syncWithQuote } = useCart();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const key = cart.map((item) => `${item.id}:${item.quantity}`).join(',');

  useEffect(() => {
    if (!key) {
      setQuote(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const items = key.split(',').map((entry) => {
          const [productId, quantity] = entry.split(':');
          return { productId, quantity: Number(quantity) };
        });
        const { data } = await api.post('/cart/quote', { items });
        if (cancelled) return;
        setQuote(data.data);
        setError('');
        syncWithQuote(data.data);
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not check prices right now.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, syncWithQuote]);

  return { quote, loading, error };
}
