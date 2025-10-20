import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreateRoundPayload = components['schemas']['CreateRoundDto'];
type UpdateRoundPayload = components['schemas']['UpdateRoundDto'];

type Round = {
  id?: string;
  distributionId?: string;
  roundNumber?: number;
  couponCount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: unknown;
};

class RoundsService extends BaseService {
  list(distributionId: string) {
    return this.get<Round[]>(`/distributions/${distributionId}/rounds`);
  }

  create(distributionId: string, payload: CreateRoundPayload) {
    return this.post<CreateRoundPayload, Round>(
      `/distributions/${distributionId}/rounds`,
      payload,
    );
  }

  getById(distributionId: string, id: string) {
    return this.get<Round>(`/distributions/${distributionId}/rounds/${id}`);
  }

  update(distributionId: string, id: string, payload: UpdateRoundPayload) {
    return this.put<UpdateRoundPayload, Round>(
      `/distributions/${distributionId}/rounds/${id}`,
      payload,
    );
  }

  remove(distributionId: string, id: string) {
    return this.delete<void>(`/distributions/${distributionId}/rounds/${id}`);
  }

  stats(distributionId: string, id: string) {
    return this.get<Record<string, unknown>>(
      `/distributions/${distributionId}/rounds/${id}/stats`,
    );
  }
}

export const roundsService = new RoundsService();
export type { Round, CreateRoundPayload, UpdateRoundPayload };

