import { useAuthStore } from '@/stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const { user, token } = useAuthStore.getState();
  return {
    'Content-Type': 'application/json',
    'x-user-id': user?.id || '',
    'x-auth-token': token || '',
  };
};

export const api = {
  async request<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...(options.headers || {}),
        },
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || '网络请求失败' };
    }
  },

  get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let fullUrl = url;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) fullUrl += `?${qs}`;
    }
    return api.request<T>(fullUrl, { method: 'GET' });
  },

  post<T = any>(url: string, body?: any): Promise<ApiResponse<T>> {
    return api.request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T = any>(url: string, body?: any): Promise<ApiResponse<T>> {
    return api.request<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return api.request<T>(url, { method: 'DELETE' });
  },

  download(url: string, filename: string): Promise<void> {
    return fetch(`${BASE_URL}${url}`, { headers: getAuthHeaders() })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }
};

export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data: any) => api.post('/auth/users', data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getProductionTrend: (hours = 24) => api.get('/dashboard/production-trend', { hours }),
  getMonthlyEnergy: (months = 12) => api.get('/dashboard/monthly-energy', { months }),
  getPressurePoints: () => api.get('/dashboard/pressure-points'),
  getAlarms: () => api.get('/dashboard/alarms'),
  acknowledgeAlarm: (id: string) => api.post(`/dashboard/alarms/${id}/acknowledge`),
  resolveAlarm: (id: string) => api.post(`/dashboard/alarms/${id}/resolve`),
  getConfig: () => api.get('/dashboard/config'),
  updateConfig: (data: any) => api.put('/dashboard/config', data),
  tick: () => api.get('/dashboard/tick'),
  exportReport: (type: 'operation' | 'energy', month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return api.download(`/dashboard/export/${type}${qs}`, `${type === 'operation' ? '月度运营分析' : '能耗成本'}.csv`);
  },
};

export const waterApi = {
  getSources: () => api.get('/water/sources'),
  getSource: (id: string) => api.get(`/water/sources/${id}`),
  getQualityHistory: (sourceId?: string, hours = 168) => api.get('/water/quality-history', { sourceId, hours }),
  collectQuality: () => api.post('/water/quality/collect'),
  getPumps: () => api.get('/water/pumps'),
  togglePump: (id: string) => api.post(`/water/pumps/${id}/toggle`),
  smartAdjustPumps: (plantId?: string) => api.post('/water/pumps/smart-adjust', { plantId }),
  getPressure: () => api.get('/water/pressure'),
  getEnergyRecords: (pumpId?: string) => api.get('/water/energy-records', { pumpId }),
};

export const meteringApi = {
  getCustomers: (search?: string) => api.get('/metering/customers', { search }),
  getCustomer: (id: string) => api.get(`/metering/customers/${id}`),
  readMeter: (id: string, reading?: number) => api.post(`/metering/customers/${id}/read`, { reading }),
  getBills: (status?: string, customerId?: string) => api.get('/metering/bills', { status, customerId }),
  getBill: (id: string) => api.get(`/metering/bills/${id}`),
  payBill: (id: string, amount?: number) => api.post(`/metering/bills/${id}/pay`, { amount }),
  remindBill: (id: string, type = 'sms') => api.post(`/metering/bills/${id}/remind`, { type }),
  createValveOrder: (id: string) => api.post(`/metering/bills/${id}/valve-order`),
  checkBilling: () => api.post('/metering/billing/check'),
};

export const drainageApi = {
  getPoints: () => api.get('/drainage/points'),
  getPoint: (id: string) => api.get(`/drainage/points/${id}`),
  getPumps: (pointId?: string) => api.get('/drainage/pumps', { pointId }),
  togglePump: (id: string) => api.post(`/drainage/pumps/${id}/toggle`),
  checkDrainage: () => api.post('/drainage/check'),
  getWarnings: () => api.get('/drainage/warnings'),
};

export const sewageApi = {
  getStages: (plantId?: string) => api.get('/sewage/stages', { plantId }),
  getStage: (id: string) => api.get(`/sewage/stages/${id}`),
  collectStages: () => api.post('/sewage/stages/collect'),
  getDevices: (stageId?: string) => api.get('/sewage/devices', { stageId }),
  unlockDevice: (id: string) => api.post(`/sewage/devices/${id}/unlock`),
};

export const inspectionApi = {
  getTasks: () => api.get('/inspection/tasks'),
  getTask: (id: string) => api.get(`/inspection/tasks/${id}`),
  checkIn: (taskId: string, cpId: string, photoUrl?: string) =>
    api.post(`/inspection/tasks/${taskId}/checkpoint/${cpId}`, { photoUrl }),
  generateTasks: (areas?: string[]) => api.post('/inspection/tasks/generate', { areas }),
  getWorkOrders: (status?: string, priority?: string) =>
    api.get('/inspection/work-orders', { status, priority }),
  getWorkOrder: (id: string) => api.get(`/inspection/work-orders/${id}`),
  createWorkOrder: (data: any) => api.post('/inspection/work-orders', data),
  updateWorkOrder: (id: string, data: any) => api.put(`/inspection/work-orders/${id}`, data),
  completeWorkOrder: (id: string, beforePhotos?: string[], afterPhotos?: string[]) =>
    api.post(`/inspection/work-orders/${id}/complete`, { beforePhotos, afterPhotos }),
  upgradeWorkOrder: (id: string, reason?: string, targetRole = 'supervisor') =>
    api.post(`/inspection/work-orders/${id}/upgrade`, { reason, targetRole }),
  checkEscalation: () => api.post('/inspection/check-escalation'),
};
