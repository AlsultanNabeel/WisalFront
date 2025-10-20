import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreateMessagePayload = components['schemas']['CreateMessageDto'];
type UpdateMessagePayload = components['schemas']['UpdateMessageDto'];

type Message = {
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  status?: string;
  institutionId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

class MessagesService extends BaseService {
  list() {
    return this.get<Message[]>(`/messages`);
  }

  listByInstitution(institutionId: string) {
    return this.get<Message[]>(`/messages/institution/${institutionId}`);
  }

  getById(id: string) {
    return this.get<Message>(`/messages/${id}`);
  }

  create(payload: CreateMessagePayload) {
    return this.post<CreateMessagePayload, Message>('/messages', payload);
  }

  update(id: string, payload: UpdateMessagePayload) {
    return this.put<UpdateMessagePayload, Message>(`/messages/${id}`, payload);
  }

  remove(id: string) {
    return this.delete<void>(`/messages/${id}`);
  }

  changeStatus(id: string, status: string) {
    return this.post<{ status: string }, Message>(`/messages/${id}/status`, { status });
  }

  sendToBeneficiaries(id: string, beneficiaryIds: string[]) {
    return this.post<{ beneficiaries: string[] }, Message>(`/messages/${id}/send`, {
      beneficiaries: beneficiaryIds,
    });
  }

  sendToRound(id: string, roundId: string) {
    return this.post<{ roundId: string }, Message>(`/messages/${id}/${roundId}`, { roundId });
  }

  stats(id: string) {
    return this.get<Record<string, unknown>>(`/messages/${id}/stats`);
  }
}

export const messagesService = new MessagesService();
export type { Message, CreateMessagePayload, UpdateMessagePayload };
