import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { asyncHandler, notFound } from '../../lib/errors';
import { paginationMeta, paginationSchema, skipTake } from '../../lib/pagination';
import { serialiseProduct, toDecimal } from '../../lib/money';
import { audit } from '../../lib/audit';
import { requireRole } from '../../middleware/auth';

const router = Router();

// Only http(s) image URLs; rejects javascript:, data: and other schemes.
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .url('Image must be a valid URL')
  .refine((value) => /^https?:\/\//i.test(value), 'Image URL must start with http:// or https://');

const productBody = z.object({
  name: z.string().trim().min(2, 'Name is required').max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.coerce
    .number()
    .positive('Price must be greater than 0')
    .max(1_000_000)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Price can have at most 2 decimals'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0).max(1_000_000),
  image: z.union([imageUrl, z.literal(''), z.null()]).optional(),
  category: z.string().trim().min(1).max(80).optional().nullable(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().min(1).max(64) });

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function resolveCategory(name?: string | null) {
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.category.create({ data: { name: name.trim(), slug } });
}

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = paginationSchema.extend({ search: z.string().trim().max(120).optional() }).parse(req.query);
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        ...skipTake(query.page, query.limit),
      }),
    ]);

    return res.json({ data: products.map(serialiseProduct), meta: paginationMeta(query.page, query.limit, total) });
  }),
);

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const body = productBody.parse(req.body);
    const category = await resolveCategory(body.category);

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description || null,
        price: toDecimal(body.price.toFixed(2)),
        stock: body.stock,
        image: body.image || null,
        active: body.active ?? true,
        featured: body.featured ?? false,
        categoryId: category?.id ?? null,
      },
      include: { category: true },
    });

    await audit(req, 'product.create', 'product', product.id, { name: product.name });
    return res.status(201).json({ data: serialiseProduct(product) });
  }),
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = productBody.parse(req.body);

    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Product not found');
    const category = await resolveCategory(body.category);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        price: toDecimal(body.price.toFixed(2)),
        stock: body.stock,
        image: body.image || null,
        active: body.active ?? existing.active,
        featured: body.featured ?? existing.featured,
        categoryId: category?.id ?? null,
      },
      include: { category: true },
    });

    await audit(req, 'product.update', 'product', product.id, {
      name: product.name,
      price: { from: Number(existing.price), to: Number(product.price) },
      stock: { from: existing.stock, to: product.stock },
    });
    return res.json({ data: serialiseProduct(product) });
  }),
);

router.patch(
  '/products/:id/stock',
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = z.object({ stock: z.coerce.number().int().min(0).max(1_000_000) }).parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Product not found');

    const product = await prisma.product.update({
      where: { id },
      data: { stock: body.stock },
      include: { category: true },
    });
    await audit(req, 'product.stock', 'product', product.id, { from: existing.stock, to: body.stock });
    return res.json({ data: serialiseProduct(product) });
  }),
);

router.delete(
  '/products/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Product not found');

    // Soft delete: past orders keep their line items and the product disappears from the menu.
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), active: false, featured: false } });
    await audit(req, 'product.delete', 'product', id, { name: existing.name });
    return res.status(204).send();
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return res.json({ data: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })) });
  }),
);

export default router;
