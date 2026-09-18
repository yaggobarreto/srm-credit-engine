import { apiClient } from './client';
import type { PaymentCurrency, Receivable, ReceivableType } from '../types/domain';

export interface CreateReceivableRequest {
  type: ReceivableType;
  cedente: string;
  faceValue: string;
  operationDate?: string;
  dueDate: string;
  paymentCurrency: PaymentCurrency;
}

export function createReceivable(payload: CreateReceivableRequest): Promise<Receivable> {
  return apiClient.post<Receivable>('/receivables', payload);
}
