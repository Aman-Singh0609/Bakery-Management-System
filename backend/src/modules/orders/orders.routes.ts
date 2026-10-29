import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, badRequest, conflict, notFound } from '../../lib/errors';
import { paginationMeta, paginationSchema, skipTake } from '../../lib/pagination';
import { ORDER_INCLUDE, serialiseOrder } from '../../lib/money';
import { cartItemsSchema, quoteCart } from '../../lib/pricing';
import { CUSTOMER_CANCELLABLE, OPEN_STATUSES } from '../../lib/orderStatus';
import { checkoutLimiter } from '../../middleware/rateLimit';
import { razorpayConfigured } from '../payments/razorpay';
import { cancelOrder } from './orders.service';

const router = Router();

const createOrderSchema = z.object({
  items: cartItemsSchema,
  customer: z.object({
    name: z.string().trim().min(2, 'Please enter your name').max(120),
    email: z.string().trim().toLowerCase().email('Please enter a valid email').max(255),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
    address: z.string().trim().min(10, 'Please enter your full delivery address').max(500),
  }),
  paymentMethod: z.enum(['RAZORPAY', 'COD']),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `AMY-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/** Reserves stock row by row in id order (so concurrent checkouts cannot deadlock). */
async function reserveStock(tx: Prisma.TransactionClient, lines: Array<{ productId: string; quantity: number }>) {
  const ordered = [...lines].sort((a, b) => a.productId.localeCompare(b.productId));
  for (const line of ordered) {
    const updated = await tx.product.updateMany({
      where: { id: line.productId, deletedAt: null, active: true, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (updated.count !== 1) {
      throw conflict('Some items in your cart just sold out. Please review your cart.', {
        productId: line.productId,
      });
    }
  }
}

router.post(
  '/',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    const userId = req.user!.id;
    const headerKey = req.headers['idempotency-key'];
    const idempotencyKey = (typeof headerKey === 'string' ? headerKey.trim() : '') || body.idempotencyKey;
    if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 128)) {
      throw badRequest('Idempotency-Key must be 8-128 characters');
    }

    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({ where: { userId, idempotencyKey }, include: ORDER_INCLUDE });
      if (existing) return res.status(200).json({ data: serialiseOrder(existing), idempotent: true });
    }

    if (body.paymentMethod === 'RAZORPAY' && !razorpayConfigured) {
      throw badRequest('Online payment is not available right now. Please choose cash on delivery.');
    }

    // Stops one account from reserving the whole bakery's stock with unpaid orders.
    const openOrders = await prisma.order.count({ where: { userId, status: { in: OPEN_STATUSES } } });
    if (openOrders >= env.MAX_OPEN_ORDERS_PER_CUSTOMER) {
      throw conflict(
        `You already have ${openOrders} open orders. Please wait for them to be delivered or cancel one first.`,
      );
    }

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const quote = await quoteCart(tx, body.items);
        if (quote.missing.length > 0) {
          throw badRequest('Some items in your cart are no longer on the menu. Please review your cart.', {
            missing: quote.missing,
          });
        }
        const short = quote.lines.filter((line) => !line.available);
        if (short.length > 0) {
          throw conflict('Some items do not have enough stock. Please review your cart.', {
            items: short.map((line) => ({ productId: line.productId, available: line.stock })),
          });
        }

        const isCod = body.paymentMethod === 'COD';
        const initialStatus = isCod ? 'CONFIRMED' : 'PENDING_PAYMENT';

        await reserveStock(tx, quote.lines);

        const created = await tx.order.create({
          data: {
            orderNumber: orderNumber(),
            userId,
            customerName: body.customer.name,
            customerEmail: body.customer.email,
            customerPhone: body.customer.phone,
            customerAddress: body.customer.address,
            subtotal: quote.subtotal,
            deliveryFee: quote.deliveryFee,
            totalAmount: quote.total,
            paymentMethod: body.paymentMethod,
            paymentStatus: 'PENDING',
            status: initialStatus,
            idempotencyKey: idempotencyKey || null,
            notes: body.notes || null,
            items: {
              create: quote.lines.map((line) => ({
                productId: line.productId,
                productName: line.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
              })),
            },
            statusHistory: {
              create: {
                status: initialStatus,
                note: isCod ? 'Order placed (cash on delivery)' : 'Order placed, awaiting payment',
              },
            },
          },
          include: ORDER_INCLUDE,
        });

        await tx.outboxEvent.create({
          data: {
            topic: 'order.created',
            payload: {
              orderId: created.id,
              orderNumber: created.orderNumber,
              total: Number(quote.total),
              paymentMethod: created.paymentMethod,
            },
          },
        });

        return created;
      });
    } catch (error) {
      if (idempotencyKey && (error as { code?: string }).code === 'P2002') {
        const existing = await prisma.order.findFirst({ where: { userId, idempotencyKey }, include: ORDER_INCLUDE });
        if (existing) return res.status(200).json({ data: serialiseOrder(existing), idempotent: true });
      }
      throw error;
    }

    return res.status(201).json({ data: serialiseOrder(order) });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = paginationSchema.parse(req.query);
    const where = { userId: req.user!.id };

    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
    ]);

    return res.json({ data: orders.map(serialiseOrder), meta: paginationMeta(query.page, query.limit, total) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1).max(64) }).parse(req.params);
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    // Respond 404 rather than 403 so order ids cannot be probed.
    if (!order) throw notFound('Order not found');
    if (order.userId !== req.user!.id && !['ADMIN', 'STAFF'].includes(req.user!.role)) {
      throw notFound('Order not found');
    }
    return res.json({ data: serialiseOrder(order) });
  }),
);

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1).max(64) }).parse(req.params);
    const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {});

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.userId !== req.user!.id) throw notFound('Order not found');
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw conflict('This order is already being prepared and can no longer be cancelled. Please contact the bakery.');
    }

    const updated = await cancelOrder({
      orderId: id,
      allowedFrom: CUSTOMER_CANCELLABLE,
      note: reason || 'Cancelled by customer',
      markPaymentFailed: order.status === 'PENDING_PAYMENT',
    });

    return res.json({ data: serialiseOrder(updated) });
  }),
);

export default router;
