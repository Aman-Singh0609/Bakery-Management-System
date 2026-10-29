import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { asyncHandler, badRequest, conflict, notFound } from '../../lib/errors';
import { ORDER_INCLUDE, serialiseOrder, toPaise } from '../../lib/money';
import { checkoutLimiter } from '../../middleware/rateLimit';
import { getRazorpay, razorpayConfigured, verifyPaymentSignature, verifyWebhookSignature } from './razorpay';
import { attemptRefund } from './refund';

const router = Router();

router.get('/config', (_req, res) => {
  res.json({ data: { enabled: razorpayConfigured, keyId: razorpayConfigured ? env.RAZORPAY_KEY_ID : null, currency: 'INR' } });
});

async function findOwnOrder(req: Request, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== req.user!.id) throw notFound('Order not found');
  return order;
}

router.post(
  '/razorpay/order',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ orderId: z.string().min(1).max(64) }).parse(req.body);
    const order = await findOwnOrder(req, body.orderId);
    if (order.paymentMethod !== 'RAZORPAY') throw badRequest('This order is not an online-payment order');
    if (order.paymentStatus === 'PAID') return res.json({ data: { alreadyPaid: true } });
    if (order.status !== 'PENDING_PAYMENT') throw conflict('This order is no longer awaiting payment');

    let razorpayOrderId = order.razorpayOrderId;
    const amount = toPaise(order.totalAmount);

    if (!razorpayOrderId) {
      const razorpay = getRazorpay();
      const created = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.id, orderNumber: order.orderNumber },
      });

      razorpayOrderId = created.id;
      // Only attach the Razorpay order if no concurrent request already did.
      const attached = await prisma.order.updateMany({
        where: { id: order.id, razorpayOrderId: null },
        data: { razorpayOrderId },
      });
      if (attached.count === 1) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: 'razorpay',
            providerOrderId: razorpayOrderId,
            amount: order.totalAmount,
            status: 'PENDING',
          },
        });
      } else {
        razorpayOrderId = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).razorpayOrderId;
      }
    }

    return res.json({
      data: {
        keyId: env.RAZORPAY_KEY_ID,
        razorpayOrderId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount,
        currency: 'INR',
        prefill: { name: order.customerName, email: order.customerEmail, contact: order.customerPhone },
      },
    });
  }),
);

router.post(
  '/razorpay/verify',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        orderId: z.string().min(1).max(64),
        razorpay_order_id: z.string().min(1).max(64),
        razorpay_payment_id: z.string().min(1).max(64),
        razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid signature'),
      })
      .parse(req.body);

    const order = await findOwnOrder(req, body.orderId);
    if (order.paymentStatus === 'PAID') {
      const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
      return res.json({ data: serialiseOrder(current) });
    }

    if (!order.razorpayOrderId || order.razorpayOrderId !== body.razorpay_order_id) {
      throw badRequest('Payment does not match this order');
    }
    if (!verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      logger.warn({ orderId: order.id }, 'Rejected Razorpay payment with an invalid signature');
      throw badRequest('Payment verification failed');
    }

    await capturePayment(order.id, body.razorpay_order_id, body.razorpay_payment_id, undefined, 'Payment verified');
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
    return res.json({ data: serialiseOrder(updated) });
  }),
);

/**
 * Razorpay webhook. Mounted before the JSON parser so the HMAC is computed over the
 * exact bytes Razorpay signed.
 */
export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'];
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

  if (typeof signature !== 'string' || raw.length === 0 || !verifyWebhookSignature(raw, signature)) {
    logger.warn('Rejected Razorpay webhook with missing or invalid signature');
    return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } });
  }

  let event: { event?: string; payload?: unknown };
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Invalid webhook payload' } });
  }
  if (typeof event.event !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Missing event type' } });
  }

  // Razorpay sends a unique x-razorpay-event-id. Fall back to a hash of the signed body,
  // which is stable across retries of the same delivery.
  const headerId = req.headers['x-razorpay-event-id'];
  const eventId =
    typeof headerId === 'string' && headerId.length > 0 && headerId.length <= 128
      ? headerId
      : `sha256:${crypto.createHash('sha256').update(raw).digest('hex')}`;

  try {
    const already = await prisma.webhookEvent.findUnique({ where: { eventId } });
    if (already?.processedAt) return res.json({ received: true, duplicate: true });
    if (!already) {
      await prisma.webhookEvent
        .create({ data: { eventId, type: event.event, payload: event as never } })
        .catch((error: { code?: string }) => {
          if (error.code !== 'P2002') throw error;
        });
    }

    await handleWebhookEvent(event.event, event.payload as WebhookPayload);
    await prisma.webhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } });
    return res.json({ received: true });
  } catch (error) {
    logger.error({ err: error, eventId }, 'Razorpay webhook processing failed');
    return res.status(500).json({ error: { code: 'WEBHOOK_FAILED', message: 'Webhook processing failed' } });
  }
}

