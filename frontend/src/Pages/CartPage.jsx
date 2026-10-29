import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCartQuote } from '../hooks/useCartQuote';
import { useStoreSettings } from '../hooks/useStore';
import { formatCurrency } from '../lib/format';
import ProductImage from '../components/ProductImage';
import QuantityStepper from '../components/QuantityStepper';
import OrderSummary from '../components/OrderSummary';
import { EmptyState, ErrorNote } from '../components/Feedback';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const { quote, loading, error } = useCartQuote();
  const settings = useStoreSettings();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-page px-4 pt-12 sm:px-6">
        <EmptyState
          title="Your basket is empty"
          action={<Link to="/menu" className="btn-primary">Browse the menu</Link>}
        >
          Add a few things from today&apos;s bake and they will show up here.
        </EmptyState>
      </div>
    );
  }

  const lineFor = (id) => quote?.lines.find((line) => line.productId === id);
  const problems = quote?.lines.filter((line) => !line.available) ?? [];
  const canCheckout = quote && problems.length === 0 && quote.lines.length > 0 && !loading;
  const freeAbove = settings?.freeDeliveryAbove ?? 0;
  const remainingForFree = quote && freeAbove > 0 && quote.deliveryFee > 0 ? freeAbove - quote.subtotal : 0;

  return (
    <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
      <div className="flex items-center gap-3 animate-fade-up">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-box-light">
          <ShoppingBag className="h-5 w-5 text-cocoa" />
        </div>
        <h1 className="text-4xl font-extrabold">Your basket</h1>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Items">
          {error && <ErrorNote>{error}</ErrorNote>}
          <ul className="divide-y divide-line border-y border-line">
            {cart.map((item) => {
              const line = lineFor(item.id);
              const price = line ? line.unitPrice : item.price;
              const short = line && !line.available;
              return (
                <li key={item.id} className="group flex gap-4 py-5 transition-colors hover:bg-white/60">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    category={item.category}
                    className="h-24 w-24 shrink-0 rounded-xl shadow-sm"
                    iconClass="h-8 w-8"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold leading-snug">{item.name}</h2>
                        <p className="text-sm text-cocoa-muted">{formatCurrency(price)} each</p>
                      </div>
                      <p className="font-bold tabular-nums text-cocoa">{formatCurrency(price * item.quantity)}</p>
                    </div>
                    {short && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-berry">
                        <AlertTriangle className="h-4 w-4" />
                        {line.stock === 0
                          ? 'Sold out. Please remove it.'
                          : `Only ${line.stock} left. Lower the quantity to continue.`}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={line ? Math.min(50, line.stock) : 50}
                        onChange={(qty) => updateQuantity(item.id, qty)}
                        label={`${item.name} quantity`}
                      />
                      <button
                        type="button"
                        className="btn-ghost text-sm opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link to="/menu" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-berry hover:underline">
            + Add more from the menu
          </Link>
        </section>

        <aside className="panel h-fit p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-xl font-bold">Order summary</h2>
          {quote ? (
            <OrderSummary subtotal={quote.subtotal} deliveryFee={quote.deliveryFee} total={quote.total}>
              {remainingForFree > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-pistachio-light px-3 py-2.5 text-xs text-[#4A6326]">
                  <span className="text-base">🎉</span>
                  Add {formatCurrency(remainingForFree)} more for free delivery!
                </div>
              )}
            </OrderSummary>
          ) : (
            <p className="text-sm text-cocoa-muted">Checking today&apos;s prices…</p>
          )}
          <button
            type="button"
            className="btn-primary mt-6 w-full py-3 text-base"
            disabled={!canCheckout}
            onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
          >
            {user ? 'Go to checkout →' : 'Sign in to check out'}
          </button>
          {problems.length > 0 && (
            <p className="mt-3 text-xs text-berry">⚠️ Fix the highlighted items to continue.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
