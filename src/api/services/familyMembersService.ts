import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreateFamilyMemberPayload = components['schemas']['CreateFamilyMemberDto'];
type UpdateFamilyMemberPayload = components['schemas']['UpdateFamilyMemberDto'];

type FamilyMember = {
  id?: string;
  fullName?: string;
  nationalId?: string;
  relationship?: string;
  healthStatus?: string;
  gender?: string;
  dateOfBirth?: string;
  [key: string]: unknown;
};

class FamilyMembersService extends BaseService {
  list(beneficiaryId: string) {
    return this.get<FamilyMember[]>(`/beneficiaries/${beneficiaryId}/family-members`);
  }

  create(beneficiaryId: string, payload: CreateFamilyMemberPayload) {
    return this.post<CreateFamilyMemberPayload, FamilyMember>(
      `/beneficiaries/${beneficiaryId}/family-members`,
      payload,
    );
  }

  update(beneficiaryId: string, id: string, payload: UpdateFamilyMemberPayload) {
    return this.patch<UpdateFamilyMemberPayload, FamilyMember>(
      `/beneficiaries/${beneficiaryId}/family-members/${id}`,
      payload,
    );
  }

  remove(beneficiaryId: string, id: string) {
    return this.delete<void>(`/beneficiaries/${beneficiaryId}/family-members/${id}`);
  }
}

export const familyMembersService = new FamilyMembersService();
export type { FamilyMember, CreateFamilyMemberPayload, UpdateFamilyMemberPayload };

