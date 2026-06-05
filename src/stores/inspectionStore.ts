import { create } from 'zustand';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
export type WorkOrderCategory = 'leak' | 'equipment' | 'water_quality' | 'meter' | 'other';

export interface InspectionPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  checkedIn: boolean;
  checkInTime?: string;
  note?: string;
  photoUrl?: string;
}

export interface InspectionTask {
  id: string;
  title: string;
  area: string;
  inspectorId: string;
  inspectorName: string;
  date: string;
  status: TaskStatus;
  priority: TaskPriority;
  points: InspectionPoint[];
  totalPoints: number;
  checkedPoints: number;
  deadline: string;
  description?: string;
  abnormalCount: number;
}

export interface WorkOrder {
  id: string;
  taskId?: string;
  title: string;
  category: WorkOrderCategory;
  description: string;
  location: string;
  reporterId: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  status: WorkOrderStatus;
  priority: TaskPriority;
  photos: string[];
  deadline: string;
  resolvedAt?: string;
  resolvedNote?: string;
  escalated: boolean;
  escalatedAt?: string;
  escalatedTo?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}

interface CreateWorkOrderData {
  taskId?: string;
  title: string;
  category: WorkOrderCategory;
  description: string;
  location: string;
  priority: TaskPriority;
  photos?: string[];
}

interface InspectionState {
  tasks: InspectionTask[];
  workOrders: WorkOrder[];
  selectedTaskId: string | null;
  selectTask: (id: string) => void;
  checkIn: (taskId: string, pointId: string) => void;
  createWorkOrder: (data: CreateWorkOrderData) => WorkOrder;
  upgradeWorkOrder: (orderId: string) => void;
}

