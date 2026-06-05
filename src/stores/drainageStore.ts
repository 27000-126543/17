import { create } from 'zustand';
import { drainageApi } from '@/lib/api';

export interface DrainagePoint {
  id: string;
  name: string;
  area: string;
  plantId: string;
  lng: number;
  lat: number;
  level: number;
  warningLevel: number;
  alarmLevel: number;
  maxLevel: number;
  status: string;
  pumpIds: string[];
}

export interface DrainagePump {
  id: string;
  name: string;
  pointId: string;
  status: 'idle' | 'running' | 'fault';
  mode: 'auto' | 'manual';
  power: number;
  currentEnergy: number;
  totalEnergy: number;
  flow: number;
  runHours: number;
}

export interface DrainageWarning {
  id: string;
  pointId: string;
  type: string;
  level: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

interface DrainageState {
  points: DrainagePoint[];
  pumps: DrainagePump[];
  warnings: DrainageWarning[];
  loading: boolean;
  fetchPoints: () => Promise<void>;
  fetchPumps: (pointId?: string) => Promise<void>;
  togglePump: (id: string) => Promise<void>;
  fetchWarnings: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useDrainageStore = create<DrainageState>((set, get) => ({
  points: [],
  pumps: [],
  warnings: [],
  loading: false,

  fetchPoints: async () => {
    const res = await drainageApi.getPoints();
    if (res.success && res.data) {
      set({ points: res.data as DrainagePoint[] });
    }
  },

  fetchPumps: async (pointId) => {
    const res = await drainageApi.getPumps(pointId);
    if (res.success && res.data) {
      set({ pumps: res.data as DrainagePump[] });
    }
  },

  togglePump: async (id) => {
    const res = await drainageApi.togglePump(id);
    if (res.success) {
      await get().fetchPumps();
      await get().fetchPoints();
    }
  },

  fetchWarnings: async () => {
    const res = await drainageApi.getWarnings();
    if (res.success && res.data) {
      set({ warnings: res.data as DrainageWarning[] });
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([get().fetchPoints(), get().fetchPumps(), get().fetchWarnings()]);
    set({ loading: false });
  },
}));
