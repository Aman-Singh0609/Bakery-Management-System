import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { ACTION_LABELS, formatCurrency, formatDateTime, PAYMENT_LABELS, PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorNote, Spinner } from '../../components/Feedback';

const FILTERS = [
  ['OPEN', 'To handle'],
  ['', 'All'],
  ['PENDING_PAYMENT', STATUS_LABELS.PENDING_PAYMENT],
  ['DELIVERED', STATUS_LABELS.DELIVERED],
  ['CANCELLED', STATUS_LABELS.CANCELLED],
];

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'OPEN';
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const { user } = useAuth();
  const { notify } = useToast();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/orders', {
        params: { limit: 25, page, ...(status !== 'ALL' ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) },
      });
      setOrders(data.data);
      setMeta(data.meta);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load orders.'));
    }
  }, [status, search, page]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const move = async (order, next) => {
    if (['CANCELLED', 'REFUNDED'].includes(next)) {
      const message =
        next === 'REFUNDED'
          ? `Refund ${formatCurrency(order.totalAmount)} for ${order.orderNumber}?`
          : `Cancel ${order.orderNumber}? Stock goes back on the shelf${order.paymentStatus === 'PAID' ? ' and the payment is refunded' : ''}.`;
      if (!window.confirm(message)) return;
    }
    setBusy(order.id);
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, { status: next });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.data : o)));
      notify(`${order.orderNumber}: ${STATUS_LABELS[next].toLowerCase()}.`);
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not update the order.'), 'error');
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setPage(1);
                setParams(value === 'OPEN' ? {} : { status: value || 'ALL' }, { replace: true });
              }}
              className={`chip ${status === (value || 'ALL') ? 'border-cocoa bg-cocoa text-white' : 'border-line bg-white text-cocoa-soft'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative md:ml-auto md:w-72">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-muted" />
          <input
            type="search"
            className="input rounded-full py-2 pl-9"
            placeholder="Order number, name, phone"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </label>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorNote onRetry={load}>{error}</ErrorNote>
        ) : !orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState title={status === 'OPEN' ? 'Nothing waiting' : 'No orders match'}>
            {status === 'OPEN' ? 'New orders will appear here as soon as customers place them.' : 'Try a different filter or search.'}
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{order.customerName}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-cocoa-muted">
                      {order.orderNumber}, {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-xs text-cocoa-muted">
                      {PAYMENT_LABELS[order.paymentMethod]}: {PAYMENT_STATUS_LABELS[order.paymentStatus].toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <ul className="space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold">{item.quantity} ×</span> {item.productName}
                      </li>
                    ))}
                  </ul>
                  <div className="text-cocoa-soft">
                    <p className="whitespace-pre-line">{order.customerAddress}</p>
                    <p>
                      <a href={`tel:${order.customerPhone}`} className="hover:underline">{order.customerPhone}</a>
                    </p>
                    {order.notes && <p className="mt-2 rounded-lg bg-butter-light px-3 py-2 text-cocoa">Note: {order.notes}</p>}
                  </div>
                </div>

                {order.allowedTransitions?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {order.allowedTransitions
                      .filter((next) => next !== 'REFUNDED' || user.role === 'ADMIN')
                      .map((next) => (
                        <button
                          key={next}
                          type="button"
                          disabled={busy === order.id}
                          onClick={() => move(order, next)}
                          className={['CANCELLED', 'REFUNDED'].includes(next) ? 'btn-danger py-2' : 'btn-primary py-2'}
                        >
                          {ACTION_LABELS[next] || STATUS_LABELS[next]}
                        </button>
                      ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
            <span className="text-cocoa-muted">Page {meta.page} of {meta.totalPages}</span>
            <button type="button" className="btn-secondary" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>Older</button>
          </div>
        )}
      </div>
    </div>
  );
}
