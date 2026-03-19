import api from './api';
import type { LecturerProfile, UpdateProfileRequest } from '../types/profile';

const API_HOST = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

export function getImageUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_HOST}${path}`;
}

export async function getProfile(): Promise<LecturerProfile> {
  const response = await api.get<LecturerProfile>('/lecturer/profile');
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<LecturerProfile> {
  const response = await api.put<LecturerProfile>('/lecturer/profile', data);
  return response.data;
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ avatarUrl: string }>('/lecturer/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.avatarUrl;
}

export async function uploadProfileImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ imageUrl: string }>('/lecturer/profile/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.imageUrl;
}
