import { create } from 'zustand';
import { sewageApi, inspectionApi } from '@/lib/api';
import type { WorkOrder } from './inspectionStore';

export interface SewageStage {
  id: string;
  name: string;
  plantId: string;
  order: number;
  icon?: string;
  cod: number;
  ammoniaNitrogen: number;
  codRemoval: number;
  ammoniaRemoval: number;
  flow: number;
  isAlarm: boolean;
}

export interface SewageDevice {
  id: string;
  name: string;
  stageId: string;
  status: 'normal' | 'locked' | 'fault';
  lockedBy?: string;
  lockedAt?: number;
  unlockedBy?: string;
  unlockedAt?: number;
}

export interface SewageWorkOrder extends WorkOrder {
  stageId: string;
  parameter: string;
  value: number;
  threshold: number;
  deviceLocked: boolean;
  deviceId: string;
}

interface SewageState {
  stages: SewageStage[];
  devices: SewageDevice[];
  workOrders: SewageWorkOrder[];
  loading: boolean;
  fetchStages: (plantId?: string) => Promise<void>;
  collectData: () => Promise<void>;
  fetchDevices: (stageId?: string) => Promise<void>;
  unlockDevice: (id: string) => Promise<void>;
  fetchWorkOrders: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useSewageStore = create<SewageState>((set, get) => ({
  stages: [],
  devices: [],
  workOrders: [],
  loading: false,

  fetchStages: async (plantId) => {
    const res = await sewageApi.getStages(plantId);
    if (res.success && res.data) {
      set({ stages: (res.data as SewageStage[]).sort((a, b) => a.order - b.order) });
    }
  },

  collectData: async () => {
    const res = await sewageApi.collectStages();
    if (res.success) {
      await get().fetchStages();
    }
  },

  fetchDevices: async (stageId) => {
    const res = await sewageApi.getDevices(stageId);
    if (res.success && res.data) {
      set({ devices: res.data as SewageDevice[] });
    }
  },

  unlockDevice: async (id) => {
    const res = await sewageApi.unlockDevice(id);
    if (res.success) {
      await get().fetchDevices();
    }
  },

  fetchWorkOrders: async () => {
    const res = await inspectionApi.getWorkOrders();
    if (res.success && res.data) {
      set({ workOrders: (res.data as SewageWorkOrder[]).sort((a, b) => b.createdAt - a.createdAt) });
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([get().fetchStages(), get().fetchDevices(), get().fetchWorkOrders()]);
    set({ loading: false });
  },
}));
