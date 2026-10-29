import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/format';
import ProductImage from './ProductImage';
import QuantityStepper from './QuantityStepper';

export default function ProductCard({ product }) {
  const { addToCart, updateQuantity, quantityOf } = useCart();
  const inBasket = quantityOf(product.id);
  const soldOut = product.stock === 0;
  const maxQty = Math.min(50, product.stock);
  const lowStock = !soldOut && product.stock <= 5;

  return (
    <article className="group flex flex-col">
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-box-light shadow-sm transition-shadow duration-300 group-hover:shadow-md">
        <ProductImage
          src={product.image}
          alt={product.name}
          category={product.category}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.05]"
        />
        {/* Overlay gradient for legibility */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-cocoa/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-cocoa-soft shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:text-xs">
            Sold out today
          </span>
        ) : lowStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-berry text-white px-2.5 py-1 text-[11px] font-semibold shadow-sm sm:left-3 sm:top-3 sm:text-xs">
            Only {product.stock} left!
          </span>
        ) : null}

        {/* Quick-add button that floats in on hover when not in basket */}
        {!inBasket && !soldOut && (
          <button
            type="button"
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-berry text-white shadow-md opacity-0 transition-all duration-200 hover:bg-berry-dark group-hover:opacity-100 sm:bottom-3 sm:right-3"
            onClick={() => addToCart(product)}
            aria-label={`Add ${product.name} to basket`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h3 className="text-base font-bold leading-snug text-cocoa sm:text-[17px]">{product.name}</h3>
          <span className="shrink-0 font-semibold tabular-nums text-berry">{formatCurrency(product.price)}</span>
        </div>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-cocoa-soft">{product.description}</p>
        )}
        <div className="mt-auto pt-3">
          {inBasket > 0 ? (
            <QuantityStepper
              size="sm"
              value={inBasket}
              max={maxQty}
              onChange={(qty) => updateQuantity(product.id, qty)}
              label={`${product.name} quantity`}
            />
          ) : (
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              disabled={soldOut}
              onClick={() => addToCart(product)}
              aria-label={`Add ${product.name} to basket`}
            >
              <Plus className="h-4 w-4" /> {soldOut ? 'Sold out' : 'Add to basket'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
