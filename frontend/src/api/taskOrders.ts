import apiClient from './client';
import type { PaginatedResponse, TaskOrder } from '../types';

export const taskOrdersApi = {
  upload: async (file: File): Promise<TaskOrder> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/task-orders/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  list: async (offset = 0, limit = 20): Promise<PaginatedResponse<TaskOrder>> => {
    const response = await apiClient.get('/api/task-orders/', { params: { offset, limit } });
    return response.data;
  },

  get: async (id: string): Promise<TaskOrder> => {
    const response = await apiClient.get(`/api/task-orders/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/task-orders/${id}`);
  },

  reparse: async (id: string): Promise<TaskOrder> => {
    const response = await apiClient.post(`/api/task-orders/${id}/reparse`, {}, { timeout: 130000 });
    return response.data;
  },
};
