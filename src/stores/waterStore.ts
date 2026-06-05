import { create } from 'zustand';
import { waterApi } from '@/lib/api';

export interface WaterQuality {
  turbidity: number;
  ph: number;
  residualChlorine: number;
  cod: number;
  ammoniaNitrogen: number;
  timestamp: number;
}

export interface WaterSource {
  id: string;
  name: string;
  location: string;
  plantId: string;
  area: string;
  status: 'normal' | 'warning' | 'alarm';
  capacity: number;
  currentQuality?: WaterQuality;
}

export interface QualityHistoryPoint {
  time: string;
  turbidity: number;
  ph: number;
  residualChlorine: number;
  cod: number;
  ammoniaNitrogen: number;
  qualified: boolean;
}

export interface Pump {
  id: string;
  name: string;
  plantId: string;
  sourceId: string;
  status: 'running' | 'stopped' | 'fault' | 'maintenance';
  mode: 'auto' | 'manual';
  ratedPower: number;
  power: number;
  flow: number;
  head: number;
  efficiency: number;
  runHours: number;
  startCount: number;
  totalEnergy: number;
  currentEnergy: number;
}

export interface EnergyRecord {
  id: string;
  pumpId: string;
  timestamp: number;
  power: number;
  flow: number;
  duration: number;
  energy: number;
}

interface WaterState {
  waterSources: WaterSource[];
  qualityHistory: QualityHistoryPoint[];
  pumps: Pump[];
  energyRecords: EnergyRecord[];
  selectedSourceId: string | null;
  loading: boolean;
  fetchSources: () => Promise<void>;
  fetchQualityHistory: (sourceId?: string, hours?: number) => Promise<void>;
  fetchPumps: () => Promise<void>;
  fetchEnergyRecords: (pumpId?: string) => Promise<void>;
  selectSource: (id: string) => void;
  togglePump: (id: string) => Promise<void>;
  smartAdjust: (plantId?: string) => Promise<void>;
  getPumpEnergyData: (pumpId: string, days?: number) => { date: string; energy: number; flow: number; unitConsumption: number }[];
  fetchAll: () => Promise<void>;
}

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const useWaterStore = create<WaterState>((set, get) => ({
  waterSources: [],
  qualityHistory: [],
  pumps: [],
  energyRecords: [],
  selectedSourceId: null,
  loading: false,

  fetchSources: async () => {
    const res = await waterApi.getSources();
    if (res.success && res.data) {
      set({ waterSources: res.data as WaterSource[] });
    }
  },

  fetchQualityHistory: async (sourceId, hours = 168) => {
    const res = await waterApi.getQualityHistory(sourceId, hours);
    if (res.success && res.data) {
      const th = { turbidity: 1.0, phMin: 6.5, phMax: 8.5, cod: 6.0 };
      const history = (res.data as any[]).map((d) => ({
        time: formatTime(d.timestamp),
        turbidity: d.turbidity,
        ph: d.ph,
        residualChlorine: d.residualChlorine,
        cod: d.cod,
        ammoniaNitrogen: d.ammoniaNitrogen,
        qualified: d.turbidity < th.turbidity && d.ph >= th.phMin && d.ph <= th.phMax && d.cod < th.cod,
      }));
      set({ qualityHistory: history });
    }
  },

  fetchPumps: async () => {
    const res = await waterApi.getPumps();
    if (res.success && res.data) {
      set({ pumps: res.data as Pump[] });
    }
  },

  fetchEnergyRecords: async (pumpId) => {
    const res = await waterApi.getEnergyRecords(pumpId);
    if (res.success && res.data) {
      set({ energyRecords: res.data as EnergyRecord[] });
    }
  },

  selectSource: (id) => {
    set({ selectedSourceId: id });
    if (id) {
      get().fetchQualityHistory(id);
    }
  },

  togglePump: async (id) => {
    const res = await waterApi.togglePump(id);
    if (res.success) {
      await get().fetchPumps();
    }
  },

  smartAdjust: async (plantId) => {
    await waterApi.smartAdjustPumps(plantId);
    await get().fetchPumps();
  },

  getPumpEnergyData: (pumpId, days = 7) => {
    const pump = get().pumps.find((p) => p.id === pumpId);
    if (!pump) return [];
    const data: { date: string; energy: number; flow: number; unitConsumption: number }[] = [];
    const basePower = pump.ratedPower || 150;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const hours = 18 + Math.round(Math.random() * 6);
      const energy = +(basePower * hours / 1000 + (Math.random() - 0.5) * 100).toFixed(1);
      const flow = +((pump.flow || 200) * hours * 3.6 + (Math.random() - 0.5) * 500).toFixed(0);
      data.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        energy: Math.max(0, energy),
        flow: Math.max(0, flow),
        unitConsumption: +(energy / (flow / 1000) || 0).toFixed(3),
      });
    }
    return data;
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([get().fetchSources(), get().fetchPumps()]);
    const sources = get().waterSources;
    if (sources.length > 0 && !get().selectedSourceId) {
      get().selectSource(sources[0].id);
    }
    set({ loading: false });
  },
}));
