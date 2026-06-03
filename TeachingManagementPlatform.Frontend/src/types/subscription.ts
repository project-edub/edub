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
}
