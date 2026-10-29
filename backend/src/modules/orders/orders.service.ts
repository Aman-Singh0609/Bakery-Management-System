import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { conflict } from '../../lib/errors';
import { ORDER_INCLUDE } from '../../lib/money';
import { attemptRefund } from '../payments/refund';

export async function restoreStock(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { productId: 'asc' } });
  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

interface CancelOptions {
  orderId: string;
  /** Only cancel if the order is currently in one of these states. */
  allowedFrom: OrderStatus[];
  note: string;
  /** For expired online orders: mark the pending payment as failed. */
  markPaymentFailed?: boolean;
}

/**
 * Cancels an order atomically: claims the status change, releases the reserved stock,
 * writes history and outbox events, then (outside the transaction) refunds a paid
 * online order. Throws a 409 if another request changed the order first.
 */
export async function cancelOrder({ orderId, allowedFrom, note, markPaymentFailed }: CancelOptions) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw conflict('Order not found');

    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: allowedFrom } },
      data: {
        status: 'CANCELLED',
        ...(markPaymentFailed && order.paymentStatus === 'PENDING' ? { paymentStatus: 'FAILED' } : {}),
      },
    });
    if (claimed.count !== 1) throw conflict('This order can no longer be cancelled');

    await restoreStock(tx, orderId);
    await tx.orderStatusHistory.create({ data: { orderId, status: 'CANCELLED', note } });
    await tx.outboxEvent.create({
      data: { topic: 'order.cancelled', payload: { orderId, orderNumber: order.orderNumber } },
    });
    return order;
  });

  if (cancelled.paymentStatus === 'PAID') {
    const refunded = await attemptRefund(cancelled, 'Order cancelled');
    if (!refunded) {
      await prisma.outboxEvent.create({
        data: {
          topic: 'order.refund_required',
          payload: {
            orderId,
            orderNumber: cancelled.orderNumber,
            amount: Number(cancelled.totalAmount),
          },
        },
      });
    }
  }

  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
}
