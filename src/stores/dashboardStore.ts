import { create } from 'zustand';

export interface Stats {
  todayProduction: number;
  yesterdayProduction: number;
  currentPressure: number;
  waterQualityRate: number;
  inspectionCompleteRate: number;
  activeAlarms: number;
  totalUsers: number;
  todayEnergy: number;
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
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
}

export interface DashboardAlarm {
  id: string;
  level: 'warning' | 'critical' | 'info';
  message: string;
  location: string;
  time: string;
}

interface DashboardState {
  stats: Stats;
  productionTrend: TrendPoint[];
  pressurePoints: PressurePoint[];
  alarms: DashboardAlarm[];
  loading: boolean;
  fetchStats: () => Promise<void>;
  fetchTrend: () => Promise<void>;
  updatePressure: () => Promise<void>;
  startRealTimeUpdates: () => () => void;
}

const generateInitialStats = (): Stats => ({
  todayProduction: 128560,
  yesterdayProduction: 125430,
  currentPressure: 0.32,
  waterQualityRate: 99.2,
  inspectionCompleteRate: 94.5,
  activeAlarms: 7,
  totalUsers: 28456,
  todayEnergy: 8562,
});

const generateTrend = (): TrendPoint[] => {
  const points: TrendPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    const baseProduction = 5000 + Math.sin(i / 4) * 1000;
    const baseConsumption = 4800 + Math.sin(i / 4 + 0.5) * 900;
    points.push({
      time: `${hour.getHours().toString().padStart(2, '0')}:00`,
      production: Math.round(baseProduction + Math.random() * 500),
      consumption: Math.round(baseConsumption + Math.random() * 500),
    });
  }
  return points;
};

const mockPressurePoints: PressurePoint[] = [
  { id: 'p1', name: '东城区加压站', lat: 39.92, lng: 116.42, pressure: 0.34, status: 'normal', lastUpdate: '' },
  { id: 'p2', name: '西城区监测点', lat: 39.91, lng: 116.36, pressure: 0.28, status: 'warning', lastUpdate: '' },
  { id: 'p3', name: '朝阳区水厂出口', lat: 39.93, lng: 116.48, pressure: 0.45, status: 'normal', lastUpdate: '' },
  { id: 'p4', name: '海淀区管网末端', lat: 39.95, lng: 116.32, pressure: 0.22, status: 'critical', lastUpdate: '' },
  { id: 'p5', name: '丰台区监测点', lat: 39.85, lng: 116.38, pressure: 0.31, status: 'normal', lastUpdate: '' },
  { id: 'p6', name: '石景山区加压站', lat: 39.90, lng: 116.22, pressure: 0.38, status: 'normal', lastUpdate: '' },
];

const generateAlarms = (): DashboardAlarm[] => [
  { id: 'a1', level: 'critical', message: '海淀区管网末端压力低于阈值', location: '海淀区监测点P4', time: '10分钟前' },
  { id: 'a2', level: 'warning', message: '西城区监测点压力波动异常', location: '西城区监测点P2', time: '25分钟前' },
  { id: 'a3', level: 'warning', message: '水源地浊度轻微超标', location: '一号水源厂', time: '1小时前' },
  { id: 'a4', level: 'info', message: '3号水泵完成例行保养', location: '朝阳区水厂', time: '2小时前' },
];

const getNowStr = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: generateInitialStats(),
  productionTrend: generateTrend(),
  pressurePoints: mockPressurePoints.map((p) => ({ ...p, lastUpdate: getNowStr() })),
  alarms: generateAlarms(),
  loading: false,

  fetchStats: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    set((state) => ({
      loading: false,
      stats: {
        ...state.stats,
        todayProduction: state.stats.todayProduction + Math.round(Math.random() * 100),
        currentPressure: +(0.28 + Math.random() * 0.1).toFixed(2),
        activeAlarms: Math.max(0, state.stats.activeAlarms + Math.round(Math.random() * 2 - 1)),
        todayEnergy: state.stats.todayEnergy + Math.round(Math.random() * 20),
      },
    }));
  },

  fetchTrend: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    set({ productionTrend: generateTrend(), loading: false });
  },

  updatePressure: async () => {
    await new Promise((r) => setTimeout(r, 200));
    set((state) => ({
      pressurePoints: state.pressurePoints.map((p) => {
        const delta = (Math.random() - 0.5) * 0.06;
        const newPressure = +Math.max(0.1, Math.min(0.6, p.pressure + delta)).toFixed(2);
        let status: PressurePoint['status'] = 'normal';
        if (newPressure < 0.2 || newPressure > 0.5) status = 'critical';
        else if (newPressure < 0.25 || newPressure > 0.45) status = 'warning';
        return { ...p, pressure: newPressure, status, lastUpdate: getNowStr() };
      }),
    }));
  },

  startRealTimeUpdates: () => {
    const interval = setInterval(() => {
      set((state) => {
        const newStats = { ...state.stats };
        newStats.todayProduction += Math.round(Math.random() * 50);
        newStats.currentPressure = +(0.28 + Math.random() * 0.1).toFixed(2);
        newStats.todayEnergy += Math.round(Math.random() * 10);

        const newPoints = state.pressurePoints.map((p) => {
          const delta = (Math.random() - 0.5) * 0.04;
          const newPressure = +Math.max(0.1, Math.min(0.6, p.pressure + delta)).toFixed(2);
          let status: PressurePoint['status'] = 'normal';
          if (newPressure < 0.2 || newPressure > 0.5) status = 'critical';
          else if (newPressure < 0.25 || newPressure > 0.45) status = 'warning';
          return { ...p, pressure: newPressure, status, lastUpdate: getNowStr() };
        });

        return { stats: newStats, pressurePoints: newPoints };
      });
    }, 3000);

    return () => clearInterval(interval);
  },
}));
