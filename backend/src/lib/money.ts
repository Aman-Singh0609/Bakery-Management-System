import { Prisma } from '@prisma/client';

export const toDecimal = (value: number | string | Prisma.Decimal) => new Prisma.Decimal(value);

export const money = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value).toFixed(2);

/** Converts a rupee amount to integer paise for payment gateways, without float drift. */
export const toPaise = (value: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(value).mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();

export const serialiseProduct = (product: {
  id: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  stock: number;
  image: string | null;
  active: boolean;
  featured?: boolean;
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: Number(product.price),
  stock: product.stock,
  image: product.image,
  active: product.active,
  featured: product.featured ?? false,
  categoryId: product.categoryId,
  category: product.category?.name ?? null,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: true;
    statusHistory: true;
    user: { select: { id: true; name: true; email: true } };
  };
}>;

export const serialiseOrder = (order: Partial<OrderWithRelations> & Prisma.OrderGetPayload<object>) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  customerPhone: order.customerPhone,
  customerAddress: order.customerAddress,
  subtotal: Number(order.subtotal),
  deliveryFee: Number(order.deliveryFee),
  totalAmount: Number(order.totalAmount),
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  status: order.status,
  notes: order.notes,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  items: (order.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
  })),
  statusHistory: (order.statusHistory ?? []).map((entry) => ({
    status: entry.status,
    note: entry.note,
    createdAt: entry.createdAt,
  })),
  user: order.user ? { id: order.user.id, name: order.user.name, email: order.user.email } : undefined,
});

export const ORDER_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;
