import Decimal from 'decimal.js';

/**
 * Value object monetário. Envolve decimal.js para nunca expor operações de
 * float/double em valores financeiros (proibido pelo case a partir do nível
 * pleno). Arredondamento HALF_EVEN só acontece quando explicitamente pedido
 * via round() — internamente a precisão é mantida estendida.
 */
export class Money {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  static fromString(value: string): Money {
    return new Money(new Decimal(value));
  }

  static fromDecimal(value: Decimal): Money {
    return new Money(value);
  }

  plus(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  minus(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  dividedBy(divisor: Decimal | Money): Money {
    const d = divisor instanceof Money ? divisor.value : divisor;
    return new Money(this.value.dividedBy(d));
  }

  /** Arredonda half-even (banker's rounding) para `decimals` casas. */
  round(decimals = 2): Money {
    return new Money(this.value.toDecimalPlaces(decimals, Decimal.ROUND_HALF_EVEN));
  }

  toDecimal(): Decimal {
    return this.value;
  }

  /** Representação fixa com 2 casas, para persistência/serialização. */
  toFixed(decimals = 2): string {
    return this.value.toFixed(decimals);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
