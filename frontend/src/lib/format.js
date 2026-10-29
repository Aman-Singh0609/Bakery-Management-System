const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const formatCurrency = (value) => currency.format(Number(value) || 0);

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const STATUS_LABELS = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Being prepared',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ACTION_LABELS = {
  CONFIRMED: 'Confirm',
  PREPARING: 'Start preparing',
  OUT_FOR_DELIVERY: 'Send out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
  REFUNDED: 'Refund',
};

export const PAYMENT_LABELS = {
  COD: 'Cash on delivery',
  RAZORPAY: 'Paid online',
};

export const PAYMENT_STATUS_LABELS = {
  PENDING: 'Payment pending',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  REFUNDED: 'Refunded',
};
