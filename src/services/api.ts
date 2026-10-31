import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fast in-memory Stale-While-Revalidate (SWR) cache + in-flight request deduplication
// Prevents slow repeat navigations, spinner stalls, and duplicate concurrent requests.
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<any>>();

function buildCacheKey(url: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join('&');
  return sorted ? `${url}?${sorted}` : url;
}

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
}

export function peekCached<T>(url: string, params?: Record<string, any>): T | undefined {
  const key = buildCacheKey(url, params);
  return responseCache.get(key)?.data as T | undefined;
}

export async function cachedGet<T>(
  url: string,
  params?: Record<string, any>,
  ttlMs = 45000
): Promise<T> {
  const key = buildCacheKey(url, params);
  const now = Date.now();
  const cached = responseCache.get(key);

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const reqPromise = api
    .get<T>(url, params ? { params } : undefined)
    .then((res) => {
      responseCache.set(key, { data: res.data, timestamp: Date.now() });
      return res.data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, reqPromise);

  // If stale data exists, still await fresh if caller didn't read peekCached, or fallback to stale on network hiccup
  try {
    return await reqPromise;
  } catch (err) {
    if (cached) {
      return cached.data as T;
    }
    throw err;
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    if (method !== 'get') {
      // Any mutation automatically clears cached GET lists so UI stays 100% fresh
      responseCache.clear();
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export function extractApiError(err: any, fallback = 'Request could not be completed. Please try again.'): string {
  if (err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout')) {
    return 'Server took too long to respond. Please check your connection and try again.';
  }
  return err?.response?.data?.error || err?.message || fallback;
}

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'Ask Price';
  }
  return `₹${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

export function normalizeWhatsAppDigits(rawPhone: string | undefined | null): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppLink(phone: string | undefined | null, message: string): string {
  const digits = normalizeWhatsAppDigits(phone);
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
