import { create } from 'zustand';

export interface WaterQuality {
  turbidity: number;
  ph: number;
  residualChlorine: number;
  cod: number;
  ammoniaNitrogen: number;
  timestamp: string;
}

export interface WaterSource {
  id: string;
  name: string;
  type: 'reservoir' | 'river' | 'groundwater';
  location: string;
  status: 'normal' | 'warning' | 'offline';
  currentQuality: WaterQuality;
  dailyProduction: number;
  capacity: number;
  lastUpdate: string;
}

export interface QualityHistoryPoint {
  date: string;
  turbidity: number;
  ph: number;
  residualChlorine: number;
  cod: number;
  qualified: boolean;
}

export interface Pump {
  id: string;
  name: string;
  sourceId: string;
  status: 'running' | 'stopped' | 'maintenance';
  mode: 'auto' | 'manual';
  flow: number;
  head: number;
  power: number;
  efficiency: number;
  runHours: number;
  startCount: number;
}

export interface PumpEnergyData {
  date: string;
  energy: number;
  flow: number;
  unitConsumption: number;
}

interface WaterState {
  waterSources: WaterSource[];
  qualityHistory: QualityHistoryPoint[];
  pumps: Pump[];
  selectedSourceId: string | null;
  selectSource: (id: string) => void;
  togglePump: (id: string) => void;
  getPumpEnergyData: (pumpId: string, days?: number) => PumpEnergyData[];
}

const genQuality = (base?: Partial<WaterQuality>): WaterQuality => ({
  turbidity: +(0.3 + Math.random() * 0.5).toFixed(2),
  ph: +(7 + (Math.random() - 0.5) * 0.8).toFixed(2),
  residualChlorine: +(0.3 + Math.random() * 0.5).toFixed(2),
  cod: +(2 + Math.random() * 3).toFixed(1),
  ammoniaNitrogen: +(0.1 + Math.random() * 0.3).toFixed(2),
  timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  ...base,
});

const mockSources: WaterSource[] = [
  {
    id: 'ws-001',
    name: '青龙湖水库',
    type: 'reservoir',
    location: '市北郊青龙山脉',
    status: 'normal',
    currentQuality: genQuality(),
    dailyProduction: 45000,
    capacity: 15000000,
    lastUpdate: '',
  },
  {
    id: 'ws-002',
    name: '滨江取水口',
    type: 'river',
    location: '市东区滨江路88号',
    status: 'normal',
    currentQuality: genQuality(),
    dailyProduction: 62000,
    capacity: 0,
    lastUpdate: '',
  },
  {
    id: 'ws-003',
    name: '西郊地下水源',
    type: 'groundwater',
    location: '市西区工业园北侧',
    status: 'warning',
    currentQuality: genQuality({ turbidity: 1.2, cod: 5.8 }),
    dailyProduction: 18000,
    capacity: 800000,
    lastUpdate: '',
  },
  {
    id: 'ws-004',
    name: '东湖备用水源',
    type: 'reservoir',
    location: '市东郊旅游度假区',
    status: 'offline',
    currentQuality: genQuality(),
    dailyProduction: 0,
    capacity: 5000000,
    lastUpdate: '',
  },
];

const genHistory = (days = 14): QualityHistoryPoint[] => {
  const arr: QualityHistoryPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const turbidity = +(0.3 + Math.random() * 0.8).toFixed(2);
    const cod = +(2 + Math.random() * 4).toFixed(1);
    arr.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      turbidity,
      ph: +(7 + (Math.random() - 0.5) * 0.6).toFixed(2),
      residualChlorine: +(0.3 + Math.random() * 0.5).toFixed(2),
      cod,
      qualified: turbidity < 1.0 && cod < 6,
    });
  }
  return arr;
};

const mockPumps: Pump[] = [
  { id: 'pump-001', name: '1#主供水泵', sourceId: 'ws-001', status: 'running', mode: 'auto', flow: 240, head: 45, power: 185, efficiency: 86, runHours: 1240, startCount: 38 },
  { id: 'pump-002', name: '2#主供水泵', sourceId: 'ws-001', status: 'running', mode: 'auto', flow: 225, head: 44, power: 175, efficiency: 84, runHours: 1185, startCount: 42 },
  { id: 'pump-003', name: '3#备用泵', sourceId: 'ws-001', status: 'stopped', mode: 'manual', flow: 0, head: 45, power: 0, efficiency: 0, runHours: 520, startCount: 15 },
  { id: 'pump-004', name: '1#取水泵', sourceId: 'ws-002', status: 'running', mode: 'auto', flow: 380, head: 28, power: 220, efficiency: 88, runHours: 2100, startCount: 56 },
  { id: 'pump-005', name: '2#取水泵', sourceId: 'ws-002', status: 'maintenance', mode: 'manual', flow: 0, head: 28, power: 0, efficiency: 0, runHours: 1980, startCount: 61 },
  { id: 'pump-006', name: '1#深井泵', sourceId: 'ws-003', status: 'running', mode: 'auto', flow: 85, head: 62, power: 95, efficiency: 78, runHours: 860, startCount: 28 },
];

const nowStr = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

export const useWaterStore = create<WaterState>((set, get) => ({
  waterSources: mockSources.map((s) => ({ ...s, lastUpdate: nowStr() })),
  qualityHistory: genHistory(14),
  pumps: mockPumps,
  selectedSourceId: null,

  selectSource: (id) => {
    set({ selectedSourceId: id });
  },

  togglePump: (id) => {
    set((state) => ({
      pumps: state.pumps.map((p) => {
        if (p.id !== id) return p;
        if (p.status === 'maintenance') return p;
        const newStatus: Pump['status'] = p.status === 'running' ? 'stopped' : 'running';
        return {
          ...p,
          status: newStatus,
          flow: newStatus === 'running' ? 200 + Math.round(Math.random() * 100) : 0,
          power: newStatus === 'running' ? 150 + Math.round(Math.random() * 80) : 0,
          efficiency: newStatus === 'running' ? 80 + Math.round(Math.random() * 10) : 0,
        };
      }),
    }));
  },

  getPumpEnergyData: (pumpId, days = 7) => {
    const pump = get().pumps.find((p) => p.id === pumpId);
    if (!pump) return [];
    const data: PumpEnergyData[] = [];
    const basePower = pump.power || 150;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const hours = 18 + Math.round(Math.random() * 6);
      const energy = +(basePower * hours / 1000 + (Math.random() - 0.5) * 100).toFixed(1);
      const flow = +(pump.flow * hours * 3.6 + (Math.random() - 0.5) * 500).toFixed(0);
      data.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        energy: Math.max(0, energy),
        flow: Math.max(0, flow),
        unitConsumption: +(energy / (flow / 1000) || 0).toFixed(3),
      });
    }
    return data;
  },
}));
