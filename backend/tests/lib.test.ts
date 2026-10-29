import crypto from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { canTransition, canTransitionManually, CUSTOMER_CANCELLABLE, ORDER_TRANSITIONS } from '../src/lib/orderStatus';
import { paginationSchema } from '../src/lib/pagination';

const WEBHOOK_SECRET = 'whsec_test_webhook_secret';
const KEY_SECRET = 'test_key_secret';

type TokensModule = typeof import('../src/lib/tokens');
type PasswordModule = typeof import('../src/lib/password');
type RazorpayModule = typeof import('../src/modules/payments/razorpay');
type MoneyModule = typeof import('../src/lib/money');

let tokens: TokensModule;
let password: PasswordModule;
let razorpay: RazorpayModule;
let money: MoneyModule;

beforeAll(async () => {
  [tokens, password, razorpay, money] = await Promise.all([
    import('../src/lib/tokens'),
    import('../src/lib/password'),
    import('../src/modules/payments/razorpay'),
    import('../src/lib/money'),
  ]);
});

describe('order status transitions', () => {
  it('allows the happy path', () => {
    expect(canTransition('PENDING_PAYMENT', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'OUT_FOR_DELIVERY')).toBe(true);
    expect(canTransition('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(true);
  });

  it('rejects skips and terminal states', () => {
    expect(canTransition('PENDING_PAYMENT', 'DELIVERED')).toBe(false);
    expect(canTransition('DELIVERED', 'CANCELLED')).toBe(false);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ORDER_TRANSITIONS.REFUNDED).toEqual([]);
  });

  it('never lets staff mark an unpaid online order as paid by hand', () => {
    expect(canTransitionManually('PENDING_PAYMENT', 'PAID')).toBe(false);
    expect(canTransitionManually('PENDING_PAYMENT', 'CONFIRMED')).toBe(false);
    expect(canTransitionManually('PENDING_PAYMENT', 'CANCELLED')).toBe(true);
  });

  it('stops customers cancelling once preparation has started', () => {
    expect(CUSTOMER_CANCELLABLE).not.toContain('PREPARING');
    expect(CUSTOMER_CANCELLABLE).not.toContain('OUT_FOR_DELIVERY');
  });
});

describe('pagination schema', () => {
  it('coerces and clamps values', () => {
    expect(paginationSchema.parse({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10 });
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(() => paginationSchema.parse({ limit: '1000' })).toThrow();
  });
});

describe('money', () => {
  it('converts rupees to paise without float drift', () => {
    expect(money.toPaise('0.29')).toBe(29);
    expect(money.toPaise('1019.99')).toBe(101999);
    expect(money.toPaise(0.1 + 0.2)).toBe(30);
  });
});

describe('passwords', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await password.hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    await expect(password.verifyPassword('Sup3rSecret!', hash)).resolves.toBe(true);
    await expect(password.verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('enforces the password policy', () => {
    expect(password.passwordPolicy.safeParse('short1').success).toBe(false);
    expect(password.passwordPolicy.safeParse('lettersonly').success).toBe(false);
    expect(password.passwordPolicy.safeParse('12345678').success).toBe(false);
    expect(password.passwordPolicy.safeParse('a'.repeat(80) + '1').success).toBe(false);
    expect(password.passwordPolicy.safeParse('FreshBread42').success).toBe(true);
  });
});

describe('tokens', () => {
  it('signs and verifies access tokens', () => {
    const token = tokens.signAccessToken({ sub: 'user-1', role: 'ADMIN', email: 'admin@example.com' });
    const payload = tokens.verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('ADMIN');
  });

  it('rejects tampered and unsigned tokens', () => {
    const token = tokens.signAccessToken({ sub: 'user-1', role: 'CUSTOMER', email: 'a@example.com' });
    expect(() => tokens.verifyAccessToken(`${token}x`)).toThrow();
    const [, body] = token.split('.');
    expect(() => tokens.verifyAccessToken(`eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${body}.`)).toThrow();
  });

  it('stores only keyed hashes of refresh tokens', () => {
    const { token, tokenHash } = tokens.createRefreshToken();
    expect(token).toMatch(/^[a-f0-9]{96}$/);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(tokens.refreshTokenHash(token)).toBe(tokenHash);
  });

  it('sets refresh expiry in the future', () => {
    const days = (tokens.refreshTokenExpiry().getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });
});

describe('razorpay signatures', () => {
  it('verifies payment signatures', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test123';
    const signature = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

    expect(razorpay.verifyPaymentSignature(orderId, paymentId, signature)).toBe(true);
    expect(razorpay.verifyPaymentSignature(orderId, paymentId, 'deadbeef')).toBe(false);
    expect(razorpay.verifyPaymentSignature(orderId, 'pay_other', signature)).toBe(false);
  });

  it('verifies webhook signatures over the raw body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

    expect(razorpay.verifyWebhookSignature(body, signature)).toBe(true);
    expect(razorpay.verifyWebhookSignature(Buffer.from('{}'), signature)).toBe(false);
  });
});
