import { useMemo } from 'react';
import type { DecodedToken } from '../types/auth';
import { Role } from '../types/auth';

function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role as Role,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const token = localStorage.getItem('token');

  const decoded = useMemo(() => {
    if (!token) return null;
    const d = decodeToken(token);
    if (d && d.exp * 1000 > Date.now()) return d;
    return null;
  }, [token]);

  return {
    isAuthenticated: decoded !== null,
    email: decoded?.email ?? null,
    role: decoded?.role ?? null,
    token,
  };
}
