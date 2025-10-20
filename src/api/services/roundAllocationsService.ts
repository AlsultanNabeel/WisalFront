import { BaseService } from './baseService';
import type { components } from '@/types/api';

type AllocateBeneficiariesPayload = components['schemas']['AllocateBeneficiariesDto'];
type DeliverCouponPayload = components['schemas']['DeliverCouponDto'];

type Allocation = {
  id?: string;
  beneficiaryId?: string;
  roundId?: string;
  couponCode?: string;
  status?: string;
  deliveredAt?: string;
  [key: string]: unknown;
};

class RoundAllocationsService extends BaseService {
  list(roundId: string) {
    return this.get<Allocation[]>(`/rounds/${roundId}/allocations`);
  }

  allocate(roundId: string, payload: AllocateBeneficiariesPayload) {
    return this.post<AllocateBeneficiariesPayload, Allocation[]>(
      `/rounds/${roundId}/allocations`,
      payload,
    );
  }

  deliver(roundId: string, payload: DeliverCouponPayload) {
    return this.post<DeliverCouponPayload, Allocation>(
      `/rounds/${roundId}/allocations/deliver`,
      payload,
    );
  }

  stats(roundId: string) {
    return this.get<Record<string, unknown>>(`/rounds/${roundId}/allocations/stats/${roundId}`);
  }

  searchByCoupon(roundId: string, couponCode: string) {
    return this.get<Allocation>(
      `/rounds/${roundId}/allocations/search/${encodeURIComponent(couponCode)}`,
    );
  }
}

export const roundAllocationsService = new RoundAllocationsService();
export type {
  Allocation,
  AllocateBeneficiariesPayload,
  DeliverCouponPayload,
};
