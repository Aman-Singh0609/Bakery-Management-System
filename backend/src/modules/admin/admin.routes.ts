import { Router } from 'express';
import { z } from 'zod';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError, asyncHandler, badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { paginationMeta, paginationSchema, skipTake } from '../../lib/pagination';
import { ORDER_INCLUDE, serialiseOrder } from '../../lib/money';
import { audit } from '../../lib/audit';
import { canTransitionManually, defaultStatusNote, MANUAL_TRANSITIONS, OPEN_STATUSES } from '../../lib/orderStatus';
import { requireRole } from '../../middleware/auth';
import { attemptRefund } from '../payments/refund';
import { razorpayConfigured } from '../payments/razorpay';
import { cancelOrder } from '../orders/orders.service';

const router = Router();

const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const satisfies readonly OrderStatus[];

const idParam = z.object({ id: z.string().min(1).max(64) });

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const query = paginationSchema
      .extend({
        status: z.union([z.enum(ORDER_STATUSES), z.literal('OPEN')]).optional(),
        search: z.string().trim().max(120).optional(),
      })
      .parse(req.query);

    const where: Prisma.OrderWhereInput = {};
    if (query.status === 'OPEN') where.status = { in: OPEN_STATUSES };
    else if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { customerEmail: { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search } },
      ];
    }

    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
    ]);

    return res.json({
      data: orders.map((order) => ({ ...serialiseOrder(order), allowedTransitions: MANUAL_TRANSITIONS[order.status] })),
      meta: paginationMeta(query.page, query.limit, total),
    });
  }),
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw notFound('Order not found');
    return res.json({ data: { ...serialiseOrder(order), allowedTransitions: MANUAL_TRANSITIONS[order.status] } });
  }),
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = z
      .object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() })
      .parse(req.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw notFound('Order not found');

    if (!canTransitionManually(order.status, body.status)) {
      throw conflict(`Cannot move an order from ${order.status} to ${body.status}`, {
        allowed: MANUAL_TRANSITIONS[order.status],
      });
    }
    if (body.status === 'REFUNDED' && req.user!.role !== 'ADMIN') {
      throw forbidden('Only an administrator can refund orders');
    }

    let updated;
    if (body.status === 'CANCELLED') {
      updated = await cancelOrder({
        orderId: id,
        allowedFrom: [order.status],
        note: body.note || 'Cancelled by the bakery',
        markPaymentFailed: order.status === 'PENDING_PAYMENT',
      });
    } else if (body.status === 'REFUNDED') {
      // Refund the money first; only then record the order as refunded.
      if (order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'PAID') {
        if (!razorpayConfigured) throw badRequest('Razorpay is not configured, so this refund must be made manually.');
        const refunded = await attemptRefund(order, body.note || 'Refunded by the bakery');
        if (!refunded) throw new AppError(502, 'Razorpay could not process the refund. Nothing was changed.', 'REFUND_FAILED');
      }
      updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id, status: order.status },
          data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
        });
        if (claimed.count !== 1) throw conflict('This order was updated by someone else. Refresh and try again.');
        await tx.payment.updateMany({ where: { orderId: id }, data: { status: 'REFUNDED' } });
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            status: 'REFUNDED',
            note: body.note || (order.paymentMethod === 'COD' ? 'Cash refunded by the bakery' : 'Refunded by the bakery'),
          },
        });
        return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
      });
    } else {
      updated = await prisma.$transaction(async (tx) => {
        const data: Prisma.OrderUpdateManyMutationInput = { status: body.status };
        if (body.status === 'DELIVERED' && order.paymentMethod === 'COD') data.paymentStatus = 'PAID';

        const claimed = await tx.order.updateMany({ where: { id, status: order.status }, data });
        if (claimed.count !== 1) throw conflict('This order was updated by someone else. Refresh and try again.');

        await tx.orderStatusHistory.create({
          data: { orderId: id, status: body.status, note: body.note || defaultStatusNote(body.status) },
        });
        if (body.status === 'DELIVERED') {
          await tx.outboxEvent.create({
            data: { topic: 'order.delivered', payload: { orderId: id, orderNumber: order.orderNumber } },
          });
        }
        return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
      });
    }

    await audit(req, 'order.status', 'order', id, { from: order.status, to: body.status, note: body.note });
    return res.json({ data: { ...serialiseOrder(updated), allowedTransitions: MANUAL_TRANSITIONS[updated.status] } });
  }),
);

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(startOfDay);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const revenueWhere: Prisma.OrderWhereInput = { paymentStatus: 'PAID', status: { notIn: ['CANCELLED', 'REFUNDED'] } };

    const [revenueAgg, todayRevenueAgg, totalOrders, todayOrders, openOrders, lowStock, topItems, recentPaid] =
      await prisma.$transaction([
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: revenueWhere }),
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { ...revenueWhere, createdAt: { gte: startOfDay } } }),
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.order.count({ where: { status: { in: OPEN_STATUSES } } }),
        prisma.product.findMany({
          where: { deletedAt: null, active: true, stock: { lt: 10 } },
          select: { id: true, name: true, stock: true },
          orderBy: { stock: 'asc' },
          take: 10,
        }),
        prisma.orderItem.groupBy({
          by: ['productName'],
          where: { order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        prisma.order.findMany({
          where: { ...revenueWhere, createdAt: { gte: weekAgo } },
          select: { createdAt: true, totalAmount: true },
        }),
      ]);

    const localKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekAgo);
      day.setDate(weekAgo.getDate() + i);
      return { date: localKey(day), revenue: 0, orders: 0 };
    });
    const byKey = new Map(days.map((day) => [day.date, day]));
    for (const order of recentPaid) {
      const bucket = byKey.get(localKey(new Date(order.createdAt)));
      if (bucket) {
        bucket.revenue += Number(order.totalAmount);
        bucket.orders += 1;
      }
    }

    return res.json({
      data: {
        revenue: Number(revenueAgg._sum.totalAmount ?? 0),
        todayRevenue: Number(todayRevenueAgg._sum.totalAmount ?? 0),
        totalOrders,
        todayOrders,
        pendingOrders: openOrders,
        lowStock,
        topItems: topItems.map((item) => ({ name: item.productName, quantity: item._sum?.quantity ?? 0 })),
        last7Days: days,
      },
    });
  }),
);

