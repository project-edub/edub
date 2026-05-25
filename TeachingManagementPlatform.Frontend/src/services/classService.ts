import api from './api';
import type { ClassDetail, CreateClassRequest, UpdateClassRequest } from '../types/class';

export async function getAll(): Promise<ClassDetail[]> {
  const response = await api.get<ClassDetail[]>('/classes');
  return response.data;
}

export async function getById(id: number): Promise<ClassDetail> {
  const response = await api.get<ClassDetail>(`/classes/${id}`);
  return response.data;
}

export async function create(data: CreateClassRequest): Promise<ClassDetail> {
  const response = await api.post<ClassDetail>('/classes', data);
  return response.data;
}

export async function update(id: number, data: UpdateClassRequest): Promise<ClassDetail> {
  const response = await api.put<ClassDetail>(`/classes/${id}`, data);
  return response.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/classes/${id}`);
}
