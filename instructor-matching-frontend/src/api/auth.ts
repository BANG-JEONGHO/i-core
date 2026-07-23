import apiClient from './client';
import type { User } from '../types';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface GoogleLoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string | null;
  };
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/auth/login', { username, password });
    return response.data;
  },

  googleLogin: async (credential: string): Promise<GoogleLoginResponse> => {
    const response = await apiClient.post('/api/auth/google', { credential });
    return response.data;
  },
};
