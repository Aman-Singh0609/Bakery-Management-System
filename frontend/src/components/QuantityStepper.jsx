import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onChange, max = 50, size = 'md', label = 'Quantity' }) {
  const button = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div
      className="inline-flex items-center rounded-full border border-line bg-white shadow-sm"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={`${button} flex items-center justify-center rounded-full text-cocoa-soft transition-colors hover:bg-box-light hover:text-cocoa active:scale-90`}
        onClick={() => onChange(value - 1)}
        aria-label={value <= 1 ? 'Remove' : 'Decrease quantity'}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums text-cocoa" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${button} flex items-center justify-center rounded-full text-cocoa-soft transition-colors hover:bg-box-light hover:text-cocoa disabled:opacity-40 active:scale-90`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
