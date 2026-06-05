import { create } from 'zustand';
import { dashboardApi } from '@/lib/api';

export type AlarmLevel = 1 | 2 | 3;
export type AlarmStatus = 'pending' | 'processing' | 'resolved';
export type AlarmType = 'water_quality' | 'pressure' | 'pump' | 'drainage' | 'sewage' | 'device';

export interface Alarm {
  id: string;
  sourceId?: string;
  plantId?: string;
  level: AlarmLevel;
  type: AlarmType;
  parameter: string;
  value: number;
  threshold: number;
  timestamp: number;
  status: AlarmStatus;
  suggestion?: string;
  pushedTo: string[];
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolvedAt?: number;
}

interface AlarmState {
  alarms: Alarm[];
  selectedAlarmId: string | null;
  loading: boolean;
  fetchAlarms: () => Promise<void>;
  selectAlarm: (id: string) => void;
  acknowledgeAlarm: (id: string) => Promise<void>;
  resolveAlarm: (id: string) => Promise<void>;
  getAlarmsByLevel: (level?: AlarmLevel) => Alarm[];
  getActiveAlarms: () => Alarm[];
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  selectedAlarmId: null,
  loading: false,

  fetchAlarms: async () => {
    const res = await dashboardApi.getAlarms();
    if (res.success && res.data) {
      set({
        alarms: (res.data as Alarm[]).sort((a, b) => b.timestamp - a.timestamp),
        loading: false,
      });
    }
  },

  selectAlarm: (id) => set({ selectedAlarmId: id }),

  acknowledgeAlarm: async (id) => {
    const res = await dashboardApi.acknowledgeAlarm(id);
    if (res.success) {
      await get().fetchAlarms();
    }
  },

  resolveAlarm: async (id) => {
    const res = await dashboardApi.resolveAlarm(id);
    if (res.success) {
      await get().fetchAlarms();
    }
  },

  getAlarmsByLevel: (level) => {
    const alarms = get().alarms;
    if (!level) return alarms;
    return alarms.filter((a) => a.level === level);
  },

  getActiveAlarms: () => {
    return get().alarms.filter((a) => a.status !== 'resolved');
  },
}));
