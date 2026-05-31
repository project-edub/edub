import type { ItemType } from './common';

export interface StorageItem {
  id: number;
  lecturerId: number;
  parentFolderId?: number | null;
  name: string;
  itemType: ItemType;
  fileReference?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  modifiedAt: string;
  createdAt: string;
}

export interface StorageQuota {
  storageUsedBytes: number;
  storageLimitBytes: number;
  subscriptionPackageName: string;
  usagePercent: number;
  remainingBytes: number;
}

export interface CreateFolderRequest {
  name: string;
  parentFolderId?: number | null;
}

export interface UploadFileRequest {
  parentFolderId?: number | null;
}

export interface RenameItemRequest {
  name: string;
}

export interface StorageFilter {
  search?: string;
  fileType?: string;
  dateRange?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name' | 'date';
  sortDirection?: 'asc' | 'desc';
  folderPosition?: 'above' | 'mixed';
}
