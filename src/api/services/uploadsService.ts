import { BaseService } from './baseService';

type UploadResponse = {
  url?: string;
  urls?: string[];
  message?: string;
  [key: string]: unknown;
};

class UploadsService extends BaseService {
  listInstitutionImages(institutionId: string) {
    return this.get<string[] | UploadResponse>(`/uploads/profile/${institutionId}`);
  }

  uploadInstitutionImage(file: File, institutionId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (institutionId) {
      formData.append('institutionId', institutionId);
    }

    return this.post<FormData, UploadResponse>(
      '/uploads/profile',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  }

  deleteInstitutionImage(imageName: string, institutionId?: string) {
    const params: Record<string, string> = { imageName };
    if (institutionId) {
      params.institutionId = institutionId;
    }

    return this.delete<UploadResponse>('/uploads/profile-image', { params });
  }

  uploadPostImages(postId: string, files: FileList | File[]) {
    const formData = new FormData();
    const list = Array.from(files as FileList | File[]);
    list.forEach((file) => {
      formData.append('image', file);
    });

    return this.post<FormData, UploadResponse>(
      `/uploads/post/${postId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  }

  listPostImages(postId: string) {
    return this.get<string[]>(`/uploads/post/${postId}`);
  }

  deletePostImage(postId: string, imageName: string) {
    return this.delete<UploadResponse>(`/uploads/post/${postId}/image/${encodeURIComponent(imageName)}`);
  }
}

export const uploadsService = new UploadsService();
export type { UploadResponse };
