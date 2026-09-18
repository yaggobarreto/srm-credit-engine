import { apiClient } from './client';
import type { PaymentCurrency, ReceivableType, SimulationResult } from '../types/domain';

export interface SimulatePricingRequest {
  type: ReceivableType;
  faceValue: string;
  operationDate?: string;
  dueDate: string;
  paymentCurrency: PaymentCurrency;
  exchangeRate?: string;
}

export function simulatePricing(payload: SimulatePricingRequest): Promise<SimulationResult> {
  return apiClient.post<SimulationResult>('/pricing/simulate', payload);
}
