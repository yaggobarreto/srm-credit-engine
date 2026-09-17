import request from 'supertest';

/**
 * e2e de caixa-preta (mesmo pré-requisito de settlements.e2e-spec.ts):
 *   docker compose up -d --build
 */
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

describe('Pricing simulate (e2e) — não persiste nada', () => {
  beforeAll(async () => {
    await request(baseUrl).post('/pricing-config/base-rate').send({ baseRate: '0.01' });
    await request(baseUrl)
      .post('/currency-rates')
      .send({ baseCurrency: 'USD', quoteCurrency: 'BRL', rate: '5.4321' });
  });

  it('C1 — simula em BRL e bate ao centavo, sem criar recebível', async () => {
    const before = await request(baseUrl).get('/receivables').expect(200);

    const res = await request(baseUrl)
      .post('/pricing/simulate')
      .send({
        type: 'DUPLICATA_MERCANTIL',
        faceValue: '100000.00',
        operationDate: '2026-01-01T00:00:00Z',
        dueDate: '2026-04-01T00:00:00Z',
        paymentCurrency: 'BRL',
      })
      .expect(201);

    expect(res.body.presentValueBRL).toBe('92859.94');
    expect(res.body.discountBRL).toBe('7140.06');
    expect(res.body.finalAmount).toBe('92859.94');

    const after = await request(baseUrl).get('/receivables').expect(200);
    expect(after.body).toHaveLength(before.body.length);
  });

  it('C3 — simula cross-currency usando a taxa vigente', async () => {
    const res = await request(baseUrl)
      .post('/pricing/simulate')
      .send({
        type: 'DUPLICATA_MERCANTIL',
        faceValue: '100000.00',
        operationDate: '2026-01-01T00:00:00Z',
        dueDate: '2026-04-01T00:00:00Z',
        paymentCurrency: 'USD',
      })
      .expect(201);

    expect(res.body.finalAmount).toBe('17094.67');
    expect(res.body.exchangeRateUsed).toBe('5.432100');
  });

  it('rejeita faceValue inválido com 400', async () => {
    await request(baseUrl)
      .post('/pricing/simulate')
      .send({
        type: 'DUPLICATA_MERCANTIL',
        faceValue: 'abc',
        dueDate: '2026-04-01T00:00:00Z',
        paymentCurrency: 'BRL',
      })
      .expect(400);
  });
});
