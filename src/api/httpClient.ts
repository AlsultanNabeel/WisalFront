import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://wisal-um47q.ondigitalocean.app',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['Accept-Language'] = 'ar';
  return config;
});

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(status?: number, message?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string; title?: string }>) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || data?.title || 'حدث خطأ غير متوقع';

      if (status === 401) {
        setAuthToken(null);
      }

      return Promise.reject(new ApiError(status, message, data));
    }

    return Promise.reject(new ApiError(undefined, 'تعذر الاتصال بالخادم'));
  },
);


export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
