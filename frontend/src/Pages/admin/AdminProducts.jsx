import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ProductImage from '../../components/ProductImage';
import { ErrorNote, Spinner } from '../../components/Feedback';
import ProductForm from './ProductForm';

export default function AdminProducts() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [stockDraft, setStockDraft] = useState({});

  const load = useCallback(async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/admin/products', { params: { limit: 100 } }),
        api.get('/admin/categories'),
      ]);
      setProducts(productsRes.data.data);
      setCategories(categoriesRes.data.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load products.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload) => {
    if (editing === 'new') {
      await api.post('/admin/products', payload);
      notify('Product added.');
    } else {
      await api.put(`/admin/products/${editing.id}`, payload);
      notify('Product saved.');
    }
    setEditing(null);
    load();
  };

  const saveStock = async (product) => {
    const value = stockDraft[product.id];
    if (value === undefined || Number(value) === product.stock) return;
    if (!Number.isInteger(Number(value)) || Number(value) < 0) {
      notify('Stock must be a whole number, 0 or more.', 'error');
      setStockDraft((prev) => ({ ...prev, [product.id]: undefined }));
      return;
    }
    try {
      const { data } = await api.patch(`/admin/products/${product.id}/stock`, { stock: Number(value) });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.data : p)));
      setStockDraft((prev) => ({ ...prev, [product.id]: undefined }));
      notify(`${product.name}: stock set to ${data.data.stock}.`);
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not update stock.'), 'error');
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Remove ${product.name} from the menu? Past orders keep their record.`)) return;
    try {
      await api.delete(`/admin/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      notify(`${product.name} removed.`);
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not remove the product.'), 'error');
    }
  };

  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!products) return <Spinner />;

  const q = search.trim().toLowerCase();
  const visible = products.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q),
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative sm:w-72">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-muted" />
          <input type="search" className="input rounded-full py-2 pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button type="button" className="btn-primary sm:ml-auto" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-line text-cocoa-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">In stock</th>
              <th className="px-4 py-3 font-medium">On menu</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductImage src={product.image} alt="" category={product.category} className="h-11 w-11 shrink-0 rounded-lg" iconClass="h-5 w-5" />
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-xs text-cocoa-muted">
                        {product.category || 'No category'}
                        {product.featured && ', featured'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatCurrency(product.price)}</td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`${product.name} stock`}
                    inputMode="numeric"
                    className={`input w-20 py-1.5 tabular-nums ${product.stock === 0 ? 'border-berry text-berry' : product.stock < 10 ? 'border-[#D9B44A]' : ''}`}
                    value={stockDraft[product.id] ?? product.stock}
                    onChange={(e) => setStockDraft((prev) => ({ ...prev, [product.id]: e.target.value }))}
                    onBlur={() => saveStock(product)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                </td>
                <td className="px-4 py-3">{product.active ? 'Yes' : <span className="text-cocoa-muted">Hidden</span>}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="btn-ghost py-1.5" onClick={() => setEditing(product)}>Edit</button>
                  {user.role === 'ADMIN' && (
                    <button type="button" className="btn-ghost py-1.5 text-berry" onClick={() => remove(product)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-6 text-sm text-cocoa-muted">No products match “{search}”.</p>}
      </div>

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
