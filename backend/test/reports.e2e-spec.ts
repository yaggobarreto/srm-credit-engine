import request from 'supertest';

/**
 * e2e de caixa-preta (mesmo pré-requisito de settlements.e2e-spec.ts):
 *   docker compose up -d --build
 */
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

describe('Reports (e2e) — extrato de liquidações', () => {
  const cedente = `Extrato E2E ${Date.now()}`;

  beforeAll(async () => {
    await request(baseUrl).post('/pricing-config/base-rate').send({ baseRate: '0.01' });

    for (let i = 0; i < 3; i += 1) {
      const receivable = await request(baseUrl)
        .post('/receivables')
        .send({
          type: 'DUPLICATA_MERCANTIL',
          cedente,
          faceValue: '10000.00',
          operationDate: '2026-01-01T00:00:00Z',
          dueDate: '2026-04-01T00:00:00Z',
          paymentCurrency: 'BRL',
        })
        .expect(201);

      await request(baseUrl)
        .post('/settlements')
        .set('Idempotency-Key', `report-${receivable.body.id}`)
        .send({ receivableId: receivable.body.id })
        .expect(201);
    }
  });

  it('filtra por cedente e pagina server-side', async () => {
    const page1 = await request(baseUrl)
      .get('/reports/settlements')
      .query({ cedente, page: 1, pageSize: 2 })
      .expect(200);

    expect(page1.body.total).toBe(3);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.data.every((row: { cedente: string }) => row.cedente === cedente)).toBe(true);

    const page2 = await request(baseUrl)
      .get('/reports/settlements')
      .query({ cedente, page: 2, pageSize: 2 })
      .expect(200);

    expect(page2.body.data).toHaveLength(1);
  });

  it('filtra por moeda', async () => {
    const res = await request(baseUrl)
      .get('/reports/settlements')
      .query({ cedente, currency: 'BRL' })
      .expect(200);

    expect(res.body.total).toBe(3);
    expect(res.body.data.every((row: { paymentCurrency: string }) => row.paymentCurrency === 'BRL')).toBe(
      true,
    );

    const resUsd = await request(baseUrl)
      .get('/reports/settlements')
      .query({ cedente, currency: 'USD' })
      .expect(200);

    expect(resUsd.body.total).toBe(0);
  });

  it('rejeita pageSize acima do limite', async () => {
    await request(baseUrl).get('/reports/settlements').query({ pageSize: 1000 }).expect(400);
  });
});
