const request = require('supertest');
const app = require('../service');
const { expectValidJwt, randomName, createAdminUser } = require('./testUtils');

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

test('get menu', async () => {
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    res.body.forEach(pizza => {
        expect(pizza).toHaveProperty('title');
        expect(pizza).toHaveProperty('image');
    });
});