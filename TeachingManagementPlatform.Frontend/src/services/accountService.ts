import api from './api';
import type {
  AccountResponse,
  CreateAccountRequest,
  UpdateAccountRequest,
  UpdateAccountStatusRequest,
} from '../types/account';

export async function getAll(): Promise<AccountResponse[]> {
  const response = await api.get<AccountResponse[]>('/admin/accounts');
  return response.data;
}

export async function create(data: CreateAccountRequest): Promise<AccountResponse> {
  const response = await api.post<AccountResponse>('/admin/accounts', data);
  return response.data;
}

export async function update(id: number, data: UpdateAccountRequest): Promise<AccountResponse> {
  const response = await api.put<AccountResponse>(`/admin/accounts/${id}`, data);
  return response.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/admin/accounts/${id}`);
}

export async function updateStatus(id: number, status: UpdateAccountStatusRequest): Promise<AccountResponse> {
  const response = await api.patch<AccountResponse>(`/admin/accounts/${id}/status`, status);
  return response.data;
}
