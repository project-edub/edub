export interface SubscriptionPackage {
  id: number;
  name: string;
  price: number;
  storageLimitBytes: number;
  maxFilesPerQuizGeneration: number;
  maxQuestionsPerQuiz: number;
  maxCrosswordFilesPerGeneration: number;
  maxCrosswordWordsPerGeneration: number;
  maxCrosswordGenerationsPerDay: number;
  isDefault: boolean;
  isActive: boolean;
  unlockedFeatures: string[];
  /** Key: source package ID (0 = free/no package), Value: discount percent */
  upgradeDiscounts?: Record<number, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPackageRequest {
  name: string;
  price: number;
  storageLimitBytes: number;
  maxFilesPerQuizGeneration: number;
  maxQuestionsPerQuiz: number;
  maxCrosswordFilesPerGeneration: number;
  maxCrosswordWordsPerGeneration: number;
  maxCrosswordGenerationsPerDay: number;
  isDefault: boolean;
  isActive: boolean;
  unlockedFeatures: string[];
  upgradeDiscounts?: Record<number, number>;
}

export interface UpdateSubscriptionPackageRequest {
  name?: string;
  price?: number;
  storageLimitBytes?: number;
  maxFilesPerQuizGeneration?: number;
  maxQuestionsPerQuiz?: number;
  maxCrosswordFilesPerGeneration?: number;
  maxCrosswordWordsPerGeneration?: number;
  maxCrosswordGenerationsPerDay?: number;
  isDefault?: boolean;
  isActive?: boolean;
  unlockedFeatures?: string[];
  upgradeDiscounts?: Record<number, number>;
}
