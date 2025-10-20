import { BaseService } from './baseService';
import type { components } from '@/types/api';

type UpdateBeneficiaryPayload = components['schemas']['UpdateBeneficiaryDto'];

type Beneficiary = {
  id?: string;
  fullName?: string;
  nationalId?: string;
  phone?: string;
  address?: string;
  healthStatus?: string;
  housingStatus?: string;
  gender?: string;
  income?: number;
  familySize?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type BeneficiaryListResponse = {
  data?: Beneficiary[];
  total?: number;
  [key: string]: unknown;
};

class BeneficiariesService extends BaseService {
  list(params?: Record<string, string | number | undefined>) {
    return this.get<BeneficiaryListResponse | Beneficiary[]>(`/beneficiaries`, {
      params,
    });
  }

  search(name: string) {
    return this.get<Beneficiary[]>(`/beneficiaries/search`, {
      params: { name },
    });
  }

  getById(id: string) {
    return this.get<Beneficiary>(`/beneficiaries/${id}`);
  }

  getByNationalId(nationalId: string) {
    return this.get<Beneficiary>(`/beneficiaries/national/${encodeURIComponent(nationalId)}`);
  }

  getCoupons(id: string) {
    return this.get<Record<string, unknown>[]>(`/beneficiaries/${id}/coupons`);
  }

  update(id: string, payload: UpdateBeneficiaryPayload) {
    return this.patch<UpdateBeneficiaryPayload, Beneficiary>(`/beneficiaries/${id}`, payload);
  }
}

export const beneficiariesService = new BeneficiariesService();
export type { Beneficiary, BeneficiaryListResponse, UpdateBeneficiaryPayload };
