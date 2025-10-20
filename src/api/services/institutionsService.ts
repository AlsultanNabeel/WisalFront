import { BaseService } from './baseService';
import type { components } from '@/types/api';

type UpdateInstitutionPayload = components['schemas']['UpdateInstitutionDto'];

type Institution = Record<string, unknown>;
type InstitutionStats = Record<string, unknown>;

class InstitutionsService extends BaseService {
  getById(id: string) {
    return this.get<Institution>(`/institutions/${id}`);
  }

  update(id: string, payload: UpdateInstitutionPayload) {
    return this.put<UpdateInstitutionPayload, Institution>(`/institutions/${id}`, payload);
  }

  getStats(id: string) {
    return this.get<InstitutionStats>(`/institutions/${id}/stats`);
  }
}

export const institutionsService = new InstitutionsService();
export type { Institution, InstitutionStats, UpdateInstitutionPayload };
