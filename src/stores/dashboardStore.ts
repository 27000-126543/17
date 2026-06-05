import { create } from 'zustand';
import { dashboardApi } from '@/lib/api';

export interface Stats {
  totalProduction: number;
  avgPressure: number;
  waterQualityRate: number;
  inspectionRate: number;
  activeAlarms: number;
  totalEnergy: number;
}

export interface TrendPoint {
  time: string;
  production: number;
  consumption: number;
}

export interface PressurePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  pressure: number;
  status: 'normal' | 'warning' | 'alarm';
  lastUpdate: string;
  area?: string;
  plantId?: string;
}

export interface DashboardAlarm {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  location: string;
  time: string;
  parameter?: string;
  value?: number;
  threshold?: number;
  status?: string;
}

interface DashboardState {
  stats: Stats;
  productionTrend: TrendPoint[];
  monthlyEnergy: { month: string; energy: number; cost: number }[];
  pressurePoints: PressurePoint[];
  alarms: DashboardAlarm[];
  loading: boolean;
  filters: {
    area: string;
    timeRange: string;
    indicator: string;
  };
  setFilters: (filters: Partial<DashboardState['filters']>) => void;
  fetchStats: () => Promise<void>;
  fetchTrend: (hours?: number) => Promise<void>;
  fetchMonthlyEnergy: (months?: number) => Promise<void>;
  fetchPressure: () => Promise<void>;
  fetchAlarms: () => Promise<void>;
  acknowledgeAlarm: (id: string) => Promise<void>;
  resolveAlarm: (id: string) => Promise<void>;
  exportReport: (type: 'operation' | 'energy', month?: string) => Promise<void>;
  startRealTimeUpdates: () => () => void;
  fetchAll: () => Promise<void>;
}

const emptyStats: Stats = {
  totalProduction: 0,
  avgPressure: 0,
  waterQualityRate: 0,
  inspectionRate: 0,
  activeAlarms: 0,
  totalEnergy: 0,
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.floor((now - ts) / 60000);
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff}分钟前`;
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const mapAlarmLevel = (level: number): DashboardAlarm['level'] => {
  if (level >= 3) return 'critical';
  if (level === 2) return 'warning';
  return 'info';
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: emptyStats,
  productionTrend: [],
  monthlyEnergy: [],
  pressurePoints: [],
  alarms: [],
  loading: false,
  filters: { area: 'all', timeRange: 'today', indicator: 'all' },

  setFilters: (filters) => {
    set((s) => ({ filters: { ...s.filters, ...filters } }));
    get().fetchAll();
  },

  fetchStats: async () => {
    const res = await dashboardApi.getStats();
    if (res.success && res.data) {
      set({ stats: res.data as Stats });
    }
  },

  fetchTrend: async (hours = 24) => {
    const res = await dashboardApi.getProductionTrend(hours);
    if (res.success && res.data) {
      set({ productionTrend: res.data as TrendPoint[] });
    }
  },

  fetchMonthlyEnergy: async (months = 12) => {
    const res = await dashboardApi.getMonthlyEnergy(months);
    if (res.success && res.data) {
      set({ monthlyEnergy: res.data as { month: string; energy: number; cost: number }[] });
    }
  },

  fetchPressure: async () => {
    const res = await dashboardApi.getPressurePoints();
    if (res.success && res.data) {
      const points = (res.data as any[]).map((p) => ({
        ...p,
        lat: p.lat,
        lng: p.lng,
        lastUpdate: formatTime(p.timestamp || Date.now()),
        status: p.status === 'normal' ? 'normal' : p.status === 'warning' ? 'warning' : 'alarm',
      }));
      set({ pressurePoints: points });
    }
  },

  fetchAlarms: async () => {
    const res = await dashboardApi.getAlarms();
    if (res.success && res.data) {
      const alarms = (res.data as any[]).map((a) => ({
        id: a.id,
        level: mapAlarmLevel(a.level),
        message: `${a.parameter || a.type} ${a.value} 超标(阈值${a.threshold})`,
        location: a.sourceId || a.plantId || a.pointId || '系统',
        time: formatTime(a.timestamp),
        parameter: a.parameter,
        value: a.value,
        threshold: a.threshold,
        status: a.status,
      }));
      set({ alarms });
    }
  },

  acknowledgeAlarm: async (id) => {
    await dashboardApi.acknowledgeAlarm(id);
    await get().fetchAlarms();
  },

  resolveAlarm: async (id) => {
    await dashboardApi.resolveAlarm(id);
    await get().fetchAlarms();
  },

  exportReport: async (type, month) => {
    await dashboardApi.exportReport(type, month);
  },

  startRealTimeUpdates: () => {
    get().fetchAll();
    const interval = setInterval(() => {
      get().fetchStats();
      get().fetchPressure();
      get().fetchAlarms();
    }, 15000);
    return () => clearInterval(interval);
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchStats(),
      get().fetchTrend(),
      get().fetchMonthlyEnergy(),
      get().fetchPressure(),
      get().fetchAlarms(),
    ]);
    set({ loading: false });
  },
}));
