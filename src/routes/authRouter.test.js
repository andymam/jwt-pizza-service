const request = require('supertest');
const app = require('../service');

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

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});


const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}


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

test('update user not admin', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  const authToken = loginRes.body.token;

  const res = await request(app).put(`/api/auth/${testUser.id}`).set('Authorization', `Bearer ${
    authToken}`).send(testUser);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('unauthorized');
});