export interface CoinPackage {
  id: number;
  name: string;
  price: number;
  coinAmount: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoinPackageRequest {
  name: string;
  price: number;
  coinAmount: number;
  description?: string | null;
  isActive: boolean;
}

export interface UpdateCoinPackageRequest {
  name?: string;
  price?: number;
  coinAmount?: number;
  description?: string | null;
  isActive?: boolean;
}

export interface CoinWalletResponse {
  coinBalance: number;
}

export interface PurchaseCoinPackageResponse {
  package: CoinPackage;
  coinBalance: number;
}

export interface CreateCoinPurchaseRequest {
  returnUrl: string;
  cancelUrl: string;
}

export interface CoinPurchaseCheckoutResponse {
  orderCode: number;
  checkoutUrl: string;
  status: string;
  package: CoinPackage;
}