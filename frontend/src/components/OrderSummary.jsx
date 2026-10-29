import { formatCurrency } from '../lib/format';

export default function OrderSummary({ subtotal, deliveryFee, total, children }) {
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between text-cocoa-soft">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-cocoa-soft">
        <dt>Delivery</dt>
        <dd className="tabular-nums font-medium text-cocoa">
          {deliveryFee > 0 ? formatCurrency(deliveryFee) : (
            <span className="text-pistachio font-semibold">Free 🎉</span>
          )}
        </dd>
      </div>
      {children}
      <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
        <dt>Total</dt>
        <dd className="tabular-nums text-berry">{formatCurrency(total)}</dd>
      </div>
    </dl>
  );
}
