import apiClient from './client';
import type { User } from '../types';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const authApi = {
  register: async (username: string, password: string, name: string): Promise<User> => {
    const response = await apiClient.post('/api/auth/register', { username, password, name });
    return response.data;
  },

  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/auth/login', { username, password });
    return response.data;
  },
};
