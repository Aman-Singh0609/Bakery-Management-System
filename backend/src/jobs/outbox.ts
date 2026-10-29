import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { cancelOrder } from '../modules/orders/orders.service';

const MAX_ATTEMPTS = 5;
const UNPAID_ORDER_TTL_MS = 30 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;
let running = false;
let lastCleanup = 0;

async function handleEvent(topic: string, payload: Record<string, unknown>) {
  switch (topic) {
    case 'order.created':
      // Hook for a confirmation email or a kitchen display notification.
      logger.info({ topic, orderId: payload.orderId, orderNumber: payload.orderNumber }, 'Order created');
      break;
    case 'order.paid':
      logger.info({ topic, orderId: payload.orderId, amount: payload.amount }, 'Order paid');
      break;
    case 'order.cancelled':
      logger.info({ topic, orderId: payload.orderId }, 'Order cancelled');
      break;
    case 'order.delivered':
      logger.info({ topic, orderId: payload.orderId }, 'Order delivered');
      break;
    case 'order.refund_required':
      logger.warn({ topic, orderId: payload.orderId, amount: payload.amount }, 'Manual refund required');
      break;
    default:
      logger.warn({ topic }, 'Unhandled outbox topic');
  }
}

export async function processOutbox(batchSize = 20) {
  // Recover events left in PROCESSING by a crashed worker (their lease has expired).
  await prisma.outboxEvent.updateMany({
    where: { status: 'PROCESSING', availableAt: { lte: new Date() } },
    data: { status: 'PENDING' },
  });

  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING', availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  for (const event of events) {
    const claim = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: 'PENDING' },
      data: { status: 'PROCESSING', availableAt: new Date(Date.now() + 60_000) },
    });
    if (claim.count !== 1) continue;

    try {
      await handleEvent(event.topic, (event.payload ?? {}) as Record<string, unknown>);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'DONE', processedAt: new Date() },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
          availableAt: new Date(Date.now() + attempts * attempts * 5000),
        },
      });
    }
  }
}

/** Unpaid online orders release their reserved stock after 30 minutes. */
export async function releaseExpiredPendingOrders() {
  const cutoff = new Date(Date.now() - UNPAID_ORDER_TTL_MS);
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
    select: { id: true },
    take: 50,
  });

  for (const order of stale) {
    try {
      await cancelOrder({
        orderId: order.id,
        allowedFrom: ['PENDING_PAYMENT'],
        note: 'Payment window expired',
        markPaymentFailed: true,
      });
      logger.info({ orderId: order.id }, 'Released stock for expired unpaid order');
    } catch (error) {
      // A 409 means the order was paid or cancelled in the meantime, which is fine.
      if ((error as { statusCode?: number }).statusCode !== 409) {
        logger.error({ err: error, orderId: order.id }, 'Failed to expire unpaid order');
      }
    }
  }
}

/** Housekeeping: drop refresh tokens that can no longer be used. */
async function cleanupTokens() {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return;
  lastCleanup = Date.now();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  });
  if (count > 0) logger.info({ count }, 'Removed stale refresh tokens');
}

export function startOutboxWorker(intervalMs = 10_000) {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processOutbox();
      await releaseExpiredPendingOrders();
      await cleanupTokens();
    } catch (error) {
      logger.error({ err: error }, 'Background worker iteration failed');
    } finally {
      running = false;
    }
  };
  timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  void tick();
}

export function stopOutboxWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
