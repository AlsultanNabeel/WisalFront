import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreateCouponPayload = components['schemas']['CreateCouponDto'];
type UpdateCouponPayload = components['schemas']['UpdateCouponDto'];

type Coupon = {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  institutionId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

class CouponsService extends BaseService {
  list() {
    return this.get<Coupon[]>('/coupons');
  }

  getById(id: string) {
    return this.get<Coupon>(`/coupons/${id}`);
  }

  create(payload: CreateCouponPayload) {
    return this.post<CreateCouponPayload, Coupon>('/coupons', payload);
  }

  update(id: string, payload: UpdateCouponPayload) {
    return this.patch<UpdateCouponPayload, Coupon>(`/coupons/${id}`, payload);
  }

  remove(id: string) {
    return this.delete<void>(`/coupons/${id}`);
  }
}

export const couponsService = new CouponsService();
export type { Coupon, CreateCouponPayload, UpdateCouponPayload };

