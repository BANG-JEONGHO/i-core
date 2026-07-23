import apiClient from './client';
import type { MatchingResult } from '../types';

export const matchingApi = {
  execute: async (taskOrderId: string): Promise<MatchingResult> => {
    const response = await apiClient.post(`/api/matching/execute/${taskOrderId}`);
    return response.data;
  },

  get: async (id: string): Promise<MatchingResult> => {
    const response = await apiClient.get(`/api/matching/${id}`);
    return response.data;
  },

  history: async (offset = 0, limit = 10): Promise<MatchingResult[]> => {
    const response = await apiClient.get('/api/matching/history', { params: { offset, limit } });
    return response.data;
  },

  addCandidate: async (matchingId: string, instructorId: string): Promise<{ candidates: string[] }> => {
    const response = await apiClient.post(`/api/matching/${matchingId}/candidates/${instructorId}`);
    return response.data;
  },

  removeCandidate: async (matchingId: string, instructorId: string): Promise<{ candidates: string[] }> => {
    const response = await apiClient.delete(`/api/matching/${matchingId}/candidates/${instructorId}`);
    return response.data;
  },

  deleteResult: async (matchingId: string): Promise<void> => {
    await apiClient.delete(`/api/matching/${matchingId}`);
  },

  getAiReason: async (matchingId: string, instructorId: string): Promise<{ reason: string }> => {
    const response = await apiClient.post(`/api/matching/${matchingId}/ai-reason/${instructorId}`);
    return response.data;
  },

  updateMemo: async (matchingId: string, memo: string): Promise<{ memo: string }> => {
    const response = await apiClient.put(`/api/matching/${matchingId}/memo`, { memo });
    return response.data;
  },
};
