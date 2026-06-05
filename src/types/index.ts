export type UserRole = 'inspector' | 'plant_leader' | 'dispatcher' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  area: string;
  plantId: string;
}

export interface WaterSource {
  id: string;
  name: string;
  location: string;
  plantId: string;
  status: 'normal' | 'warning' | 'alarm';
}

export interface WaterQualityData {
  sourceId: string;
  timestamp: number;
  turbidity: number;
  ph: number;
  residualChlorine: number;
  cod: number;
  ammoniaNitrogen: number;
}

export interface Alarm {
  id: string;
  sourceId: string;
  level: 1 | 2 | 3;
  type: string;
  parameter: string;
  value: number;
  threshold: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'resolved';
  suggestion: string;
  pushedTo: string[];
}

export interface Pump {
  id: string;
  name: string;
  plantId: string;
  status: 'running' | 'stopped' | 'fault';
  mode: 'auto' | 'manual';
  power: number;
  currentEnergy: number;
  totalEnergy: number;
  startCount: number;
}

export interface PressurePoint {
  id: string;
  name: string;
  lng: number;
  lat: number;
  pressure: number;
  status: 'normal' | 'low' | 'high';
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  meterNo: string;
  phone: string;
  area: string;
}

export interface Bill {
  id: string;
  customerId: string;
  period: string;
  consumption: number;
  amount: number;
  lateFee: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'shutoff';
  dueDate: string;
  reminders: number;
}

export interface DrainagePoint {
  id: string;
  name: string;
  lng: number;
  lat: number;
  level: number;
  warningLevel: number;
  alarmLevel: number;
  pumpStatus: 'idle' | 'running';
}

export interface SewageStage {
  id: string;
  name: string;
  plantId: string;
  order: number;
}

export interface SewageData {
  stageId: string;
  timestamp: number;
  cod: number;
  codRemoval: number;
  ammoniaNitrogen: number;
  ammoniaRemoval: number;
  flow: number;
}

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkOrderStatus = 'pending' | 'assigned' | 'processing' | 'upgraded' | 'closed';

export interface CheckPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  checked: boolean;
  checkTime: number | null;
  photos: string[];
}

export interface InspectionTask {
  id: string;
  inspectorId: string;
  area: string;
  date: string;
  status: string;
  checkPoints: CheckPoint[];
}

export interface WorkOrder {
  id: string;
  type: 'leak' | 'equipment' | 'other';
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  description: string;
  location: string;
  reporterId: string;
  assigneeId: string;
  photos: string[];
  repairPhotos: string[];
  createdAt: number;
  closedAt: number | null;
  upgradeCount: number;
}

export interface DashboardStats {
  todayProduction: number;
  avgPressure: number;
  waterQualityRate: number;
  inspectionRate: number;
  alarmsToday: number;
  energyCost: number;
  usersTotal: number;
}