interface WebhookPayload {
  payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } };
  refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
}

/**
 * Marks an online order paid exactly once. If the order was cancelled before the
 * payment landed, the payment is recorded and refunded automatically.
 */
async function capturePayment(
  orderId: string,
  razorpayOrderId: string,
  paymentId: string | undefined,
  payload: unknown,
  note: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED') return;

  const lateAfterCancel = order.status === 'CANCELLED';
  const claimed = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { notIn: ['PAID', 'REFUNDED'] },
        status: lateAfterCancel ? 'CANCELLED' : 'PENDING_PAYMENT',
      },
      data: {
        paymentStatus: 'PAID',
        razorpayPaymentId: paymentId ?? order.razorpayPaymentId,
        ...(lateAfterCancel ? {} : { status: 'CONFIRMED' }),
      },
    });
    if (result.count !== 1) return false;

    await tx.payment.updateMany({
      where: { orderId: order.id, providerOrderId: razorpayOrderId },
      data: {
        providerPaymentId: paymentId,
        status: 'PAID',
        signatureVerified: true,
        ...(payload ? { rawPayload: payload as never } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: lateAfterCancel ? 'PAID' : 'CONFIRMED',
        note: lateAfterCancel ? 'Payment arrived after cancellation; refunding' : note,
      },
    });
    if (!lateAfterCancel) {
      await tx.outboxEvent.create({
        data: {
          topic: 'order.paid',
          payload: { orderId: order.id, orderNumber: order.orderNumber, amount: Number(order.totalAmount) },
        },
      });
    }
    return true;
  });

  if (claimed && lateAfterCancel) {
    const refunded = await attemptRefund(
      { ...order, razorpayPaymentId: paymentId ?? order.razorpayPaymentId },
      'Payment received after order was cancelled',
    );
    if (!refunded) {
      await prisma.outboxEvent.create({
        data: {
          topic: 'order.refund_required',
          payload: { orderId: order.id, orderNumber: order.orderNumber, amount: Number(order.totalAmount) },
        },
      });
    }
  }
}

async function handleWebhookEvent(type: string, payload: WebhookPayload | undefined) {
  if (type === 'refund.processed') {
    const paymentId = payload?.refund?.entity?.payment_id;
    if (!paymentId) return;
    const order = await prisma.order.findFirst({ where: { razorpayPaymentId: paymentId } });
    if (!order) {
      logger.warn({ paymentId }, 'Refund webhook references an unknown payment');
      return;
    }
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'REFUNDED' } }),
      prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: 'REFUNDED' } }),
      prisma.orderStatusHistory.create({
        data: { orderId: order.id, status: 'REFUNDED', note: 'Refund processed by Razorpay' },
      }),
    ]);
    return;
  }

  const payment = payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id;
  if (!razorpayOrderId) return;

  const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
  if (!order) {
    logger.warn({ razorpayOrderId, type }, 'Webhook references an unknown order');
    return;
  }

  if (type === 'payment.captured' || type === 'order.paid') {
    // The Razorpay order was created server-side for the exact total, but check anyway.
    if (payment?.amount !== undefined && payment.amount !== toPaise(order.totalAmount)) {
      logger.error(
        { orderId: order.id, expected: toPaise(order.totalAmount), received: payment.amount },
        'Webhook payment amount does not match the order total; not marking paid',
      );
      return;
    }
    if (payment?.currency && payment.currency !== 'INR') {
      logger.error({ orderId: order.id, currency: payment.currency }, 'Unexpected payment currency');
      return;
    }
    await capturePayment(order.id, razorpayOrderId, payment?.id, payload, 'Payment captured');
  } else if (type === 'payment.failed') {
    const updated = await prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED' },
    });
    if (updated.count === 1) {
      await prisma.payment.updateMany({
        where: { orderId: order.id, providerOrderId: razorpayOrderId },
        data: { status: 'FAILED', rawPayload: payload as never },
      });
    }
  }
}

export default router;
