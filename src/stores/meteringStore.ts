import { create } from 'zustand';

export type CustomerType = 'residential' | 'commercial' | 'industrial' | 'government';
export type BillStatus = 'unpaid' | 'paid' | 'overdue' | 'reminded' | 'shutoff';

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  meterNo: string;
  address: string;
  phone: string;
  currentReading: number;
  lastReading: number;
  lastReadDate: string;
  tier: number;
  valveStatus: 'open' | 'closed';
}

export interface BillTier {
  tier: number;
  range: string;
  unitPrice: number;
  usage: number;
  amount: number;
}

export interface Bill {
  id: string;
  customerId: string;
  period: string;
  issueDate: string;
  dueDate: string;
  usage: number;
  tiers: BillTier[];
  baseAmount: number;
  sewageFee: number;
  resourceFee: number;
  totalAmount: number;
  paidAmount: number;
  status: BillStatus;
  lateFee: number;
  remindCount: number;
  lastRemindDate?: string;
}

const TIER_PRICES = [
  { tier: 1, max: 180, unitPrice: 3.5 },
  { tier: 2, max: 260, unitPrice: 5.25 },
  { tier: 3, max: Infinity, unitPrice: 8.75 },
];

const calculateTiers = (usage: number): { tiers: BillTier[]; baseAmount: number } => {
  const tiers: BillTier[] = [];
  let remaining = usage;
  let baseAmount = 0;
  let prevMax = 0;

  for (const t of TIER_PRICES) {
    const tierUsage = Math.max(0, Math.min(remaining, t.max - prevMax));
    if (tierUsage > 0) {
      const amount = +(tierUsage * t.unitPrice).toFixed(2);
      tiers.push({
        tier: t.tier,
        range: t.max === Infinity ? `${prevMax}以上` : `${prevMax + 1}-${t.max}`,
        unitPrice: t.unitPrice,
        usage: tierUsage,
        amount,
      });
      baseAmount += amount;
    }
    remaining -= tierUsage;
    prevMax = t.max;
    if (remaining <= 0) break;
  }

  return { tiers, baseAmount: +baseAmount.toFixed(2) };
};

const mockCustomers: Customer[] = [
  { id: 'c001', name: '张伟家', type: 'residential', meterNo: 'M-202401001', address: '东城区幸福里小区3栋2单元501', phone: '138****1234', currentReading: 2845, lastReading: 2756, lastReadDate: '2024-05-28', tier: 1, valveStatus: 'open' },
  { id: 'c002', name: '李娜家', type: 'residential', meterNo: 'M-202401002', address: '西城区阳光花园1栋1单元101', phone: '139****5678', currentReading: 1523, lastReading: 1478, lastReadDate: '2024-05-28', tier: 1, valveStatus: 'open' },
  { id: 'c003', name: '王强超市', type: 'commercial', meterNo: 'C-202308015', address: '朝阳区人民路88号商业广场1F', phone: '136****9012', currentReading: 15680, lastReading: 15120, lastReadDate: '2024-05-28', tier: 2, valveStatus: 'open' },
  { id: 'c004', name: '宏达机械制造厂', type: 'industrial', meterNo: 'I-202205008', address: '工业园区兴业路168号', phone: '137****3456', currentReading: 86540, lastReading: 83210, lastReadDate: '2024-05-28', tier: 3, valveStatus: 'open' },
  { id: 'c005', name: '东城区政府', type: 'government', meterNo: 'G-202103001', address: '东城区行政中心大楼', phone: '010-****8888', currentReading: 42360, lastReading: 41890, lastReadDate: '2024-05-28', tier: 2, valveStatus: 'open' },
  { id: 'c006', name: '陈美丽家', type: 'residential', meterNo: 'M-202401023', address: '海淀区学府路12号院5栋3单元702', phone: '135****7890', currentReading: 986, lastReading: 934, lastReadDate: '2024-05-28', tier: 1, valveStatus: 'closed' },
  { id: 'c007', name: '新东方餐饮', type: 'commercial', meterNo: 'C-202311022', address: '丰台区美食街18号', phone: '133****2345', currentReading: 8920, lastReading: 8610, lastReadDate: '2024-05-28', tier: 2, valveStatus: 'open' },
];

