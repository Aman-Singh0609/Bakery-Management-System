/**
 * Idempotent seed: safe to run on every start.
 *  - Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if that account does not exist.
 *  - Inserts the sample catalogue only when the product table is completely empty,
 *    so it never overwrites prices, stock or deletions made from the dashboard.
 */
import 'dotenv/config';
import { Role } from '@prisma/client';
import { createPrismaClient } from '../config/prisma';
import { hashPassword, passwordPolicy } from '../lib/password';

const prisma = createPrismaClient();

const WEAK_PASSWORDS = new Set(['ChangeMe123!', 'use-a-strong-password', 'password1', 'admin1234']);

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=75`;

const products: Array<{
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string | null;
  featured?: boolean;
  description: string;
}> = [
  { name: 'Classic Sourdough', category: 'Bread', price: 120, stock: 40, image: U('photo-1585478259715-876acc6b7c37'), featured: true, description: 'Naturally leavened over 24 hours for a crackling crust and a tangy, open crumb.' },
  { name: 'Whole Wheat Loaf', category: 'Bread', price: 80, stock: 50, image: U('photo-1509440159596-0249088772ff'), description: '100% stone-ground whole wheat, soft and hearty. Great for everyday sandwiches.' },
  { name: 'Garlic Herb Focaccia', category: 'Bread', price: 95, stock: 30, image: U('photo-1571047521944-c6194f2816b2'), description: 'Olive-oil rich focaccia topped with roasted garlic, rosemary and sea salt.' },
  { name: 'Multigrain Baguette', category: 'Bread', price: 75, stock: 40, image: U('photo-1597079910443-60c43fc4a729'), description: 'A crisp French baguette with flax, sunflower and sesame seeds.' },
  { name: 'Chocolate Truffle Cake', category: 'Cake', price: 650, stock: 12, image: U('photo-1578985545062-69928b1d9587'), featured: true, description: 'Layers of dark chocolate sponge and silky ganache. Serves 6–8.' },
  { name: 'Honey Almond Cake', category: 'Cake', price: 480, stock: 10, image: null, description: 'A tender almond sponge soaked in wildflower honey syrup, topped with toasted flakes.' },
  { name: 'Strawberry Shortcake', category: 'Cake', price: 560, stock: 8, image: U('photo-1488477181946-6428a0291777'), description: 'Vanilla chiffon, fresh strawberries and lightly whipped cream.' },
  { name: 'Eggless Fruit Cake', category: 'Cake', price: 420, stock: 15, image: null, description: 'Studded with candied fruit and nuts, warmly spiced. Completely eggless.' },
  { name: 'Butter Croissant', category: 'Pastry', price: 85, stock: 60, image: U('photo-1483695028939-5bb13f8648b0'), featured: true, description: 'Laminated with French butter over three days for 27 flaky layers.' },
  { name: 'Blueberry Danish', category: 'Pastry', price: 95, stock: 40, image: U('photo-1509365465985-25d11c17e812'), description: 'Flaky pastry with vanilla custard and a blueberry compote centre.' },
  { name: 'Cinnamon Roll', category: 'Pastry', price: 90, stock: 45, image: U('photo-1556711905-b0bda2e58d40'), featured: true, description: 'Soft brioche swirled with cinnamon brown sugar and a cream cheese glaze.' },
  { name: 'Almond Croissant', category: 'Pastry', price: 110, stock: 35, image: U('photo-1568471173242-461f0a730452'), description: 'Twice-baked croissant filled with frangipane and finished with almonds.' },
  { name: 'Nankhatai', category: 'Cookie', price: 180, stock: 40, image: null, description: 'Classic ghee shortbread with cardamom and pistachio. Box of 12.' },
  { name: 'Jeera Cookies', category: 'Cookie', price: 150, stock: 40, image: null, description: 'Savoury-sweet butter cookies with toasted cumin. Box of 15.' },
  { name: 'Choco Chip Cookies', category: 'Cookie', price: 220, stock: 50, image: U('photo-1499636136210-6f4ee915583e'), featured: true, description: 'Brown-butter cookies loaded with dark chocolate chunks. Box of 6.' },
  { name: 'Khari Biscuit', category: 'Cookie', price: 120, stock: 60, image: null, description: 'Crisp, puffy, salted puff-pastry biscuits. Perfect with chai. 250 g.' },
  { name: 'Veg Puff', category: 'Snack', price: 40, stock: 80, image: null, description: 'Golden puff pastry filled with spiced potato and peas.' },
  { name: 'Paneer Puff', category: 'Snack', price: 55, stock: 60, image: U('photo-1601050690597-df0568f70950'), description: 'Flaky pastry with a tikka-spiced paneer filling.' },
  { name: 'Cake Rusk', category: 'Snack', price: 140, stock: 40, image: null, description: 'Double-baked cake slices with a hint of cardamom. 300 g.' },
  { name: 'Atta Biscuit', category: 'Snack', price: 110, stock: 60, image: null, description: 'Wholesome whole-wheat biscuits sweetened with jaggery. 250 g.' },
];

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin account.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== Role.ADMIN) {
      console.warn(`[seed] ${email} exists but is not an admin; leaving it unchanged.`);
    }
    return;
  }

  const policy = passwordPolicy.safeParse(password);
  if (!policy.success || WEAK_PASSWORDS.has(password) || password.length < 10) {
    throw new Error(
      'ADMIN_PASSWORD is too weak. Use at least 10 characters with letters and numbers (not the example value).',
    );
  }

  await prisma.user.create({
    data: {
      name: 'Bakery Admin',
      email,
      passwordHash: await hashPassword(password),
      role: Role.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`[seed] Created admin account ${email}`);
}

async function seedCatalog() {
  if (process.env.SEED_SAMPLE_PRODUCTS === 'false') return;
  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`[seed] Catalogue already has ${count} products; not touching it.`);
    return;
  }

  const categories = new Map<string, string>();
  for (const name of [...new Set(products.map((p) => p.category))]) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    categories.set(name, category.id);
  }

  await prisma.product.createMany({
    data: products.map((product) => ({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image,
      featured: product.featured ?? false,
      categoryId: categories.get(product.category),
    })),
  });
  console.log(`[seed] Inserted ${products.length} sample products.`);
}

async function main() {
  await seedAdmin();
  await seedCatalog();
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
