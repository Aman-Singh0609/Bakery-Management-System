import { useEffect, useState } from 'react';
import { api } from '../lib/api';

let cached = null;

/** Public store settings: delivery fee, free-delivery threshold, online payments. */
export function useStoreSettings() {
  const [settings, setSettings] = useState(cached);
  useEffect(() => {
    if (cached) return;
    api
      .get('/store')
      .then(({ data }) => {
        cached = data.data;
        setSettings(data.data);
      })
      .catch(() => setSettings({ deliveryFee: 0, freeDeliveryAbove: 0, onlinePayments: false }));
  }, []);
  return settings;
}
