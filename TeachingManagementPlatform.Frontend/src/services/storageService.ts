import api from './api';
import { getApiOrigin } from './apiConfig';
import type { StorageItem, StorageQuota, CreateFolderRequest, RenameItemRequest, StorageFilter } from '../types/storage';

export async function listItems(folderId?: number | null, params?: StorageFilter): Promise<StorageItem[]> {
  const query: Record<string, string> = {};
  if (params?.search) query.search = params.search;
  if (params?.fileType) query.fileType = params.fileType;
  if (params?.dateRange) query.dateRange = params.dateRange;
  if (params?.dateFrom) query.dateFrom = params.dateFrom;
  if (params?.dateTo) query.dateTo = params.dateTo;
  if (params?.sortBy) query.sortBy = params.sortBy;
  if (params?.sortDirection) query.sortDirection = params.sortDirection;
  if (params?.folderPosition) query.folderPosition = params.folderPosition;

  const url = folderId ? `/storage/${folderId}` : '/storage';
  const response = await api.get<StorageItem[]>(url, { params: query });
  return response.data;
}

export async function createFolder(data: CreateFolderRequest): Promise<StorageItem> {
  const response = await api.post<StorageItem>('/storage/folders', data);
  return response.data;
}

export async function uploadFile(file: File, parentFolderId?: number | null): Promise<StorageItem> {
  const formData = new FormData();
  formData.append('file', file);
  if (parentFolderId != null) {
    formData.append('parentFolderId', String(parentFolderId));
  }
  const response = await api.post<StorageItem>('/storage/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function renameItem(id: number, data: RenameItemRequest): Promise<StorageItem> {
  const response = await api.put<StorageItem>(`/storage/${id}/rename`, data);
  return response.data;
}

export async function deleteItem(id: number): Promise<void> {
  await api.delete(`/storage/${id}`);
}

export async function getQuota(): Promise<StorageQuota> {
  const response = await api.get<StorageQuota>('/storage/quota');
  return response.data;
}

export function resolveStorageFileUrl(fileUrl?: string | null): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
    return fileUrl;
  }
  return `${getApiOrigin()}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

export async function downloadItem(id: number): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get<Blob>(`/storage/${id}/download`, {
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] as string | undefined;
  const fileNameMatch = disposition?.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1].replace(/\"/g, '')) : `file-${id}`;

  return { blob: response.data, fileName };
}
