import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, Loader2, Lock, Smartphone } from 'lucide-react';
import { api, apiErrorMessage, apiFieldErrors } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCartQuote } from '../hooks/useCartQuote';
import { useStoreSettings } from '../hooks/useStore';
import { formatCurrency } from '../lib/format';
import OrderSummary from '../components/OrderSummary';
import { ErrorNote } from '../components/Feedback';

const ADDRESS_KEY = 'amy_last_address';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.body.appendChild(script);
  });
}

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { quote, loading: quoting } = useCartQuote();
  const settings = useStoreSettings();
  const navigate = useNavigate();
  const idempotencyKey = useRef(newKey());

  const [form, setForm] = useState(() => {
    let address = '';
    try {
      address = localStorage.getItem(ADDRESS_KEY) || '';
    } catch {
      /* ignore */
    }
    return { name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address, notes: '' };
  });
  const [method, setMethod] = useState('COD');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (cart.length === 0 && !submitting) return <Navigate to="/cart" replace />;

  const update = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Please enter a valid email';
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) next.phone = 'Enter a 10-digit mobile number';
    if (form.address.trim().length < 10) next.address = 'Please enter your full address, with landmark and PIN code';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const payOnline = async (order) => {
    const { data } = await api.post('/payments/razorpay/order', { orderId: order.id });
    const payment = data.data;
    if (payment.alreadyPaid) return;
    await loadRazorpay();
    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,
        name: 'Sweet Dreams Bakery',
        description: `Order ${payment.orderNumber}`,
        prefill: payment.prefill,
        theme: { color: '#B4234F' },
        handler: async (response) => {
          try {
            await api.post('/payments/razorpay/verify', { orderId: order.id, ...response });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error('PAYMENT_DISMISSED')) },
      });
      checkout.on('payment.failed', (response) => reject(new Error(response?.error?.description || 'The payment failed.')));
      checkout.open();
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);

    let order = null;
    try {
      const { data } = await api.post(
        '/orders',
        {
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
          },
          notes: form.notes.trim() || undefined,
          paymentMethod: method,
        },
        { headers: { 'Idempotency-Key': idempotencyKey.current } },
      );
      order = data.data;
      try {
        localStorage.setItem(ADDRESS_KEY, form.address.trim());
      } catch {
        /* ignore */
      }

      if (method === 'RAZORPAY') await payOnline(order);

      clearCart();
      navigate(`/orders/${order.id}?placed=1`, { replace: true });
    } catch (err) {
      if (order) {
        // The order exists but was not paid. It stays reserved for 30 minutes and can be
        // paid or cancelled from the order page, so send the customer there.
        clearCart();
        navigate(`/orders/${order.id}?payment=${err.message === 'PAYMENT_DISMISSED' ? 'cancelled' : 'failed'}`, { replace: true });
        return;
      }
      setErrors(apiFieldErrors(err));
      setFormError(apiErrorMessage(err, 'Could not place your order.'));
      idempotencyKey.current = newKey();
      setSubmitting(false);
    }
  };

  const online = settings?.onlinePayments;

  return (
    <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
      <Link to="/cart" className="text-sm font-semibold text-berry hover:underline">Back to basket</Link>
      <h1 className="mt-2 text-4xl font-extrabold">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10">
          <fieldset>
            <legend className="font-display text-2xl font-bold">Delivery details</legend>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name}>
                <input className={`input ${errors.name ? 'input-error' : ''}`} autoComplete="name" value={form.name} onChange={update('name')} />
              </Field>
              <Field label="Mobile number" error={errors.phone} hint="We call this number if we can't find you">
                <input className={`input ${errors.phone ? 'input-error' : ''}`} inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.phone} onChange={update('phone')} />
              </Field>
              <Field label="Email" error={errors.email} className="sm:col-span-2">
                <input className={`input ${errors.email ? 'input-error' : ''}`} type="email" autoComplete="email" value={form.email} onChange={update('email')} />
              </Field>
              <Field label="Delivery address" error={errors.address} className="sm:col-span-2">
                <textarea rows={3} className={`input ${errors.address ? 'input-error' : ''}`} autoComplete="street-address" placeholder="House / flat, street, landmark, PIN code" value={form.address} onChange={update('address')} />
              </Field>
              <Field label="Note for the bakery (optional)" className="sm:col-span-2" hint="For example: write “Happy Birthday Riya” on the cake">
                <input className="input" maxLength={500} value={form.notes} onChange={update('notes')} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-2xl font-bold">Payment</legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MethodOption
                checked={method === 'RAZORPAY'}
                disabled={!online}
                onChange={() => setMethod('RAZORPAY')}
                icon={<Smartphone className="h-5 w-5" />}
                title="Pay online"
                body={online ? 'UPI, cards, netbanking via Razorpay' : 'Not available right now'}
              />
              <MethodOption
                checked={method === 'COD'}
                onChange={() => setMethod('COD')}
                icon={<Banknote className="h-5 w-5" />}
                title="Cash on delivery"
                body="Pay when your order arrives"
              />
            </div>
          </fieldset>
        </div>

        <aside className="panel h-fit p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-xl font-bold">Your order</h2>
          <ul className="mb-4 space-y-2 text-sm">
            {(quote?.lines ?? []).map((line) => (
              <li key={line.productId} className="flex justify-between gap-3">
                <span className="text-cocoa-soft">{line.quantity} × {line.name}</span>
                <span className="tabular-nums">{formatCurrency(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {quote ? (
            <OrderSummary subtotal={quote.subtotal} deliveryFee={quote.deliveryFee} total={quote.total} />
          ) : (
            <p className="text-sm text-cocoa-muted">Checking today&apos;s prices…</p>
          )}
          {formError && <div className="mt-4"><ErrorNote>{formError}</ErrorNote></div>}
          <button
            type="submit"
            className="btn-primary mt-6 w-full py-3 text-base"
            disabled={submitting || quoting || !quote || quote.lines.some((l) => !l.available)}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {submitting
              ? 'Placing your order…'
              : method === 'RAZORPAY'
                ? `Pay ${quote ? formatCurrency(quote.total) : ''}`
                : `Place order${quote ? ` · ${formatCurrency(quote.total)}` : ''}`}
          </button>
          {quote?.lines.some((l) => !l.available) && (
            <p className="mt-3 text-xs text-berry">Some items sold out. <Link to="/cart" className="underline">Update your basket</Link>.</p>
          )}
        </aside>
      </form>
    </div>
  );
}

function Field({ label, error, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error block">{error}</span> : hint ? <span className="field-hint block">{hint}</span> : null}
    </label>
  );
}

function MethodOption({ checked, disabled, onChange, icon, title, body }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
        checked ? 'border-berry bg-berry-light/50' : 'border-line bg-white hover:border-cocoa-muted'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input type="radio" name="method" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span className={checked ? 'text-berry' : 'text-cocoa-soft'}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-cocoa-muted">{body}</span>
      </span>
    </label>
  );
}
