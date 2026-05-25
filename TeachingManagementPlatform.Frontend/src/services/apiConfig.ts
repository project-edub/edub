const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getApiRootUrl(): string {
  return API_BASE_URL.replace(/\/?api\/?$/, '');
}

export function getApiOrigin(): string {
  try {
    return new URL(API_BASE_URL, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}