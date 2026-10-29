import type { OrderStatus } from '@prisma/client';

/** Every transition the system itself may perform. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CONFIRMED', 'CANCELLED'],
  PAID: ['CONFIRMED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Transitions staff may trigger by hand. An online order can only become PAID through
 * a verified Razorpay payment, never because someone clicked a button.
 */
export const MANUAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['CONFIRMED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/** Customers may cancel until the kitchen starts preparing their order. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED'];

/** States that still hold reserved stock and count as "open" for a customer. */
export const OPEN_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  ORDER_TRANSITIONS[from]?.includes(to) ?? false;

export const canTransitionManually = (from: OrderStatus, to: OrderStatus): boolean =>
  MANUAL_TRANSITIONS[from]?.includes(to) ?? false;

/** Customer-facing notes used when a status change has no custom note. */
export function defaultStatusNote(status: OrderStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Order confirmed';
    case 'PREPARING':
      return 'The kitchen is preparing your order';
    case 'OUT_FOR_DELIVERY':
      return 'Out for delivery';
    case 'DELIVERED':
      return 'Delivered';
    default:
      return 'Status updated by the bakery';
  }
}
