/* eslint-env jest */
const request = require('supertest');
const app = require('../service');
const { expectValidJwt, createAdminUser } = require('./testUtils');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('bad register', async () => {
  const badUser = { name: 'pizza diner', email: 'reg@test.com'};
  const res = await request(app).post('/api/auth').send(badUser);
  expect(res.statusCode).toBe(400);
  expect(res.body.message).toBe('name, email, and password are required');
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('register', async () => {
  const user = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(user);
  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);
})


test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});


test('update user', async () => {
  const adminUser = await createAdminUser();

  const loginRes = await request(app)
    .put('/api/auth')
    .send({ email: adminUser.email, password: 'toomanysecrets' });

  const adminToken = loginRes.body.token;
  const user = { email: 'new_email@jwt.com', password: 'new_password' };

  const res = await request(app).put(`/api/auth/${adminUser.id}`).set('Authorization', `Bearer ${
    adminToken}`).send(user);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: user.email, });
});