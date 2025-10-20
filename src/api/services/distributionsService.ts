import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreateDistributionPayload = components['schemas']['CreateDistributionDto'];
type UpdateDistributionPayload = components['schemas']['UpdateDistributionDto'];

type Distribution = {
  id?: string;
  title?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  couponTemplateId?: string;
  [key: string]: unknown;
};

class DistributionsService extends BaseService {
  list() {
    return this.get<Distribution[]>('/distributions');
  }

  create(payload: CreateDistributionPayload) {
    return this.post<CreateDistributionPayload, Distribution>('/distributions', payload);
  }

  getById(id: string) {
    return this.get<Distribution>(`/distributions/${id}`);
  }

  update(id: string, payload: UpdateDistributionPayload) {
    return this.patch<UpdateDistributionPayload, Distribution>(
      `/distributions/${id}`,
      payload,
    );
  }

  remove(id: string) {
    return this.delete<void>(`/distributions/${id}`);
  }
}

export const distributionsService = new DistributionsService();
export type {
  Distribution,
  CreateDistributionPayload,
  UpdateDistributionPayload,
};

