import { BaseService } from './baseService';
import type { components } from '@/types/api';

type InstitutionSignupPayload = components['schemas']['InstitutionSignupDto'];
type InstitutionLoginPayload = components['schemas']['EmployeeLoginDto'];

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  [key: string]: unknown;
};

class InstitutionAuthService extends BaseService {
  signup(payload: InstitutionSignupPayload) {
    return this.post<InstitutionSignupPayload, void>('/InstitutionAuth/Signup', payload);
  }

  login<TResponse = AuthResponse>(payload: InstitutionLoginPayload) {
    return this.post<InstitutionLoginPayload, TResponse>('/InstitutionAuth/Login', payload);
  }

  refresh<TResponse = AuthResponse>() {
    return this.post<undefined, TResponse>('/InstitutionAuth/Refresh');
  }

  logout() {
    return this.post<undefined, void>('/InstitutionAuth/Logout');
  }
}

export const institutionAuthService = new InstitutionAuthService();
export type {
  InstitutionSignupPayload,
  InstitutionLoginPayload,
  AuthResponse as InstitutionAuthResponse,
};
