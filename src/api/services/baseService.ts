import type { AxiosRequestConfig } from 'axios';
import { api } from '../httpClient';

export class BaseService {
  protected async get<TResponse = unknown>(url: string, config?: AxiosRequestConfig) {
    const { data } = await api.get<TResponse>(url, config);
    return data;
  }

  protected async post<TBody = unknown, TResponse = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) {
    const { data } = await api.post<TResponse>(url, body, config);
    return data;
  }

  protected async put<TBody = unknown, TResponse = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) {
    const { data } = await api.put<TResponse>(url, body, config);
    return data;
  }

  protected async patch<TBody = unknown, TResponse = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) {
    const { data } = await api.patch<TResponse>(url, body, config);
    return data;
  }

  protected async delete<TResponse = unknown>(url: string, config?: AxiosRequestConfig) {
    const { data } = await api.delete<TResponse>(url, config);
    return data;
  }
}
