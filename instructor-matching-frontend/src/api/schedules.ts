import apiClient from './client';

export interface Schedule {
  id: string;
  instructor_id: string;
  instructor_name: string;
  project_name: string;
  start_date: string;
  end_date: string;
  note: string | null;
  created_at: string;
}

export const schedulesApi = {
  list: async (instructorId?: string): Promise<Schedule[]> => {
    const params = instructorId ? { instructor_id: instructorId } : {};
    const response = await apiClient.get('/api/schedules/', { params });
    return response.data;
  },

  create: async (data: {
    instructor_id: string;
    instructor_name: string;
    project_name: string;
    start_date: string;
    end_date: string;
    note?: string;
  }): Promise<Schedule> => {
    const response = await apiClient.post('/api/schedules/', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/schedules/${id}`);
  },
};
