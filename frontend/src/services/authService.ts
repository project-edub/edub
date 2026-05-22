import api from './api';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const payload: LoginRequest = { email, password };
  const response = await api.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

export async function register(email: string, password: string, fullName: string): Promise<AuthResponse> {
  const payload: RegisterRequest = { email, password, fullName };
  const response = await api.post<AuthResponse>('/auth/register', payload);
  return response.data;
}
