#!/usr/bin/env node
/**
 * End-to-end API smoke test against a running backend + database.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/smoke-test.mjs [http://localhost:8000]
 *
 * It registers throw-away customers, places and cancels real orders, and walks one
 * order through the staff workflow, so run it against a development database only.
 */
const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '');
const API = `${BASE}/api/v1`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ''}`);
  }
}

class Client {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  async request(method, path, body, headers = {}) {
    const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const header of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = header.split(';');
      const [key, ...rest] = pair.split('=');
      const value = rest.join('=');
      const expired = attrs.some((a) => /expires=thu, 01 jan 1970/i.test(a)) || value === '';
      if (expired) this.cookies.delete(key.trim());
      else this.cookies.set(key.trim(), value);
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  }

  get(path) {
    return this.request('GET', path);
  }
  post(path, body = {}, headers) {
    return this.request('POST', path, body, headers);
  }
  patch(path, body) {
    return this.request('PATCH', path, body);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const customer = (c, extra = {}) => ({
  name: 'Smoke Tester',
  email: `${c}@example.com`,
  phone: '9876543210',
  address: '12 Test Lane, Near Park, 400001',
  ...extra,
});

async function register(label) {
  const client = new Client(label);
  const email = `smoke-${label}-${unique()}@example.com`;
  const res = await client.post('/auth/register', { name: `Smoke ${label}`, email, password: 'SmokeTest123' });
  return { client, email, res };
}

async function productStock(id) {
  const res = await new Client('anon').get(`/products/${id}`);
  return res.body?.data?.stock;
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);
  const anon = new Client('anon');

  console.log('Catalogue');
  const ready = await fetch(`${BASE}/health/ready`).then((r) => r.json()).catch(() => null);
  check('database is reachable', ready?.status === 'ready');
  const list = await anon.get('/products?limit=100');
  check('menu lists products', list.status === 200 && list.body.data.length > 0, `status ${list.status}`);
  const product = list.body.data.find((p) => p.stock >= 20) ?? list.body.data[0];
  const categories = await anon.get('/categories');
  check('categories are listed', categories.status === 200 && categories.body.data.length > 0);

  const quote = await anon.post('/cart/quote', { items: [{ productId: product.id, quantity: 2 }, { productId: 'missing', quantity: 1 }] });
  check('server prices the basket', quote.status === 200 && quote.body.data.subtotal === product.price * 2);
  check('quote flags unknown products', quote.body?.data?.missing?.includes('missing'));

  console.log('\nSecurity');
  check('orders need a session', (await anon.get('/orders')).status === 401);
  check('dashboard needs a session', (await anon.get('/admin/stats')).status === 401);
  const evil = await anon.post('/auth/login', { email: 'x@example.com', password: 'x' }, { Origin: 'https://evil.example' });
  check('cross-site requests are rejected', evil.status === 403, `status ${evil.status}`);
  const weak = await anon.post('/auth/register', { name: 'Weak', email: `weak-${unique()}@example.com`, password: 'password' });
  check('weak passwords are rejected', weak.status === 422);
  const badLogin = await anon.post('/auth/login', { email: 'nobody@example.com', password: 'Whatever123' });
  check('unknown login gives a generic error', badLogin.status === 401 && /invalid email or password/i.test(badLogin.body?.error?.message));

  console.log('\nCustomer checkout');
  const a = await register('a');
  check('customer can register', a.res.status === 201, `status ${a.res.status}`);
  const me = await a.client.get('/auth/me');
  check('session works after registering', me.status === 200 && me.body.user.email === a.email);

  const before = await productStock(product.id);
  const key = `smoke-${unique()}`;
  const payload = {
    items: [{ productId: product.id, quantity: 3, price: 0.01, unitPrice: 0.01 }],
    customer: customer('a'),
    paymentMethod: 'COD',
    totalAmount: 1,
  };
  const order1 = await a.client.post('/orders', payload, { 'Idempotency-Key': key });
  check('COD order is created', order1.status === 201, JSON.stringify(order1.body?.error ?? ''));
  const order = order1.body?.data;
  check('client-sent prices are ignored', order?.totalAmount === product.price * 3, `total ${order?.totalAmount}`);
  check('COD order starts confirmed', order?.status === 'CONFIRMED');
  check('stock is reserved', (await productStock(product.id)) === before - 3);

  const replay = await a.client.post('/orders', payload, { 'Idempotency-Key': key });
  check('retrying with the same key does not duplicate', replay.status === 200 && replay.body.data.id === order.id);
  check('stock reserved only once', (await productStock(product.id)) === before - 3);

  const online = await a.client.post('/orders', { ...payload, paymentMethod: 'RAZORPAY' });
  check('online payment is refused when Razorpay is not configured', [201, 400].includes(online.status));
  if (online.status === 201) {
    await a.client.post(`/orders/${online.body.data.id}/cancel`, {});
  }

  const b = await register('b');
  const peek = await b.client.get(`/orders/${order.id}`);
  check("customers cannot see other customers' orders", peek.status === 404, `status ${peek.status}`);
  const peekCancel = await b.client.post(`/orders/${order.id}/cancel`, {});
  check("customers cannot cancel other customers' orders", peekCancel.status === 404);
  check('customers cannot open the dashboard', (await b.client.get('/admin/stats')).status === 403);

  const cancelled = await a.client.post(`/orders/${order.id}/cancel`, { reason: 'Smoke test' });
  check('customer can cancel a confirmed order', cancelled.status === 200 && cancelled.body.data.status === 'CANCELLED');
  check('cancelling returns the stock', (await productStock(product.id)) === before);
  const again = await a.client.post(`/orders/${order.id}/cancel`, {});
  check('an order cannot be cancelled twice', again.status === 409);

  const scarce = list.body.data.find((p) => p.stock > 0 && p.stock < 50);
  if (scarce) {
    const tooMuch = await a.client.post('/orders', {
      items: [{ productId: scarce.id, quantity: scarce.stock + 1 }],
      customer: customer('a'),
      paymentMethod: 'COD',
    });
    check('ordering more than is in stock is refused', tooMuch.status === 409, `status ${tooMuch.status}`);
  }

  console.log('\nSession handling');
  const oldRefresh = a.client.cookies.get('amy_refresh');
  const refreshed = await a.client.post('/auth/refresh');
  check('refresh issues a new session', refreshed.status === 200 && a.client.cookies.get('amy_refresh') !== oldRefresh);
  if (process.env.SKIP_SLOW !== '1') {
    await sleep(11_000);
    const thief = new Client('thief');
    thief.cookies.set('amy_refresh', oldRefresh);
    const reuse = await thief.post('/auth/refresh');
    check('a reused refresh token is rejected', reuse.status === 401);
    const victim = await a.client.post('/auth/refresh');
    check('token reuse ends every session for that user', victim.status === 401);
  }

  console.log('\nStaff workflow');
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('  skip  set ADMIN_EMAIL and ADMIN_PASSWORD to test the dashboard');
  } else {
    const admin = new Client('admin');
    const login = await admin.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    check('admin can sign in', login.status === 200 && login.body.user.role === 'ADMIN', `status ${login.status}`);

    const c = await register('c');
    const placed = await c.client.post('/orders', {
      items: [{ productId: product.id, quantity: 1 }],
      customer: customer('c'),
      paymentMethod: 'COD',
    });
    const id = placed.body?.data?.id;
    check('a second customer can order', placed.status === 201);

    const queue = await admin.get('/admin/orders?status=OPEN&limit=100');
    check('the order shows in the staff queue', queue.body?.data?.some((o) => o.id === id));

    const forged = await admin.patch(`/admin/orders/${id}/status`, { status: 'PAID' });
    check('staff cannot mark an order paid by hand', forged.status === 409);
    const skip = await admin.patch(`/admin/orders/${id}/status`, { status: 'DELIVERED' });
    check('staff cannot skip steps', skip.status === 409);

    const preparing = await admin.patch(`/admin/orders/${id}/status`, { status: 'PREPARING' });
    check('staff can start preparing', preparing.status === 200 && preparing.body.data.status === 'PREPARING');
    const lateCancel = await c.client.post(`/orders/${id}/cancel`, {});
    check('customer cannot cancel once preparing', lateCancel.status === 409);

    await admin.patch(`/admin/orders/${id}/status`, { status: 'OUT_FOR_DELIVERY' });
    const delivered = await admin.patch(`/admin/orders/${id}/status`, { status: 'DELIVERED' });
    check('delivering a COD order marks it paid', delivered.body?.data?.status === 'DELIVERED' && delivered.body.data.paymentStatus === 'PAID');

    const seen = await c.client.get(`/orders/${id}`);
    check('customer sees the delivered order', seen.body?.data?.status === 'DELIVERED' && seen.body.data.statusHistory.length >= 4);

    const stats = await admin.get('/admin/stats');
    check('dashboard stats load', stats.status === 200 && stats.body.data.revenue >= product.price);
    const audit = await admin.get('/admin/audit');
    check('staff actions are audited', audit.body?.data?.some((entry) => entry.action === 'order.status' && entry.entityId === id));

    const badProduct = await admin.request('POST', '/admin/products', { name: 'XSS', price: 10, stock: 1, image: 'javascript:alert(1)' });
    check('product images must be http(s) links', badProduct.status === 422);

    const people = await admin.get('/admin/users?limit=5');
    check('admin can list people', people.status === 200);
    const selfDemote = await admin.patch(`/admin/users/${login.body.user.id}/role`, { role: 'CUSTOMER' });
    check('admin cannot remove their own admin role', selfDemote.status === 400);

    await admin.post('/auth/logout');
    check('signing out ends the session', (await admin.get('/auth/me')).status === 401);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
