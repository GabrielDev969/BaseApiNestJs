import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  startTestDatabase,
  stopTestDatabase,
  resetDatabase,
} from './helpers/test-database';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    await startTestDatabase();

    const { createTestApp } =
      require('./helpers/test-app') as typeof import('./helpers/test-app');
    app = await createTestApp();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  const credentials = {
    email: 'jane@example.com',
    name: 'Jane Doe',
    password: 'StrongPass@123',
  };

  it('POST /auth/v1/register creates a user and a personal workspace', async () => {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      email: credentials.email,
      name: credentials.name,
    });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/v1/register rejects duplicate email with 409', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);
    await request(server)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(409);
  });

  it('POST /auth/v1/login returns access and refresh tokens', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });

  it('POST /auth/v1/login rejects wrong password with 401', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPass@123' })
      .expect(401);
  });

  it('GET /auth/v1/me returns profile, workspaces and isSuperAdmin=false', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const me = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      email: credentials.email,
      name: credentials.name,
      twoFactorEnabled: false,
      isSuperAdmin: false,
    });
    expect(me.body.workspaces).toHaveLength(1);
    expect(me.body.workspaces[0]).toMatchObject({
      isPersonal: true,
      name: "Jane Doe's Workspace",
    });
  });

  it('GET /auth/v1/me without token returns 401', async () => {
    await request(server).get('/api/v1/auth/me').expect(401);
  });
});
