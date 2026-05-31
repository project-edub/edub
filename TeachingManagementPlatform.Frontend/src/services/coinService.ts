import api from './api';
import type {
  CoinPurchaseCheckoutResponse,
  CoinPurchaseStatusResponse,
  CoinPackage,
  CoinWalletResponse,
  CreateCoinPackageRequest,
  CreateCoinPurchaseRequest,
  UpdateCoinPackageRequest,
} from '../types/coin';

export async function getAdminCoinPackages(): Promise<CoinPackage[]> {
  const response = await api.get<CoinPackage[]>('/admin/coin-packages');
  return response.data;
}

export async function createAdminCoinPackage(data: CreateCoinPackageRequest): Promise<CoinPackage> {
  const response = await api.post<CoinPackage>('/admin/coin-packages', data);
  return response.data;
}

export async function updateAdminCoinPackage(id: number, data: UpdateCoinPackageRequest): Promise<CoinPackage> {
  const response = await api.put<CoinPackage>(`/admin/coin-packages/${id}`, data);
  return response.data;
}

export async function removeAdminCoinPackage(id: number): Promise<void> {
  await api.delete(`/admin/coin-packages/${id}`);
}

export async function getLecturerCoinWallet(): Promise<CoinWalletResponse> {
  const response = await api.get<CoinWalletResponse>('/lecturer/coin-wallet');
  return response.data;
}

export async function getLecturerCoinPackages(): Promise<CoinPackage[]> {
  const response = await api.get<CoinPackage[]>('/lecturer/coin-packages');
  return response.data;
}

export async function purchaseLecturerCoinPackage(
  id: number,
  data: CreateCoinPurchaseRequest,
): Promise<CoinPurchaseCheckoutResponse> {
  const response = await api.post<CoinPurchaseCheckoutResponse>(`/lecturer/coin-packages/${id}/purchase`, data);
  return response.data;
}

export async function syncLecturerCoinPurchase(orderCode: number): Promise<CoinPurchaseStatusResponse> {
  const response = await api.post<CoinPurchaseStatusResponse>(`/lecturer/coin-purchases/${orderCode}/sync`);
  return response.data;
}

export async function syncLatestLecturerCoinPurchase(): Promise<CoinPurchaseStatusResponse> {
  const response = await api.post<CoinPurchaseStatusResponse>('/lecturer/coin-purchases/sync-latest');
  return response.data;
}