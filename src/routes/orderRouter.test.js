/* eslint-env jest */
const request = require('supertest');
const app = require('../service');
const { StatusCodeError } = require('../endpointHelper')
const { expectValidJwt, createAdminUser } = require('./testUtils');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

let unusedVariable;

let adminAuthToken;

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

test('add menu item', async () => {
    const newMenuItem = { "title":"Student", "description": "No topping, no sauce, just carbs", "image":"pizza9.png", "price": 0.0001 };
    const res = await request(app).put('/api/order/menu')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(newMenuItem);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(item => item.title === "Student")).toBe(true);
});

test('create order', async () => {
    const order = {"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]};
    const res = await request(app).post('/api/order')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(order);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('order');
    expect(res.body).toHaveProperty('jwt');
    expect(res.body.order.items[0]).toHaveProperty('price', 0.05)
});


test('StatusCodeError should store message and statusCode', () => {
    const error = new StatusCodeError('Test Error', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test Error');
    expect(error.statusCode).toBe(404);
});
