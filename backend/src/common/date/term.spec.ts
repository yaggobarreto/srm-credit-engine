import { calculateTermInMonths } from './term';

describe('calculateTermInMonths', () => {
  it('calcula meses cheios corretamente (90 dias = 3 meses)', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-03-31T23:59:59Z'); // ~90 dias
    expect(calculateTermInMonths(from, to)).toBe(3);
  });

  it('arredonda para cima quando o prazo é fracionário', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-02-17T00:00:00Z'); // 47 dias
    expect(calculateTermInMonths(from, to)).toBe(2);
  });

  it('rejeita vencimento anterior ou igual à data da operação', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(() => calculateTermInMonths(from, from)).toThrow();
    expect(() => calculateTermInMonths(from, new Date('2025-12-31T00:00:00Z'))).toThrow();
  });
});
