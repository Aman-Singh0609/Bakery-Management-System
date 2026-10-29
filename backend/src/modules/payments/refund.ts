import type { PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { toPaise } from '../../lib/money';
import { getRazorpay, razorpayConfigured } from './razorpay';

interface RefundableOrder {
  id: string;
  totalAmount: Prisma.Decimal;
  paymentMethod: PaymentMethod;
  razorpayPaymentId: string | null;
}

/**
 * Starts a full Razorpay refund. Returns true only when Razorpay accepted it; the
 * payment is then marked REFUNDED. Returns false (and changes nothing) otherwise, so
 * callers can raise a manual-refund task.
 */
export async function attemptRefund(order: RefundableOrder, reason: string): Promise<boolean> {
  if (order.paymentMethod !== 'RAZORPAY' || !order.razorpayPaymentId) return false;
  if (!razorpayConfigured) {
    logger.warn({ orderId: order.id }, 'Order paid but Razorpay is not configured; manual refund required');
    return false;
  }

  try {
    const razorpay = getRazorpay();
    await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: toPaise(order.totalAmount),
      notes: { orderId: order.id, reason },
    });
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, 'Automatic refund failed; manual refund required');
    return false;
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'REFUNDED' } }),
    prisma.payment.updateMany({ where: { orderId: order.id, status: 'PAID' }, data: { status: 'REFUNDED' } }),
    prisma.orderStatusHistory.create({
      data: { orderId: order.id, status: 'REFUNDED', note: 'Refund initiated via Razorpay' },
    }),
  ]);
  return true;
}
