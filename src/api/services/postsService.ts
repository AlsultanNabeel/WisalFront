import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreatePostPayload = components['schemas']['CreatePostDto'];
type UpdatePostPayload = components['schemas']['UpdatePostDto'];
type PostsListResponse = components['schemas']['PostsListResponseDto'];
type Post = components['schemas']['PostResponseDto'] & {
  [key: string]: unknown;
};

class PostsService extends BaseService {
  list(params?: Record<string, string | undefined>) {
    return this.get<PostsListResponse>(`/posts`, { params });
  }

  listByInstitution(institutionId: string) {
    return this.get<Post[]>(`/posts/institution/${institutionId}`);
  }

  getById(id: string) {
    return this.get<Post>(`/posts/${id}`);
  }

  create(payload: CreatePostPayload) {
    return this.post<CreatePostPayload, Post>('/posts', payload);
  }

  update(id: string, payload: UpdatePostPayload) {
    return this.put<UpdatePostPayload, Post>(`/posts/${id}`, payload);
  }

  remove(id: string) {
    return this.delete<void>(`/posts/${id}`);
  }
}

export const postsService = new PostsService();
export type { Post, CreatePostPayload, UpdatePostPayload, PostsListResponse };
