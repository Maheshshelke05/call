import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_URL = 'http://10.0.2.2:8000/api/v1'; // Android emulator to local host

let apiInstance: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setApiBaseUrl = async (url: string) => {
  await AsyncStorage.setItem('api_base_url', url);
  apiInstance.defaults.baseURL = url;
};

export const getApiBaseUrl = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem('api_base_url');
  return saved || DEFAULT_API_URL;
};

// Request interceptor: attach bearer token
apiInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh token if expired (401)
apiInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${apiInstance.defaults.baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = res.data;
          await AsyncStorage.setItem('access_token', access_token);
          await AsyncStorage.setItem('refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiInstance(originalRequest);
        }
      } catch (refreshErr) {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_profile']);
      }
    }
    return Promise.reject(error);
  }
);

export const Api = {
  async login(email: string, password: string, deviceModel: string = 'Android Phone') {
    const res = await apiInstance.post('/auth/login', {
      email,
      password,
      device_model: deviceModel,
      os_version: 'Android 14',
      app_version: '1.0.0',
    });
    const { access_token, refresh_token, user } = res.data;
    await AsyncStorage.setItem('access_token', access_token);
    await AsyncStorage.setItem('refresh_token', refresh_token);
    await AsyncStorage.setItem('user_profile', JSON.stringify(user));
    return user;
  },

  async logout() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      await apiInstance.post('/auth/logout', { refresh_token: refreshToken });
    } catch (_e) {}
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_profile']);
  },

  async getMyProfile() {
    const res = await apiInstance.get('/me');
    return res.data;
  },

  async getDashboard() {
    const res = await apiInstance.get('/dashboard/employee');
    return res.data;
  },

  async getAssignedQueue(limit: number = 50, offset: number = 0) {
    const res = await apiInstance.get(`/contacts/queue?limit=${limit}&offset=${offset}`);
    return res.data;
  },

  async getDispositions() {
    const res = await apiInstance.get('/calls/dispositions');
    return res.data;
  },

  async syncCall(callData: any) {
    const res = await apiInstance.post('/calls/sync', callData);
    return res.data;
  },

  async submitDisposition(callId: number, dispositionCode: string, notes?: string, callbackAt?: string) {
    const res = await apiInstance.post(`/calls/${callId}/disposition`, {
      disposition_code: dispositionCode,
      notes,
      callback_at: callbackAt,
    });
    return res.data;
  },

  async getCallbacks(filterType: 'today' | 'overdue' | 'upcoming' = 'today') {
    const res = await apiInstance.get(`/callbacks?filter_type=${filterType}`);
    return res.data;
  },

  async scheduleCallback(contactId: number, scheduledAt: string, notes?: string, callId?: number) {
    const res = await apiInstance.post('/callbacks', {
      contact_id: contactId,
      scheduled_at: scheduledAt,
      notes,
      call_id: callId,
    });
    return res.data;
  },

  async updateSimPreference(slotIndex: number) {
    const res = await apiInstance.put(`/me/sim-preference?preferred_sim_slot=${slotIndex}`);
    return res.data;
  }
};
