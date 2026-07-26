import apiClient from './client';

export interface Schedule {
  id: string;
  instructor_id: string;
  instructor_name: string;
  project_name: string;
  start_date: string;
  end_date: string;
  note: string | null;
  created_at?: string;
}

export const schedulesApi = {
  list: async (instructorId?: string): Promise<Schedule[]> => {
    const response = await apiClient.get('/api/schedules/', { params: instructorId ? { instructor_id: instructorId } : {} });
    return response.data;
  },
  create: async (data: Omit<Schedule, 'id' | 'created_at'>): Promise<Schedule> => {
    const response = await apiClient.post('/api/schedules/', data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => { await apiClient.delete(`/api/schedules/${id}`); },
};

export const portalApi = {
  register: async (name: string): Promise<{ instructor_id: string; name: string; is_new: boolean }> => (await apiClient.post('/api/portal/register', { name })).data,
  schedules: async (id: string): Promise<Schedule[]> => (await apiClient.get(`/api/portal/schedules/${id}`)).data,
  addSchedule: async (data: Omit<Schedule, 'id' | 'created_at'>): Promise<Schedule> => (await apiClient.post('/api/portal/schedules', data)).data,
  deleteSchedule: async (id: string): Promise<void> => { await apiClient.delete(`/api/portal/schedules/${id}`); },
  uploadResume: async (id: string, file: File): Promise<void> => {
    const body = new FormData();
    body.append('file', file);
    await apiClient.post(`/api/portal/resume/${id}`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
