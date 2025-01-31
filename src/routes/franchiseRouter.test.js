/* eslint-env jest */
const request = require('supertest');
const app = require('../service');
const { expectValidJwt, randomName, createAdminUser } = require('./testUtils');

let adminAuthToken;
let testUserId = 1;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
    // create admin
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send({
        email: adminUser.email,
        password: 'toomanysecrets'
    });
    adminAuthToken = adminLoginRes.body.token;
    expectValidJwt(adminAuthToken);
  });


async function createFakeFranchise() {
    const res = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`)
            .send({ name: randomName(), admins: [{email: "f@jwt.com"}] });
    return res;
}

test('get franchises', async () => {
    const res = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`);;
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
});

test('get franchise by userId', async () => {
    const res = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${adminAuthToken}`);
        expect(res.status).toBe(200);
});

test('create franchise', async () => {
    const res = await createFakeFranchise();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
});

test('delete franchise', async () => {
    const res = await createFakeFranchise();
    const franchiseId = res.body.id;
    const res2 = await request(app).delete(`/api/franchise/${franchiseId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.message).toBe('franchise deleted');
});

test('create a store', async () => {
    const res = await createFakeFranchise();
    const franchiseId = res.body.id;
    const res2 = await request(app).post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send({ name: randomName()});
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('id');
    expect(res2.body).toHaveProperty('name');
});

test('delete store', async () => {
    const res = await createFakeFranchise();
    const franchiseId = res.body.id;
    const res2 = await request(app).post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({ name: randomName()});
    const storeId = res2.body.id;
    const res3 = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res3.status).toBe(200);
    expect(res3.body.message).toBe('store deleted');
})