router.get(
  '/audit',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const query = paginationSchema.parse(req.query);
    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
    ]);
    return res.json({ data: logs, meta: paginationMeta(query.page, query.limit, total) });
  }),
);

router.get(
  '/users',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const query = paginationSchema.extend({ search: z.string().trim().max(120).optional() }).parse(req.query);
    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, _count: { select: { orders: true } } },
        orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
        ...skipTake(query.page, query.limit),
      }),
    ]);
    return res.json({
      data: users.map(({ _count, ...user }) => ({ ...user, orderCount: _count.orders })),
      meta: paginationMeta(query.page, query.limit, total),
    });
  }),
);

router.patch(
  '/users/:id/role',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { role } = z.object({ role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']) }).parse(req.body);
    if (id === req.user!.id) throw badRequest('You cannot change your own role');

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFound('User not found');

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { role },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      });
      // Sign the user out everywhere so the new role applies to fresh sessions only.
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      return user;
    });

    await audit(req, 'user.role', 'user', id, { from: target.role, to: role });
    return res.json({ data: updated });
  }),
);

router.get(
  '/diagnostics',
  asyncHandler(async (_req, res) => {
    const memory = process.memoryUsage();
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startDb;

    const [ordersByStatus, outboxStats, lowStockCount, outOfStockCount, totalUsers] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.outboxEvent.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.product.count({ where: { deletedAt: null, active: true, stock: { gt: 0, lt: 10 } } }),
      prisma.product.count({ where: { deletedAt: null, active: true, stock: 0 } }),
      prisma.user.count(),
    ]);

    const orderStatusCounts: Record<string, number> = {};
    for (const item of ordersByStatus) orderStatusCounts[item.status] = item._count._all;
    const outboxCounts: Record<string, number> = {};
    for (const item of outboxStats) outboxCounts[item.status] = item._count._all;

    return res.json({
      data: {
        server: {
          uptimeSeconds: Math.floor(process.uptime()),
          memory: {
            rssMb: Math.round(memory.rss / (1024 * 1024)),
            heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
            heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
          },
        },
        database: { status: 'HEALTHY', latencyMs: dbLatencyMs },
        payments: { razorpayConfigured },
        orders: { byStatus: orderStatusCounts },
        outbox: {
          pending: outboxCounts.PENDING || 0,
          processing: outboxCounts.PROCESSING || 0,
          done: outboxCounts.DONE || 0,
          failed: outboxCounts.FAILED || 0,
        },
        inventory: { lowStockCount, outOfStockCount },
        users: { totalUsers },
      },
    });
  }),
);

export default router;
