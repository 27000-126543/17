import { create } from 'zustand';

export type AlarmLevel = 'info' | 'warning' | 'critical';
export type AlarmStatus = 'pending' | 'acknowledged' | 'resolved';
export type AlarmCategory = 'water_quality' | 'pressure' | 'equipment' | 'flow' | 'energy' | 'other';

export interface Alarm {
  id: string;
  title: string;
  category: AlarmCategory;
  level: AlarmLevel;
  status: AlarmStatus;
  location: string;
  deviceId?: string;
  description: string;
  value?: number;
  threshold?: { min?: number; max?: number };
  unit?: string;
  suggestion?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedNote?: string;
  workOrderId?: string;
}

interface AlarmState {
  alarms: Alarm[];
  selectedAlarmId: string | null;
  getAlarmsByLevel: (level?: AlarmLevel) => Alarm[];
  acknowledgeAlarm: (id: string) => void;
  resolveAlarm: (id: string, note: string) => void;
}

const nowIso = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const pastIso = (hours: number) => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString().slice(0, 16).replace('T', ' ');
};

const mockAlarms: Alarm[] = [
  {
    id: 'al-001',
    title: '管网末端压力过低',
    category: 'pressure',
    level: 'critical',
    status: 'pending',
    location: '海淀区管网末端监测点P4',
    deviceId: 'P4',
    description: '当前压力 0.18 MPa，低于下限阈值 0.20 MPa，已持续15分钟',
    value: 0.18,
    threshold: { min: 0.2 },
    unit: 'MPa',
    suggestion: '建议立即检查加压站运行状态，必要时启动备用泵；若为管网漏损，立即派巡检人员排查。',
    createdAt: pastIso(0.5),
  },
  {
    id: 'al-002',
    title: '水质浊度超标',
    category: 'water_quality',
    level: 'warning',
    status: 'acknowledged',
    location: '西郊地下水源取水口',
    deviceId: 'WS-Q-003',
    description: '浊度 1.25 NTU，超过限值 1.0 NTU',
    value: 1.25,
    threshold: { max: 1.0 },
    unit: 'NTU',
    suggestion: '建议加强絮凝沉淀工艺监控，必要时调整投药量；同步排查水源地水质变化原因。',
    createdAt: pastIso(2),
    acknowledgedAt: pastIso(1.5),
    acknowledgedBy: '李厂长',
  },
  {
    id: 'al-003',
    title: '水源COD接近阈值',
    category: 'water_quality',
    level: 'warning',
    status: 'pending',
    location: '滨江取水口',
    deviceId: 'WS-Q-002',
    description: 'COD 5.8 mg/L，接近预警阈值 6.0 mg/L',
    value: 5.8,
    threshold: { max: 6.0 },
    unit: 'mg/L',
    suggestion: '密切关注上游水质变化，必要时启动备用水源切换预案。',
    createdAt: pastIso(1),
  },
  {
    id: 'al-004',
    title: '2号取水泵振动异常',
    category: 'equipment',
    level: 'warning',
    status: 'resolved',
    location: '滨江取水口取水泵房',
    deviceId: 'pump-005',
    description: '振动值 4.5 mm/s，超过正常范围 2.8 mm/s',
    value: 4.5,
    threshold: { max: 2.8 },
    unit: 'mm/s',
    suggestion: '建议立即停机检查，检查轴承、联轴器及基础螺栓，必要时安排检修。',
    createdAt: pastIso(36),
    acknowledgedAt: pastIso(35),
    acknowledgedBy: '李厂长',
    resolvedAt: pastIso(10),
    resolvedBy: '王维修',
    resolvedNote: '已更换轴承，重新校准对中，运行参数恢复正常。',
    workOrderId: 'wo-004',
  },
  {
    id: 'al-005',
    title: '西城区压力波动',
    category: 'pressure',
    level: 'warning',
    status: 'acknowledged',
    location: '西城区监测点P2',
    deviceId: 'P2',
    description: '10分钟内压力波动范围 0.26~0.36 MPa，波动幅度超正常范围',
    createdAt: pastIso(3),
    acknowledgedAt: pastIso(2.5),
    acknowledgedBy: '王调度',
    suggestion: '检查该区域阀门开关状态，确认是否存在瞬时大流量用水或管网空气。',
  },
  {
    id: 'al-006',
    title: '3号水泵效率下降',
    category: 'energy',
    level: 'info',
    status: 'resolved',
    location: '青龙湖水厂供水泵房',
    deviceId: 'pump-003',
    description: '水泵效率 72%，低于基准值 80%，可能存在叶轮磨损',
    value: 72,
    threshold: { min: 80 },
    unit: '%',
    suggestion: '安排计划性检修，检查叶轮磨损及密封情况，必要时进行车削或更换。',
    createdAt: pastIso(72),
    acknowledgedAt: pastIso(70),
    acknowledgedBy: '李厂长',
    resolvedAt: pastIso(48),
    resolvedBy: '赵师傅',
    resolvedNote: '已完成叶轮清洗及密封更换，效率恢复至 83%。',
  },
  {
    id: 'al-007',
    title: '瞬时流量突变',
    category: 'flow',
    level: 'info',
    status: 'pending',
    location: '朝阳水厂出厂总管',
    deviceId: 'FM-003',
    description: '瞬时流量 5分钟内从 320 m³/h 升至 580 m³/h，疑似存在异常用水或爆管',
    createdAt: pastIso(0.2),
    suggestion: '请调度中心核实该区域用户用水情况，通知附近巡检人员现场排查。',
  },
  {
    id: 'al-008',
    title: '余氯偏低',
    category: 'water_quality',
    level: 'warning',
    status: 'pending',
    location: '丰台区管网末梢',
    deviceId: 'WS-Q-005',
    description: '余氯 0.05 mg/L，低于限值 0.1 mg/L',
    value: 0.05,
    threshold: { min: 0.1 },
    unit: 'mg/L',
    suggestion: '建议增加水厂出厂余氯值至 0.5~0.8 mg/L，必要时对该区域管网进行冲洗。',
    createdAt: pastIso(4),
  },
];

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: mockAlarms,
  selectedAlarmId: null,

  getAlarmsByLevel: (level) => {
    const { alarms } = get();
    if (!level) return alarms;
    return alarms.filter((a) => a.level === level);
  },

  acknowledgeAlarm: (id) => {
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'acknowledged',
              acknowledgedAt: nowIso(),
              acknowledgedBy: '当前用户',
            }
          : a
      ),
    }));
  },

  resolveAlarm: (id, note) => {
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'resolved',
              resolvedAt: nowIso(),
              resolvedBy: '当前用户',
              resolvedNote: note,
            }
          : a
      ),
    }));
  },
}));
