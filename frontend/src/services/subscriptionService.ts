import api from './api';
import type {
  SubscriptionPackage,
  CreateSubscriptionPackageRequest,
  UpdateSubscriptionPackageRequest,
} from '../types/subscription';

export async function getAll(): Promise<SubscriptionPackage[]> {
  const response = await api.get<SubscriptionPackage[]>('/admin/subscriptions');
  return response.data;
}

export async function create(data: CreateSubscriptionPackageRequest): Promise<SubscriptionPackage> {
  const response = await api.post<SubscriptionPackage>('/admin/subscriptions', data);
  return response.data;
}

export async function update(id: number, data: UpdateSubscriptionPackageRequest): Promise<SubscriptionPackage> {
  const response = await api.put<SubscriptionPackage>(`/admin/subscriptions/${id}`, data);
  return response.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/admin/subscriptions/${id}`);
}
