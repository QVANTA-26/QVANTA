import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_KEY = 'qvanta_token';
const REFRESH_TOKEN_KEY = 'qvanta_refresh_token';
const DEV_ACCESS_TOKEN = 'dev-token';

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = configuredApiUrl ? configuredApiUrl.replace(/\/+$/, '') : '/api';

const clearAuthStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('qvanta_user');
};

const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const setAccessToken = (token: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

const setRefreshToken = (token: string) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

const isDevTokenActive = (): boolean => {
  return getAccessToken() === DEV_ACCESS_TOKEN;
};

const isNetworkError = (error: AxiosError): boolean => {
  return !error.response && !!error.message && /Network Error|timeout|ECONNREFUSED/i.test(error.message);
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (isDevTokenActive()) {
    return DEV_ACCESS_TOKEN;
  }
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      const payload = refreshToken ? { refreshToken } : {};
      const response = await refreshClient.post<{ accessToken: string; refreshToken?: string }>(
        '/auth/refresh',
        payload
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      setAccessToken(accessToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      return accessToken;
    } catch (err) {
      clearAuthStorage();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    const hasAuthorizationHeader = Boolean(
      config.headers?.Authorization ?? config.headers?.authorization
    );
    if (token && config.headers && !hasAuthorizationHeader) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    if (isNetworkError(error)) {
      return Promise.reject(error);
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? '';
    const isAuthRequest = /\/auth\/(login|register|refresh|logout)(?:\/|$)/.test(requestUrl);

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
      if (isDevTokenActive()) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        clearAuthStorage();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export { clearAuthStorage, getAccessToken, setAccessToken, setRefreshToken };
