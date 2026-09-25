import Decimal from 'decimal.js';
import { Money } from '../../common/money/money';
import { ReceivableType } from '../receivable-type.enum';
import { ChequePreDatadoStrategy } from './cheque-pre-datado.strategy';
import { DuplicataMercantilStrategy } from './duplicata-mercantil.strategy';

/**
 * Testes unitários das strategies (pedido explícito da avaliação — a
 * cobertura anterior só exercitava os 3 golden cases, que são caminho
 * feliz). Cobre: qual strategy é qual, casos de borda de prazo/valor, e
 * arredondamento half-even em fronteiras exatas (não só "parece certo").
 */
describe('DuplicataMercantilStrategy e ChequePreDatadoStrategy', () => {
  const duplicata = new DuplicataMercantilStrategy();
  const cheque = new ChequePreDatadoStrategy();

  describe('identidade e spread', () => {
    it('cada strategy declara o receivableType correto', () => {
      expect(duplicata.receivableType).toBe(ReceivableType.DUPLICATA_MERCANTIL);
      expect(cheque.receivableType).toBe(ReceivableType.CHEQUE_PRE_DATADO);
    });

    it('cheque (spread 2,5%) desconta mais que duplicata (spread 1,5%) para os mesmos dados', () => {
      const input = {
        faceValue: Money.fromString('10000.00'),
        termMonths: 3,
        baseRate: new Decimal('0.01'),
      };

      const resultDuplicata = duplicata.price(input);
      const resultCheque = cheque.price(input);

      expect(resultCheque.presentValue.toDecimal().lessThan(resultDuplicata.presentValue.toDecimal())).toBe(
        true,
      );
      expect(resultDuplicata.spread.toString()).toBe('0.015');
      expect(resultCheque.spread.toString()).toBe('0.025');
    });
  });

  describe('casos de borda', () => {
    it('prazo mínimo (1 mês) calcula sem erro', () => {
      const result = duplicata.price({
        faceValue: Money.fromString('1000.00'),
        termMonths: 1,
        baseRate: new Decimal('0.01'),
      });

      // (1 + 0.025)^1 = 1.025 → 1000 / 1.025 = 975.609... → 975.61
      expect(result.presentValue.toFixed(2)).toBe('975.61');
      expect(result.discount.toFixed(2)).toBe('24.39');
    });

    it('valor de face muito pequeno (1 centavo) não quebra e arredonda de forma consistente', () => {
      const result = duplicata.price({
        faceValue: Money.fromString('0.01'),
        termMonths: 1,
        baseRate: new Decimal('0.01'),
      });

      expect(result.presentValue.toFixed(2)).toBe('0.01');
      expect(result.discount.toFixed(2)).toBe('0.00');
    });

    it('taxa total zero (baseRate cancela o spread) preserva o valor de face exatamente, mesmo em magnitude grande', () => {
      // Caso de borda matemático (não de negócio — PricingConfigService
      // proíbe baseRate <= 0 na borda de entrada): prova que o pipeline
      // Decimal não perde precisão nem em valores grandes, ao contrário do
      // que aconteceria com float (o anti-padrão do Anexo A).
      const result = duplicata.price({
        faceValue: Money.fromString('999999999.99'),
        termMonths: 360, // 30 anos em meses — prazo extremo, mesmo resultado
        baseRate: new Decimal('-0.015'), // -spread, então totalRate = 0
      });

      expect(result.presentValue.toFixed(2)).toBe('999999999.99');
      expect(result.discount.toFixed(2)).toBe('0.00');
    });

    it('prazo longo (360 meses) com taxa real permanece um resultado válido, positivo e menor que o valor de face', () => {
      const result = cheque.price({
        faceValue: Money.fromString('50000.00'),
        termMonths: 360,
        baseRate: new Decimal('0.01'),
      });

      const pv = result.presentValue.toDecimal();
      expect(pv.greaterThan(0)).toBe(true);
      expect(pv.lessThan(new Decimal('50000.00'))).toBe(true);
    });
  });

  describe('arredondamento half-even em fronteiras exatas', () => {
    // Prazo=1 e baseRate escolhido de propósito para que (1 + baseRate +
    // spread) = 2 — assim faceValue/2 cai numa fronteira exata de
    // arredondamento (X,XX5), o que permite verificar o half-even "na
    // veia" da fórmula, não só isolado no value object Money.
    it('duplicata: 1,01 / 2 = 0,505 arredonda para 0,50 (vizinho par)', () => {
      const result = duplicata.price({
        faceValue: Money.fromString('1.01'),
        termMonths: 1,
        baseRate: new Decimal('0.985'), // 0.985 + 0.015 = 1 → divisor 2
      });

      expect(result.presentValue.toFixed(2)).toBe('0.50');
      expect(result.discount.toFixed(2)).toBe('0.51');
    });

    it('duplicata: 1,03 / 2 = 0,515 arredonda para 0,52 (vizinho par)', () => {
      const result = duplicata.price({
        faceValue: Money.fromString('1.03'),
        termMonths: 1,
        baseRate: new Decimal('0.985'),
      });

      expect(result.presentValue.toFixed(2)).toBe('0.52');
      expect(result.discount.toFixed(2)).toBe('0.51');
    });

    it('cheque: mesma fronteira (0,505 → 0,50), com o spread diferente absorvido no baseRate escolhido', () => {
      const result = cheque.price({
        faceValue: Money.fromString('1.01'),
        termMonths: 1,
        baseRate: new Decimal('0.975'), // 0.975 + 0.025 = 1 → divisor 2
      });

      expect(result.presentValue.toFixed(2)).toBe('0.50');
    });

    it('cheque: mesma fronteira (0,515 → 0,52)', () => {
      const result = cheque.price({
        faceValue: Money.fromString('1.03'),
        termMonths: 1,
        baseRate: new Decimal('0.975'),
      });

      expect(result.presentValue.toFixed(2)).toBe('0.52');
    });
  });
});
