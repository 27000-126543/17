import { create } from 'zustand';
import { meteringApi } from '@/lib/api';

export type BillStatus = 'unpaid' | 'paid' | 'overdue' | 'suspend';

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

export interface BillTier {
  tier: 1 | 2 | 3;
  consumption: number;
  amount: number;
}

export interface Bill {
  id: string;
  customerId: string;
  period: string;
  startReading: number;
  endReading: number;
  consumption: number;
  tierAmounts: BillTier[];
  baseAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  issueDate: number;
  dueDate: number;
  paidAt?: number;
  status: BillStatus;
  reminders: { date: number; type: string; sent: boolean }[];
}

interface MeteringState {
  customers: Customer[];
  bills: Bill[];
  selectedCustomerId: string | null;
  loading: boolean;
  fetchCustomers: (search?: string) => Promise<void>;
  fetchBills: (status?: string, customerId?: string) => Promise<void>;
  selectCustomer: (id: string) => void;
  readMeter: (customerId: string, reading?: number) => Promise<void>;
  payBill: (billId: string, amount?: number) => Promise<void>;
  remindBill: (billId: string, type?: string) => Promise<any>;
  createValveOrder: (billId: string) => Promise<any>;
  fetchAll: () => Promise<void>;
}

export const useMeteringStore = create<MeteringState>((set, get) => ({
  customers: [],
  bills: [],
  selectedCustomerId: null,
  loading: false,

  fetchCustomers: async (search) => {
    const res = await meteringApi.getCustomers(search);
    if (res.success && res.data) {
      set({ customers: res.data as Customer[] });
    }
  },

  fetchBills: async (status, customerId) => {
    const res = await meteringApi.getBills(status, customerId || get().selectedCustomerId || undefined);
    if (res.success && res.data) {
      set({ bills: (res.data as Bill[]).sort((a, b) => b.period.localeCompare(a.period)) });
    }
  },

  selectCustomer: (id) => {
    set({ selectedCustomerId: id });
    get().fetchBills(undefined, id);
  },

  readMeter: async (customerId, reading) => {
    await meteringApi.readMeter(customerId, reading);
    await get().fetchCustomers();
  },

  payBill: async (billId, amount) => {
    const res = await meteringApi.payBill(billId, amount);
    if (res.success) {
      await get().fetchBills();
      await get().fetchCustomers();
    }
  },

  remindBill: async (billId, type = 'sms') => {
    const res = await meteringApi.remindBill(billId, type);
    if (res.success) {
      await get().fetchBills();
    }
    return res;
  },

  createValveOrder: async (billId) => {
    const res = await meteringApi.createValveOrder(billId);
    if (res.success) {
      await get().fetchBills();
      await get().fetchCustomers();
    }
    return res;
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([get().fetchCustomers(), get().fetchBills()]);
    set({ loading: false });
  },
}));
