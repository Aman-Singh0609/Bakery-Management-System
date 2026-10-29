import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, notFound } from '../../lib/errors';
import { paginationMeta, paginationSchema, skipTake } from '../../lib/pagination';
import { serialiseProduct } from '../../lib/money';
import { cartItemsSchema, quoteCart } from '../../lib/pricing';
import { razorpayConfigured } from '../payments/razorpay';

const router = Router();

const listQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name', 'featured']).default('featured'),
});

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = listQuery.parse(req.query);
    const where: Prisma.ProductWhereInput = { active: true, deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { category: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.category && query.category.toLowerCase() !== 'all') {
      where.category = { slug: query.category.toLowerCase() };
    }
    if (query.featured === 'true') where.featured = true;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'price_asc'
        ? [{ price: 'asc' }]
        : query.sort === 'price_desc'
          ? [{ price: 'desc' }]
          : query.sort === 'name'
            ? [{ name: 'asc' }]
            : query.sort === 'newest'
              ? [{ createdAt: 'desc' }]
              : [{ featured: 'desc' }, { name: 'asc' }];

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [...orderBy, { id: 'asc' }],
        include: { category: true },
        ...skipTake(query.page, query.limit),
      }),
    ]);

    return res.json({
      data: products.map(serialiseProduct),
      meta: paginationMeta(query.page, query.limit, total),
    });
  }),
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1).max(64) }).parse(req.params);
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null, active: true },
      include: { category: true },
    });
    if (!product) throw notFound('Product not found');
    return res.json({ data: serialiseProduct(product) });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { active: true, deletedAt: null } } } } },
    });
    return res.json({
      data: categories
        .filter((c) => c._count.products > 0)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: c._count.products })),
    });
  }),
);

/** Public store settings the storefront needs before checkout. */
router.get('/store', (_req, res) => {
  res.json({
    data: {
      deliveryFee: env.DELIVERY_FEE,
      freeDeliveryAbove: env.FREE_DELIVERY_ABOVE,
      onlinePayments: razorpayConfigured,
      currency: 'INR',
    },
  });
});

/**
 * Re-prices a cart against the live catalogue so the storefront always shows the
 * same numbers the server will charge, and flags sold-out or removed items.
 */
router.post(
  '/cart/quote',
  asyncHandler(async (req, res) => {
    const { items } = z.object({ items: cartItemsSchema }).parse(req.body);
    const quote = await quoteCart(prisma, items);
    return res.json({
      data: {
        lines: quote.lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          image: line.image,
          category: line.category,
          unitPrice: Number(line.unitPrice),
          quantity: line.quantity,
          requestedQuantity: line.requestedQuantity,
          stock: line.stock,
          lineTotal: Number(line.lineTotal),
          available: line.available,
        })),
        missing: quote.missing,
        subtotal: Number(quote.subtotal),
        deliveryFee: Number(quote.deliveryFee),
        total: Number(quote.total),
      },
    });
  }),
);

export default router;
