import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorNote, Spinner } from '../components/Feedback';

const SORTS = [
  ['featured', 'Popular'],
  ['price_asc', 'Price: low → high'],
  ['price_desc', 'Price: high → low'],
  ['name', 'Name A–Z'],
];

export default function MenuPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || 'featured';
  const search = params.get('q') || '';

  const [query, setQuery] = useState(search);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setParam = useCallback(
    (key, value, fallback) => {
      const next = new URLSearchParams(params);
      if (!value || value === fallback) next.delete(key);
      else next.set(key, value);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  // Debounce the search box into the URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() !== search) setParam('q', query.trim(), '');
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, setParam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products', {
        params: { limit: 100, sort, ...(category !== 'all' ? { category } : {}), ...(search ? { search } : {}) },
      });
      setProducts(data.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the menu.'));
    } finally {
      setLoading(false);
    }
  }, [category, sort, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
      <div className="animate-fade-up">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-berry">Today's selection</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Today&apos;s menu</h1>
        <p className="mt-2 text-cocoa-soft">Everything here was baked this morning. Stock updates as orders come in.</p>
      </div>

      {/* ── Sticky filter bar ── */}
      <div className="sticky top-16 z-30 -mx-4 mt-8 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Categories">
            {[{ slug: 'all', name: 'Everything' }, ...categories].map((item) => {
              const active = category === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParam('category', item.slug, 'all')}
                  className={`chip transition-all duration-150 ${
                    active
                      ? 'border-cocoa bg-cocoa text-white shadow-sm'
                      : 'border-line bg-white text-cocoa-soft hover:border-cocoa-muted hover:shadow-sm'
                  }`}
                >
                  {item.name}
                  {item.productCount !== undefined && (
                    <span className={`text-[11px] ${active ? 'text-white/70' : 'text-cocoa-muted'}`}>
                      {item.productCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + Sort */}
          <div className="flex gap-2 lg:ml-auto">
            <label className="relative flex-1 lg:w-64">
              <span className="sr-only">Search the menu</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-muted" />
              <input
                type="search"
                className="input rounded-full py-2 pl-9 pr-4"
                placeholder="Search cakes, puffs…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="relative">
              <span className="sr-only">Sort by</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-muted" />
              <select
                className="input appearance-none rounded-full py-2 pl-9 pr-8"
                value={sort}
                onChange={(event) => setParam('sort', event.target.value, 'featured')}
              >
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ── Product grid ── */}
      <div className="mt-8 pb-16">
        {error ? (
          <ErrorNote onRetry={load}>{error}</ErrorNote>
        ) : loading && products.length === 0 ? (
          <Spinner label="Loading the menu" />
        ) : products.length === 0 ? (
          <EmptyState
            title={search ? `Nothing matches "${search}"` : 'Nothing in this section today'}
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setQuery(''); setParams({}, { replace: true }); }}
              >
                Show everything
              </button>
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-cocoa-muted">
              {products.length} item{products.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
            </p>
            <div className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
