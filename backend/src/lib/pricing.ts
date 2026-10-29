import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().trim().min(1).max(64),
      quantity: z.coerce.number().int().min(1).max(50),
    }),
  )
  .min(1, 'Your cart is empty')
  .max(50);

type Db = Pick<Prisma.TransactionClient, 'product'>;

export interface CartLineInput {
  productId: string;
  quantity: number;
}

export interface QuoteLine {
  productId: string;
  name: string;
  image: string | null;
  category: string | null;
  unitPrice: Prisma.Decimal;
  quantity: number;
  requestedQuantity: number;
  stock: number;
  lineTotal: Prisma.Decimal;
  available: boolean;
}

export function mergeLines(items: CartLineInput[]) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return quantities;
}

export function deliveryFeeFor(subtotal: Prisma.Decimal) {
  if (subtotal.lte(0)) return new Prisma.Decimal(0);
  if (env.FREE_DELIVERY_ABOVE > 0 && subtotal.gte(env.FREE_DELIVERY_ABOVE)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(env.DELIVERY_FEE);
}

/**
 * Prices a cart from the database. The client only ever sends product ids and
 * quantities; every price and total comes from here.
 */
export async function quoteCart(db: Db, items: CartLineInput[]) {
  const quantities = mergeLines(items);
  const productIds = [...quantities.keys()].sort();

  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: QuoteLine[] = [];
  const missing: string[] = [];
  let subtotal = new Prisma.Decimal(0);

  for (const productId of productIds) {
    const product = byId.get(productId);
    const requested = quantities.get(productId)!;
    if (!product || !product.active || product.deletedAt) {
      missing.push(productId);
      continue;
    }
    const quantity = Math.min(requested, product.stock);
    const lineTotal = product.price.mul(quantity);
    subtotal = subtotal.add(lineTotal);
    lines.push({
      productId,
      name: product.name,
      image: product.image,
      category: product.category?.name ?? null,
      unitPrice: product.price,
      quantity,
      requestedQuantity: requested,
      stock: product.stock,
      lineTotal,
      available: product.stock >= requested,
    });
  }

  const deliveryFee = deliveryFeeFor(subtotal);
  return { lines, missing, subtotal, deliveryFee, total: subtotal.add(deliveryFee) };
}
