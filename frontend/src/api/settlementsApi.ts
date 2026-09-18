import { apiClient } from './client';
import type { Settlement } from '../types/domain';

export interface SettleReceivableRequest {
  receivableId: string;
  exchangeRate?: string;
}

export function settleReceivable(
  payload: SettleReceivableRequest,
  idempotencyKey: string,
): Promise<Settlement> {
  return apiClient.post<Settlement>('/settlements', payload, { 'Idempotency-Key': idempotencyKey });
}