const buildBill = (customer: Customer, periodOffset: number): Bill => {
  const usage = customer.type === 'industrial'
    ? 2800 + Math.round(Math.random() * 800)
    : customer.type === 'commercial'
      ? 400 + Math.round(Math.random() * 200)
      : 30 + Math.round(Math.random() * 60);

  const { tiers, baseAmount } = calculateTiers(usage);
  const sewageFee = +(usage * 1.5).toFixed(2);
  const resourceFee = +(usage * 0.3).toFixed(2);
  const totalAmount = +(baseAmount + sewageFee + resourceFee).toFixed(2);

  const now = new Date();
  now.setMonth(now.getMonth() - periodOffset);
  const issueDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 25);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const today = new Date();
  let status: BillStatus = 'unpaid';
  let lateFee = 0;
  let remindCount = 0;
  let lastRemindDate: string | undefined;
  let paidAmount = 0;

  if (periodOffset >= 2) {
    const r = Math.random();
    if (r < 0.65) {
      status = 'paid';
      paidAmount = totalAmount;
    } else if (r < 0.85) {
      status = 'overdue';
      const days = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      lateFee = +(totalAmount * 0.0005 * Math.max(0, days)).toFixed(2);
      remindCount = 2;
      lastRemindDate = new Date(today.getTime() - 86400000 * 3).toISOString().slice(0, 10);
    } else {
      status = 'shutoff';
      const days = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      lateFee = +(totalAmount * 0.0005 * Math.max(0, days)).toFixed(2);
      remindCount = 4;
    }
  } else if (periodOffset === 1) {
    const r = Math.random();
    if (r < 0.4) {
      status = 'paid';
      paidAmount = totalAmount;
    } else if (r < 0.6 && today > dueDate) {
      status = 'reminded';
      remindCount = 1;
      lastRemindDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
    }
  }

  return {
    id: `b-${customer.id}-${period}`,
    customerId: customer.id,
    period,
    issueDate: issueDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    usage,
    tiers,
    baseAmount,
    sewageFee,
    resourceFee,
    totalAmount,
    paidAmount,
    status,
    lateFee,
    remindCount,
    lastRemindDate,
  };
};

const mockBills: Bill[] = mockCustomers.flatMap((c) => [
  buildBill(c, 0),
  buildBill(c, 1),
  buildBill(c, 2),
  buildBill(c, 3),
]);

interface MeteringState {
  customers: Customer[];
  bills: Bill[];
  selectedCustomerId: string | null;
  selectCustomer: (id: string) => void;
  getBillsByStatus: (status?: BillStatus) => Bill[];
  calculateLateFee: (billId: string) => number;
}

export const useMeteringStore = create<MeteringState>((set, get) => ({
  customers: mockCustomers,
  bills: mockBills,
  selectedCustomerId: null,

  selectCustomer: (id) => {
    set({ selectedCustomerId: id });
  },

  getBillsByStatus: (status) => {
    const { bills, selectedCustomerId } = get();
    let result = bills;
    if (selectedCustomerId) {
      result = result.filter((b) => b.customerId === selectedCustomerId);
    }
    if (status) {
      result = result.filter((b) => b.status === status);
    }
    return result.sort((a, b) => b.period.localeCompare(a.period));
  },

  calculateLateFee: (billId) => {
    const bill = get().bills.find((b) => b.id === billId);
    if (!bill) return 0;
    if (bill.status === 'paid') return 0;
    const today = new Date();
    const due = new Date(bill.dueDate);
    const days = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
    const dailyRate = 0.0005;
    return +((bill.totalAmount - bill.paidAmount) * dailyRate * days).toFixed(2);
  },
}));
