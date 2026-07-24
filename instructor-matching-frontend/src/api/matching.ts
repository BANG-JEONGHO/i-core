import apiClient from './client';
import type { MatchingResult } from '../types';

// A/B 검증은 후보별 LLM 호출을 포함하므로 기본 API 제한(60초)보다 길게 둔다.
const MATCHING_TIMEOUT_MS = 30 * 60 * 1000;

export const matchingApi = {
  execute: async (taskOrderId: string): Promise<MatchingResult> => {
    const response = await apiClient.post(
      `/api/matching/execute/${taskOrderId}`,
      undefined,
      { timeout: MATCHING_TIMEOUT_MS },
    );
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
};
