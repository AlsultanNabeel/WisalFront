import { BaseService } from './baseService';

type MessageDelivery = {
  id?: string;
  messageId?: string;
  beneficiaryId?: string;
  status?: string;
  readAt?: string;
  createdAt?: string;
  [key: string]: unknown;
};

class MessageDeliveryService extends BaseService {
  listForBeneficiary(beneficiaryId: string) {
    return this.get<MessageDelivery[]>(`/message-delivery/beneficiary/${beneficiaryId}`);
  }

  unreadCount(beneficiaryId: string) {
    return this.get<{ count: number }>(`/message-delivery/beneficiary/${beneficiaryId}/unread-count`);
  }

  markRead(id: string) {
    return this.patch<undefined, MessageDelivery>(`/message-delivery/${id}/read`, undefined);
  }

  updateStatus(id: string, status: string) {
    return this.patch<{ status: string }, MessageDelivery>(`/message-delivery/${id}/status`, { status });
  }
}

export const messageDeliveryService = new MessageDeliveryService();
export type { MessageDelivery };

