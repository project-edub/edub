export interface SubscriptionPackage {
  id: number;
  name: string;
  price: number;
  storageLimitBytes: number;
  unlockedFeatures: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPackageRequest {
  name: string;
  price: number;
  storageLimitBytes: number;
  unlockedFeatures: string[];
}

export interface UpdateSubscriptionPackageRequest {
  name?: string;
  price?: number;
  storageLimitBytes?: number;
  unlockedFeatures?: string[];
}