const makePoints = (count: number, checkedCount: number): InspectionPoint[] => {
  const names = ['阀门井A1', '消火栓B2', '流量计C3', '压力表D4', '排气阀E5', '检查井F6', '减压阀G7', '水表井H8'];
  const points: InspectionPoint[] = [];
  for (let i = 0; i < count; i++) {
    const checked = i < checkedCount;
    points.push({
      id: `pt-${Date.now()}-${i}`,
      name: names[i % names.length],
      lat: 39.9 + Math.random() * 0.1,
      lng: 116.3 + Math.random() * 0.2,
      checkedIn: checked,
      checkInTime: checked ? '09:' + String(15 + i * 8).padStart(2, '0') : undefined,
    });
  }
  return points;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const futureStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const mockTasks: InspectionTask[] = [
  {
    id: 'task-001',
    title: '东城区日常巡检',
    area: '东城区',
    inspectorId: 'inspector',
    inspectorName: '张巡线',
    date: todayStr(),
    status: 'in_progress',
    priority: 'normal',
    points: makePoints(6, 3),
    totalPoints: 6,
    checkedPoints: 3,
    deadline: futureStr(0),
    abnormalCount: 0,
  },
  {
    id: 'task-002',
    title: '西城区重点路段巡检',
    area: '西城区',
    inspectorId: 'inspector',
    inspectorName: '张巡线',
    date: todayStr(),
    status: 'pending',
    priority: 'high',
    points: makePoints(8, 0),
    totalPoints: 8,
    checkedPoints: 0,
    deadline: futureStr(1),
    description: '包含2处历史漏损复勘',
    abnormalCount: 0,
  },
  {
    id: 'task-003',
    title: '北区工业园巡检',
    area: '北城区',
    inspectorId: 'inspector-2',
    inspectorName: '李巡线',
    date: todayStr(),
    status: 'completed',
    priority: 'low',
    points: makePoints(5, 5),
    totalPoints: 5,
    checkedPoints: 5,
    deadline: futureStr(-1),
    abnormalCount: 1,
  },
  {
    id: 'task-004',
    title: '南城区老旧管网专项巡检',
    area: '南城区',
    inspectorId: 'inspector',
    inspectorName: '张巡线',
    date: futureStr(-2),
    status: 'overdue',
    priority: 'urgent',
    points: makePoints(10, 4),
    totalPoints: 10,
    checkedPoints: 4,
    deadline: futureStr(-1),
    description: '重点检查老旧管网漏损情况',
    abnormalCount: 2,
  },
];

const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo-001',
    taskId: 'task-003',
    title: '阀门井A1漏水',
    category: 'leak',
    description: '东城区幸福里小区3栋前阀门井发现轻微渗漏，疑似密封圈老化',
    location: '东城区幸福里小区',
    reporterId: 'inspector',
    assigneeId: 'repair-1',
    assigneeName: '王维修',
    createdAt: futureStr(-1),
    status: 'in_progress',
    priority: 'high',
    photos: [],
    deadline: futureStr(2),
    escalated: false,
  },
  {
    id: 'wo-002',
    taskId: 'task-004',
    title: '水表读数异常',
    category: 'meter',
    description: '南区老旧小区8号楼总表与分表总和误差超过8%，疑似内漏',
    location: '南城区老旧小区8号楼',
    reporterId: 'inspector',
    assigneeId: 'repair-2',
    assigneeName: '赵师傅',
    createdAt: futureStr(-3),
    status: 'assigned',
    priority: 'normal',
    photos: [],
    deadline: futureStr(1),
    escalated: false,
  },
  {
    id: 'wo-003',
    title: '水质发黄用户投诉',
    category: 'water_quality',
    description: '用户反馈自来水发黄，持续3天，疑似管网冲洗未解决',
    location: '西城区阳光花园',
    reporterId: 'inspector',
    createdAt: futureStr(-2),
    status: 'escalated',
    priority: 'urgent',
    photos: [],
    deadline: futureStr(-1),
    escalated: true,
    escalatedAt: futureStr(-1),
    escalatedTo: 'plant_leader',
  },
  {
    id: 'wo-004',
    title: '加压泵异响',
    category: 'equipment',
    description: '东城区加压站2号泵运行时有异常噪音，振动偏大',
    location: '东城区加压站',
    reporterId: 'inspector',
    assigneeId: 'repair-1',
    assigneeName: '王维修',
    createdAt: futureStr(-5),
    status: 'resolved',
    priority: 'normal',
    photos: [],
    deadline: futureStr(-3),
    resolvedAt: futureStr(-2),
    resolvedNote: '已更换轴承，运行正常',
    escalated: false,
  },
];

export const useInspectionStore = create<InspectionState>((set, get) => ({
  tasks: mockTasks,
  workOrders: mockWorkOrders,
  selectedTaskId: null,

  selectTask: (id) => set({ selectedTaskId: id }),

  checkIn: (taskId, pointId) => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const newPoints = t.points.map((p) =>
          p.id === pointId
            ? { ...p, checkedIn: true, checkInTime: now }
            : p
        );
        const checkedCount = newPoints.filter((p) => p.checkedIn).length;
        const allDone = checkedCount === t.totalPoints;
        return {
          ...t,
          points: newPoints,
          checkedPoints: checkedCount,
          status: allDone ? 'completed' : 'in_progress',
        };
      }),
    }));
  },

  createWorkOrder: (data) => {
    const newOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      ...data,
      photos: data.photos || [],
      reporterId: 'inspector',
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'pending',
      deadline: futureStr(3),
      escalated: false,
    };
    set((state) => ({
      workOrders: [newOrder, ...state.workOrders],
    }));
    return newOrder;
  },

  upgradeWorkOrder: (orderId) => {
    set((state) => ({
      workOrders: state.workOrders.map((wo) =>
        wo.id === orderId
          ? {
              ...wo,
              status: 'escalated',
              escalated: true,
              escalatedAt: new Date().toISOString().slice(0, 10),
              escalatedTo: 'plant_leader',
            }
          : wo
      ),
    }));
  },
}));
