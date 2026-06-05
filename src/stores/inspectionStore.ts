import { create } from 'zustand';
import { inspectionApi } from '@/lib/api';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkOrderStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'upgraded' | 'closed';
export type WorkOrderType = 'leak' | 'device' | 'sewage' | 'meter' | 'other';

export interface CheckPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  checked: boolean;
  checkedAt?: number;
  photoUrl?: string;
}

export interface InspectionTask {
  id: string;
  title: string;
  area: string;
  inspectorId: string;
  route: string[];
  status: TaskStatus;
  createdAt: number;
  dueDate: number;
  completedAt?: number;
  checkPoints: CheckPoint[];
}

export interface WorkOrder {
  id: string;
  title: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  description: string;
  area: string;
  plantId: string;
  reporterId: string;
  assigneeId?: string;
  photos: { before?: string[]; after?: string[] };
  status: WorkOrderStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  stageId?: string;
  upgradedTo?: string;
  upgradeReason?: string;
  escalatedAt?: number;
}

interface InspectionState {
  tasks: InspectionTask[];
  workOrders: WorkOrder[];
  selectedTaskId: string | null;
  selectedWorkOrderId: string | null;
  loading: boolean;
  fetchTasks: () => Promise<void>;
  fetchWorkOrders: (status?: string, priority?: string) => Promise<void>;
  selectTask: (id: string) => void;
  selectWorkOrder: (id: string) => void;
  checkIn: (taskId: string, cpId: string, photoUrl?: string) => Promise<void>;
  createWorkOrder: (data: Partial<WorkOrder>) => Promise<WorkOrder | null>;
  completeWorkOrder: (id: string, beforePhotos?: string[], afterPhotos?: string[]) => Promise<void>;
  upgradeWorkOrder: (id: string, reason?: string, targetRole?: string) => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  tasks: [],
  workOrders: [],
  selectedTaskId: null,
  selectedWorkOrderId: null,
  loading: false,

  fetchTasks: async () => {
    const res = await inspectionApi.getTasks();
    if (res.success && res.data) {
      set({ tasks: res.data as InspectionTask[] });
    }
  },

  fetchWorkOrders: async (status, priority) => {
    const res = await inspectionApi.getWorkOrders(status, priority);
    if (res.success && res.data) {
      set({ workOrders: (res.data as WorkOrder[]).sort((a, b) => b.createdAt - a.createdAt) });
    }
  },

  selectTask: (id) => set({ selectedTaskId: id }),
  selectWorkOrder: (id) => set({ selectedWorkOrderId: id }),

  checkIn: async (taskId, cpId, photoUrl) => {
    const res = await inspectionApi.checkIn(taskId, cpId, photoUrl);
    if (res.success) {
      await get().fetchTasks();
    }
  },

  createWorkOrder: async (data) => {
    const res = await inspectionApi.createWorkOrder(data);
    if (res.success && res.data) {
      await get().fetchWorkOrders();
      return res.data as WorkOrder;
    }
    return null;
  },

  completeWorkOrder: async (id, beforePhotos, afterPhotos) => {
    const res = await inspectionApi.completeWorkOrder(id, beforePhotos, afterPhotos);
    if (res.success) {
      await get().fetchWorkOrders();
    }
  },

  upgradeWorkOrder: async (id, reason, targetRole) => {
    const res = await inspectionApi.upgradeWorkOrder(id, reason, targetRole);
    if (res.success) {
      await get().fetchWorkOrders();
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([get().fetchTasks(), get().fetchWorkOrders()]);
    set({ loading: false });
  },
}));
