export const Role = {
  Admin: 'Admin',
  Lecturer: 'Lecturer',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  token: string;
  role: Role;
}

export interface DecodedToken {
  sub: string;
  email: string;
  role: Role;
  exp: number;
}
