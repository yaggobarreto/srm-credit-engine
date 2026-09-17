import request from 'supertest';

/**
 * Testes de integração de caixa-preta contra a API real (container Docker),
 * não contra uma instância Nest levantada dentro do Jest. Pré-requisito:
 *
 *   docker compose up -d --build
 *
 * (a partir da raiz do repositório), com a API respondendo em
 * BASE_URL (default http://localhost:3000).
 *
 * Cobrem o que os testes unitários (com repository mockado) não conseguem
 * provar sozinhos: os golden cases através da API HTTP real, e o
 * comportamento de idempotência/concorrência do endpoint de liquidação, que
 * depende do lock pessimista do Postgres (SettlementsService.settle).
 */
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

describe('Settlements (e2e) — golden cases, idempotência e concorrência', () => {
  beforeAll(async () => {
    await request(baseUrl).post('/pricing-config/base-rate').send({ baseRate: '0.01' });
    await request(baseUrl)
      .post('/currency-rates')
      .send({ baseCurrency: 'USD', quoteCurrency: 'BRL', rate: '5.4321' });
  });

  async function createReceivable(overrides: Record<string, unknown> = {}): Promise<string> {
    const res = await request(baseUrl)
      .post('/receivables')
      .send({
        type: 'DUPLICATA_MERCANTIL',
        cedente: 'Teste E2E LTDA',
        faceValue: '100000.00',
        operationDate: '2026-01-01T00:00:00Z',
        dueDate: '2026-04-01T00:00:00Z',
        paymentCurrency: 'BRL',
        ...overrides,
      })
      .expect(201);
    return res.body.id as string;
  }

  it('C1 — Duplicata Mercantil, R$100.000, 3 meses, BRL bate ao centavo via API real', async () => {
    const receivableId = await createReceivable();

    const res = await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', `c1-${receivableId}`)
      .send({ receivableId })
      .expect(201);

    expect(res.body.presentValueBRL).toBe('92859.94');
    expect(res.body.discountBRL).toBe('7140.06');
    expect(res.body.finalAmount).toBe('92859.94');
  });

  it('C2 — Cheque Pré-datado, R$25.000, 2 meses, BRL bate ao centavo via API real', async () => {
    const receivableId = await createReceivable({
      type: 'CHEQUE_PRE_DATADO',
      faceValue: '25000.00',
      dueDate: '2026-03-02T00:00:00Z',
    });

    const res = await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', `c2-${receivableId}`)
      .send({ receivableId })
      .expect(201);

    expect(res.body.presentValueBRL).toBe('23337.77');
    expect(res.body.discountBRL).toBe('1662.23');
  });

  it('C3 — cross-currency USD usa a taxa vigente e bate ao centavo', async () => {
    const receivableId = await createReceivable({ paymentCurrency: 'USD' });

    const res = await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', `c3-${receivableId}`)
      .send({ receivableId })
      .expect(201);

    expect(res.body.presentValueBRL).toBe('92859.94');
    expect(res.body.finalAmount).toBe('17094.67');
    expect(res.body.exchangeRateUsed).toBe('5.432100');
  });

  it('repetir a mesma Idempotency-Key retorna a liquidação original, sem duplicar', async () => {
    const receivableId = await createReceivable();
    const key = `idem-${receivableId}`;

    const first = await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', key)
      .send({ receivableId })
      .expect(201);

    const second = await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', key)
      .send({ receivableId })
      .expect(200);

    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.id).toBe(first.body.id);
  });

  it('liquidar o mesmo recebível com uma chave diferente é rejeitado (409)', async () => {
    const receivableId = await createReceivable();

    await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', `first-${receivableId}`)
      .send({ receivableId })
      .expect(201);

    await request(baseUrl)
      .post('/settlements')
      .set('Idempotency-Key', `second-${receivableId}`)
      .send({ receivableId })
      .expect(409);
  });

  it('duas liquidações concorrentes do mesmo recebível: só uma vence, a outra recebe 409', async () => {
    const receivableId = await createReceivable();

    const [a, b] = await Promise.all([
      request(baseUrl)
        .post('/settlements')
        .set('Idempotency-Key', `concurrent-a-${receivableId}`)
        .send({ receivableId }),
      request(baseUrl)
        .post('/settlements')
        .set('Idempotency-Key', `concurrent-b-${receivableId}`)
        .send({ receivableId }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  it('falta do header Idempotency-Key retorna 400', async () => {
    const receivableId = await createReceivable();

    await request(baseUrl).post('/settlements').send({ receivableId }).expect(400);
  });
});
