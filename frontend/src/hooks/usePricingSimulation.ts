import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { simulatePricing } from '../api/pricingApi';
import type { PaymentCurrency, ReceivableType, SimulationResult } from '../types/domain';

const DEBOUNCE_MS = 400;

interface UsePricingSimulationParams {
  type: ReceivableType;
  faceValue: string;
  operationDate: string;
  dueDate: string;
  paymentCurrency: PaymentCurrency;
  exchangeRate: string;
  /** Só dispara a simulação quando os campos obrigatórios são válidos. */
  enabled: boolean;
}

interface UsePricingSimulationResult {
  result: SimulationResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Simulação em tempo real (seção 4.2.1): debounça a digitação do operador e
 * chama POST /pricing/simulate, que não persiste nada. Cada campo é passado
 * como dependência primitiva (não o objeto inteiro) para o efeito não
 * disparar por causa de uma nova referência criada a cada render do form.
 */
export function usePricingSimulation(params: UsePricingSimulationParams): UsePricingSimulationResult {
  const { type, faceValue, operationDate, dueDate, paymentCurrency, exchangeRate, enabled } = params;

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const simulation = await simulatePricing({
          type,
          faceValue,
          operationDate: operationDate || undefined,
          dueDate,
          paymentCurrency,
          exchangeRate: exchangeRate || undefined,
        });
        if (!cancelled) {
          setResult(simulation);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setResult(null);
          setError(err instanceof ApiError ? err.message : 'Erro ao simular a precificação');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [type, faceValue, operationDate, dueDate, paymentCurrency, exchangeRate, enabled]);

  // Estado "desabilitado" é derivado aqui, não resetado via setState no
  // efeito acima — evita uma renderização extra e uma correção do linter
  // (react(set-state-in-effect)) sem perder o comportamento: enquanto os
  // campos não são válidos, a simulação nunca aparece na tela.
  return {
    result: enabled ? result : null,
    loading: enabled && loading,
    error: enabled ? error : null,
  };
}
