import { Check, Package, ChefHat, Bike, PartyPopper } from 'lucide-react';
import { formatDateTime } from '../lib/format';

const STEPS = [
  { key: 'CONFIRMED', label: 'Confirmed', Icon: Check },
  { key: 'PREPARING', label: 'Baking', Icon: ChefHat },
  { key: 'OUT_FOR_DELIVERY', label: 'On the way', Icon: Bike },
  { key: 'DELIVERED', label: 'Delivered', Icon: PartyPopper },
];

/** The four delivery stages, with the time each was reached. */
export default function OrderProgress({ order }) {
  if (['CANCELLED', 'REFUNDED', 'PENDING_PAYMENT'].includes(order.status)) return null;
  const reached = new Map();
  for (const entry of order.statusHistory || []) {
    if (!reached.has(entry.status)) reached.set(entry.status, entry.createdAt);
  }
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.key === order.status),
  );

  return (
    <ol className="flex gap-0" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
        const { Icon } = step;
        return (
          <li key={step.key} className="flex flex-1 flex-col items-center gap-2">
            {/* Connector line (not for first step) + icon */}
            <div className="flex w-full items-center">
              {index > 0 && (
                <div className={`h-0.5 flex-1 transition-colors duration-500 ${done ? 'bg-pistachio' : 'bg-line'}`} />
              )}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  done
                    ? active
                      ? 'border-pistachio bg-pistachio text-white shadow-md shadow-pistachio/30'
                      : 'border-pistachio bg-pistachio text-white'
                    : 'border-line bg-white text-cocoa-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 transition-colors duration-500 ${index < currentIndex ? 'bg-pistachio' : 'bg-line'}`} />
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className={`text-xs font-semibold ${done ? 'text-cocoa' : 'text-cocoa-muted'}`}>
                {step.label}
              </span>
              {reached.get(step.key) && (
                <span className="text-[10px] text-cocoa-muted">{formatDateTime(reached.get(step.key))}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
