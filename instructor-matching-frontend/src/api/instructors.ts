import apiClient from './client';
import type { BulkUploadResponse, Instructor, PaginatedResponse } from '../types';

export const instructorsApi = {
  list: async (keyword?: string, offset = 0, limit = 20): Promise<PaginatedResponse<Instructor>> => {
    const params: Record<string, string | number> = { offset, limit };
    if (keyword) params.keyword = keyword;
    const response = await apiClient.get('/api/instructors/', { params });
    return response.data;
  },

  get: async (id: string): Promise<Instructor> => {
    const response = await apiClient.get(`/api/instructors/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/instructors/${id}`);
  },

  deleteAll: async (): Promise<{ deleted: number }> => {
    const response = await apiClient.delete('/api/instructors/all');
    return response.data;
  },

  upload: async (file: File): Promise<BulkUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/instructors/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
