export type UserRole = 'inspector' | 'plant_leader' | 'dispatcher' | 'admin';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  area: string;
  plantId: string;
  phone: string;
}

export interface WaterSource {
  id: string;
  name: string;
  location: string;
  plantId: string;
  area: string;
  status: 'normal' | 'warning' | 'alarm';
  capacity: number;
}

export interface WaterQualityData {
  id: string;
  sourceId: string;
  timestamp: number;
  turbidity: number;
  ph: number;
  residualChlorine: number;
  cod: number;
  ammoniaNitrogen: number;
}

export type AlarmLevel = 1 | 2 | 3;

export interface Alarm {
  id: string;
  sourceId?: string;
  plantId?: string;
  stageId?: string;
  level: AlarmLevel;
  type: 'water_quality' | 'pressure' | 'drainage' | 'sewage' | 'workorder';
  parameter: string;
  value: number;
  threshold: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'resolved';
  suggestion: string;
  pushedTo: string[];
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolvedAt?: number;
}

export type PumpStatus = 'running' | 'stopped' | 'fault' | 'maintenance';

export interface Pump {
  id: string;
  name: string;
  plantId: string;
  sourceId: string;
  status: PumpStatus;
  mode: 'auto' | 'manual';
  ratedPower: number;
  power: number;
  flow: number;
  head: number;
  efficiency: number;
  runHours: number;
  startCount: number;
  lastStartAt?: number;
  totalEnergy: number;
  currentEnergy: number;
}

export interface PressurePoint {
  id: string;
  name: string;
  plantId: string;
  area: string;
  lng: number;
  lat: number;
  pressure: number;
  status: 'normal' | 'low' | 'high';
  timestamp: number;
}

export interface EnergyRecord {
  id: string;
  pumpId: string;
  timestamp: number;
  energy: number;
  power: number;
  flow: number;
  duration: number;
}

export interface Customer {
  id: string;
  name: string;
  meterNo: string;
  address: string;
  area: string;
  plantId: string;
  phone: string;
  meterReading: number;
  lastReading: number;
  lastReadingDate: number;
  status: 'normal' | 'arrears' | 'suspended';
}

export interface PriceTier {
  tier: 1 | 2 | 3;
  min: number;
  max: number;
  price: number;
}

export interface Bill {
  id: string;
  customerId: string;
  period: string;
  startReading: number;
  endReading: number;
  consumption: number;
  tierAmounts: { tier: number; consumption: number; amount: number }[];
  baseAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  issueDate: number;
  dueDate: number;
  paidAt?: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'suspend';
  reminders: { date: number; type: 'sms' | 'email' | 'notice'; sent: boolean }[];
  valveOrder?: ValveOrder;
}

export interface ValveOrder {
  id: string;
  billId: string;
  customerId: string;
  createdAt: number;
  status: 'pending' | 'assigned' | 'executed' | 'cancelled';
  assignedTo?: string;
  executedAt?: number;
  executorNote?: string;
}

export interface DrainagePoint {
  id: string;
  name: string;
  area: string;
  level: number;
  warningLevel: number;
  alarmLevel: number;
  status: 'normal' | 'warning' | 'alarm';
  pumpIds: string[];
  timestamp: number;
}

export interface DrainagePump {
  id: string;
  name: string;
  pointId: string;
  status: 'running' | 'stopped' | 'fault';
  flow: number;
  power: number;
  startTime?: number;
  totalRunTime: number;
}

export interface SewageStage {
  id: string;
  name: string;
  plantId: string;
  order: number;
  status: 'normal' | 'warning' | 'alarm' | 'locked';
  cod: number;
  ammoniaNitrogen: number;
  codRemoval: number;
  ammoniaRemoval: number;
  threshold: { cod: number; ammoniaNitrogen: number; codRemoval: number; ammoniaRemoval: number };
  deviceIds: string[];
  timestamp: number;
}

export interface SewageDevice {
  id: string;
  name: string;
  stageId: string;
  status: 'running' | 'stopped' | 'locked' | 'fault';
  lockedBy?: string;
  lockedAt?: number;
  lockReason?: string;
}

export interface InspectionTask {
  id: string;
  title: string;
  area: string;
  inspectorId: string;
  route: string[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
  dueDate: number;
  completedAt?: number;
  checkPoints: {
    id: string;
    name: string;
    lng: number;
    lat: number;
    checked: boolean;
    checkedAt?: number;
    photoUrl?: string;
  }[];
}

export type WorkOrderPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface WorkOrder {
  id: string;
  title: string;
  type: 'leak' | 'device' | 'sewage' | 'other';
  priority: WorkOrderPriority;
  description: string;
  area: string;
  plantId?: string;
  stageId?: string;
  reporterId: string;
  assigneeId?: string;
  photos: { before?: string[]; after?: string[] };
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'upgraded';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  upgradedTo?: string;
  upgradeReason?: string;
  escalatedAt?: number;
}

export interface RiskWarning {
  id: string;
  type: 'flood' | 'water_shortage' | 'contamination';
  level: 1 | 2 | 3;
  area: string;
  description: string;
  timestamp: number;
  status: 'active' | 'resolved';
  pushedTo: string[];
}

export interface SystemConfig {
  waterQualityThresholds: {
    turbidity: { warning: number; alarm: number };
    ph: { min: number; max: number; warningMin: number; warningMax: number };
    residualChlorine: { warning: number; alarm: number };
    cod: { warning: number; alarm: number };
    ammoniaNitrogen: { warning: number; alarm: number };
  };
  priceTiers: PriceTier[];
  upgradeRules: {
    workOrderHours: number;
    sewageHours: number;
  };
  reminderRules: {
    overdueDays: number;
    suspendMonths: number;
    lateFeeRate: number;
  };
  pressureRange: { min: number; max: number };
}

export interface DashboardStats {
  totalProduction: number;
  avgPressure: number;
  waterQualityRate: number;
  inspectionRate: number;
  activeAlarms: number;
  totalEnergy: number;
}
