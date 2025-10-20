import { BaseService } from './baseService';
import type { components } from '@/types/api';

type BeneficiarySignupPayload = components['schemas']['BeneficiarySignupDto'];
type BeneficiaryLoginPayload = components['schemas']['BeneficiaryLoginDto'];

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  [key: string]: unknown;
};

class BeneficiaryAuthService extends BaseService {
  signup(payload: BeneficiarySignupPayload) {
    return this.post<BeneficiarySignupPayload, void>('/beneficiaryAuth/Signup', payload);
  }

  login<TResponse = AuthResponse>(payload: BeneficiaryLoginPayload) {
    return this.post<BeneficiaryLoginPayload, TResponse>('/beneficiaryAuth/Login', payload);
  }

  refresh<TResponse = AuthResponse>() {
    return this.post<undefined, TResponse>('/beneficiaryAuth/Refresh');
  }

  logout() {
    return this.post<undefined, void>('/beneficiaryAuth/Logout');
  }
}

export const beneficiaryAuthService = new BeneficiaryAuthService();
export type {
  BeneficiarySignupPayload,
  BeneficiaryLoginPayload,
  AuthResponse as BeneficiaryAuthResponse,
};
