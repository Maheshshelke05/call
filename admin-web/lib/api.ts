import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const AdminApi = {
  async login(email: string, pass: string) {
    const res = await apiClient.post('/auth/login', {
      email,
      password: pass,
      device_model: 'Admin Portal Web',
    });
    const { access_token, user } = res.data;
    localStorage.setItem('admin_access_token', access_token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  },

  async getDashboard() {
    const res = await apiClient.get('/dashboard/admin');
    return res.data;
  },

  async getEmployees() {
    const res = await apiClient.get('/employees');
    return res.data;
  },

  async createEmployee(data: any) {
    const res = await apiClient.post('/employees', data);
    return res.data;
  },

  async updateEmployee(id: number, data: any) {
    const res = await apiClient.put(`/employees/${id}`, data);
    return res.data;
  },

  async getTeams() {
    const res = await apiClient.get('/teams');
    return res.data;
  },

  async createTeam(data: any) {
    const res = await apiClient.post('/teams', data);
    return res.data;
  },

  async getContacts(search?: string, priority?: number, limit = 50, offset = 0) {
    let url = `/contacts?limit=${limit}&offset=${offset}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (priority) url += `&priority=${priority}`;
    const res = await apiClient.get(url);
    return res.data;
  },

  async createContact(data: any) {
    const res = await apiClient.post('/contacts', data);
    return res.data;
  },

  async assignContacts(employeeId: number, contactIds: number[], campaignId?: number) {
    const res = await apiClient.post('/contacts/assign', {
      employee_id: employeeId,
      contact_ids: contactIds,
      campaign_id: campaignId,
    });
    return res.data;
  },

  async previewImport(formData: FormData) {
    const res = await apiClient.post('/contacts/import-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async confirmImport(formData: FormData) {
    const res = await apiClient.post('/contacts/import-confirm', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getCampaigns() {
    const res = await apiClient.get('/campaigns');
    return res.data;
  },

  async createCampaign(data: any) {
    const res = await apiClient.post('/campaigns', data);
    return res.data;
  },

  async getCalls(employeeId?: number, limit = 50, offset = 0) {
    let url = `/calls?limit=${limit}&offset=${offset}`;
    if (employeeId) url += `&employee_id=${employeeId}`;
    const res = await apiClient.get(url);
    return res.data;
  },

  async getRecordings(limit = 50, offset = 0) {
    const res = await apiClient.get(`/recordings?limit=${limit}&offset=${offset}`);
    return res.data;
  },

  async getPlaybackUrl(recordingId: number, action = 'PLAY') {
    const res = await apiClient.get(`/recordings/${recordingId}/playback-url?action=${action}`);
    return res.data;
  },

  async getReports() {
    const res = await apiClient.get('/reports');
    return res.data;
  },

  async getAuditLogs(actorId?: number, limit = 50, offset = 0) {
    let url = `/audit-logs?limit=${limit}&offset=${offset}`;
    if (actorId) url += `&actor_id=${actorId}`;
    const res = await apiClient.get(url);
    return res.data;
  },

  async getSettings() {
    const res = await apiClient.get('/settings');
    return res.data;
  },

  async updateSettings(settings: Record<string, string>) {
    const res = await apiClient.put('/settings', { settings });
    return res.data;
  },

  async createDisposition(data: any) {
    const res = await apiClient.post('/settings/dispositions', data);
    return res.data;
  },

  async updateDisposition(id: number, data: any) {
    const res = await apiClient.put(`/settings/dispositions/${id}`, data);
    return res.data;
  },
};

