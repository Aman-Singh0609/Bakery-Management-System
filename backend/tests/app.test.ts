import crypto from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app');
  app = createApp();
});

describe('health', () => {
  it('responds to liveness checks', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('security defaults', () => {
  it('rejects unauthenticated order access', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects unauthenticated admin access', async () => {
    expect((await request(app).get('/api/v1/admin/products')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/diagnostics')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/users')).status).toBe(401);
  });

  it('rejects forged access tokens', async () => {
    const forged = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify({ sub: 'x', role: 'ADMIN' })).toString('base64url'), ''].join('.');
    const res = await request(app).get('/api/v1/orders').set('Cookie', `amy_access=${forged}`);
    expect(res.status).toBe(401);
  });

  it('validates auth payloads before touching the database', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('enforces the password policy on registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email: 'weak@example.com', password: 'password' });
    expect(res.status).toBe(422);
  });

  it('rejects unauthenticated password change', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'OldPassword123', newPassword: 'NewPassword123' });
    expect(res.status).toBe(401);
  });

  it('returns a structured 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('marks API responses as not cacheable', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('CSRF protection', () => {
  it('rejects state-changing requests from untrusted origins', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://evil.example')
      .send({});
    expect(res.status).toBe(403);
  });

  it('rejects untrusted referers when no Origin is sent', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Referer', 'https://evil.example/page')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('allows the configured frontend origin', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('Origin', 'http://localhost:3000').send({});
    expect(res.status).toBe(204);
  });

  it('refuses HTML form bodies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=a@b.co&password=x');
    expect(res.status).toBe(415);
  });

  it('returns 400 for malformed JSON instead of a server error', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});

describe('Razorpay webhook', () => {
  it('rejects unsigned webhooks', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.captured' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects webhooks signed with the wrong secret', async () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', signature)
      .send(body);
    expect(res.status).toBe(400);
  });
});
