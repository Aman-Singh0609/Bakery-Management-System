import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import { formatCurrency, formatDateTime, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import OrderProgress from '../components/OrderProgress';
import { ErrorNote, Spinner } from '../components/Feedback';
import { useToast } from '../context/ToastContext';

const CUSTOMER_CANCELLABLE = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED'];

export default function OrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { notify } = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${encodeURIComponent(id)}`);
      setOrder(data.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this order.'));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll gently while the order is moving so the customer sees updates.
  useEffect(() => {
    if (!order || ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) return undefined;
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [order, load]);

  const cancel = async () => {
    if (!window.confirm('Cancel this order? Items go back on the shelf and any online payment is refunded.')) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${order.id}/cancel`, { reason: 'Cancelled by customer' });
      setOrder(data.data);
      notify('Order cancelled.');
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not cancel this order.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="mx-auto max-w-2xl px-4 pt-12"><ErrorNote onRetry={load}>{error}</ErrorNote></div>;
  if (!order) return <Spinner label="Loading your order" />;

  const placed = params.get('placed') === '1';
  const paymentProblem = params.get('payment');
  const awaitingPayment = order.status === 'PENDING_PAYMENT';

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6 pb-16">
      {/* Success banner */}
      {placed && order.status !== 'CANCELLED' && (
        <div className="mb-8 flex items-start gap-4 rounded-2xl bg-pistachio-light p-6 ring-1 ring-pistachio/20 animate-fade-up">
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-pistachio" />
          <div>
            <h1 className="text-2xl font-extrabold text-cocoa">
              Thank you, {order.customerName.split(' ')[0]}! 🎉
            </h1>
            <p className="mt-1 text-cocoa-soft">
              {order.paymentMethod === 'COD'
                ? `Your order is confirmed. Please keep ${formatCurrency(order.totalAmount)} ready in cash.`
                : 'Your payment went through and your order is confirmed.'}
            </p>
          </div>
        </div>
      )}

      {awaitingPayment && paymentProblem && (
        <div className="mb-6">
          <ErrorNote>
            {paymentProblem === 'cancelled'
              ? 'Payment was not completed. Your items are held for 30 minutes. Cancel this order and check out again, or contact us.'
              : 'The payment failed. Your items are held for 30 minutes. Cancel this order and try again.'}
          </ErrorNote>
        </div>
      )}

      {!placed && (
        <Link to="/account" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-berry hover:underline">
          <ArrowLeft className="h-4 w-4" /> All my orders
        </Link>
      )}

      {/* The receipt */}
      <article className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="ribbon h-3" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-cocoa">Order {order.orderNumber}</p>
              <p className="text-sm text-cocoa-muted">{formatDateTime(order.createdAt)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="mt-6"><OrderProgress order={order} /></div>

          <ul className="mt-8 divide-y divide-dashed divide-line border-y border-dashed border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                <span><span className="font-semibold">{item.quantity} ×</span> {item.productName}</span>
                <span className="tabular-nums">{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-cocoa-soft"><dt>Subtotal</dt><dd className="tabular-nums">{formatCurrency(order.subtotal)}</dd></div>
            <div className="flex justify-between text-cocoa-soft"><dt>Delivery</dt><dd className="tabular-nums">{order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums text-berry">{formatCurrency(order.totalAmount)}</dd></div>
          </dl>

          <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-paper p-4">
              <h2 className="mb-2 font-bold">Delivering to</h2>
              <p className="font-medium">{order.customerName}</p>
              <p className="whitespace-pre-line text-cocoa-soft">{order.customerAddress}</p>
              <p className="text-cocoa-soft">{order.customerPhone}</p>
            </div>
            <div className="rounded-xl bg-paper p-4">
              <h2 className="mb-2 font-bold">Payment</h2>
              <p className="font-medium">{PAYMENT_LABELS[order.paymentMethod]}</p>
              <p className="text-cocoa-soft">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
              {order.notes && (
                <>
                  <h2 className="mb-1 mt-4 font-bold">Your note</h2>
                  <p className="text-cocoa-soft">{order.notes}</p>
                </>
              )}
            </div>
          </div>

          {order.statusHistory.length > 0 && (
            <details className="mt-8 text-sm">
              <summary className="cursor-pointer font-semibold text-cocoa-soft hover:text-cocoa">Order history</summary>
              <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
                {order.statusHistory.map((entry, index) => (
                  <li key={index}>
                    <span className="font-medium">{entry.note || entry.status}</span>
                    <span className="ml-2 text-cocoa-muted">{formatDateTime(entry.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </article>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/menu" className="btn-secondary">Order something else</Link>
        {CUSTOMER_CANCELLABLE.includes(order.status) && (
          <button type="button" className="btn-danger" onClick={cancel} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Cancel order
          </button>
        )}
      </div>
      {order.status === 'PREPARING' && (
        <p className="mt-3 text-sm text-cocoa-muted">The kitchen has started on this order, so it can no longer be cancelled online.</p>
      )}
    </div>
  );
}
