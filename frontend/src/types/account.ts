import type { AccountStatus } from './common';
import type { Role } from './auth';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  googleId?: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface UpdateAccountRequest {
  email?: string;
  password?: string;
  fullName?: string;
}

export interface UpdateAccountStatusRequest {
  status: AccountStatus;
}

export interface AccountResponse {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}
