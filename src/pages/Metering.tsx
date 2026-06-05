import { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronUp,
  Users,
  Receipt,
  Bell,
  AlertTriangle,
  Clock,
  MessageSquare,
  Power,
  Zap,
  FileText,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatCard from '@/components/common/StatCard';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { useMeteringStore, type Customer, type Bill } from '@/stores/meteringStore';

type TabKey = 'users' | 'bills' | 'reminders';

interface MeterCustomer extends Record<string, unknown> {
  id: string;
  name: string;
  address: string;
  meterNo: string;
  area: string;
  currentReading: number;
  lastReading: number;
  status: 'normal' | 'warning' | 'alarm' | 'offline';
}

interface MeterBill extends Record<string, unknown> {
  id: string;
  customerName: string;
  period: string;
  consumption: number;
  tierDetail: string;
  amount: number;
  lateFee: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'shutoff';
  dueDate: string;
}

interface SmsRecord extends Record<string, unknown> {
  id: string;
  sendTime: string;
  customerName: string;
  content: string;
  status: 'success' | 'pending' | 'failed';
}

interface ValveCommand extends Record<string, unknown> {
  id: string;
  issueTime: string;
  customerName: string;
  fieldWorker: string;
  status: 'pending' | 'processing' | 'completed';
}

const AREAS = ['全部', '浦东新区', '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区'];
const PERIODS = ['全部', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01', '2025-12'];
const BILL_STATUS = ['全部', '未缴费', '已缴费', '已逾期', '已关阀'];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function mapCustomerStatus(status: Customer['status']): MeterCustomer['status'] {
  switch (status) {
    case 'normal': return 'normal';
    case 'arrears': return 'warning';
    case 'suspended': return 'alarm';
    default: return 'normal';
  }
}

function mapBillStatus(status: Bill['status']): MeterBill['status'] {
  switch (status) {
    case 'unpaid': return 'unpaid';
    case 'paid': return 'paid';
    case 'overdue': return 'overdue';
    case 'suspend': return 'shutoff';
    default: return 'unpaid';
  }
}

function generateTierDetail(tierAmounts: Bill['tierAmounts']): string {
  const tierNames = ['一阶', '二阶', '三阶'];
  return tierAmounts.map((t) => `${tierNames[t.tier - 1]}${t.consumption}吨`).join('/');
}

function generateHistoryData(lastReading: number, lastReadingDate: number): { dates: string[]; readings: number[] } {
  const dates: string[] = [];
  const readings: number[] = [];
  let reading = lastReading - 600;
  const baseDate = new Date(lastReadingDate);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 28);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    reading += Math.floor(40 + Math.random() * 60);
    readings.push(reading);
  }
  readings[readings.length - 1] = lastReading;
  return { dates, readings };
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all duration-300',
        active
          ? 'text-water-deep bg-gradient-to-r from-water-cyan to-water-teal shadow-lg shadow-water-cyan/30'
          : 'text-slate-400 hover:text-water-cyan hover:bg-water-cyan/5',
      )}
    >
      {icon}
      {label}
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-water-cyan to-water-teal" />
      )}
    </button>
  );
}

function TierPriceCard() {
  return (
    <div className="glass-card corner-deco rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center">
          <Receipt size={16} className="text-water-deep" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">阶梯水价说明</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="relative p-4 rounded-lg bg-water-green/10 border border-water-green/20">
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-water-green/20 text-water-green">第一阶梯</div>
          <div className="mt-4">
            <div className="text-xs text-slate-400 mb-1">年用水量</div>
            <div className="text-lg font-bold text-water-green data-number">0-180 吨</div>
          </div>
          <div className="mt-3 pt-3 border-t border-water-green/10">
            <div className="text-xs text-slate-400 mb-1">单价</div>
            <div className="text-2xl font-bold text-water-green data-number glow-text">¥3.50</div>
            <div className="text-xs text-slate-500 mt-1">元/吨</div>
          </div>
        </div>
        <div className="relative p-4 rounded-lg bg-water-yellow/10 border border-water-yellow/20">
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-water-yellow/20 text-water-yellow">第二阶梯</div>
          <div className="mt-4">
            <div className="text-xs text-slate-400 mb-1">年用水量</div>
            <div className="text-lg font-bold text-water-yellow data-number">181-260 吨</div>
          </div>
          <div className="mt-3 pt-3 border-t border-water-yellow/10">
            <div className="text-xs text-slate-400 mb-1">单价</div>
            <div className="text-2xl font-bold text-water-yellow data-number glow-text">¥5.25</div>
            <div className="text-xs text-slate-500 mt-1">元/吨</div>
          </div>
        </div>
        <div className="relative p-4 rounded-lg bg-water-red/10 border border-water-red/20">
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-water-red/20 text-water-red">第三阶梯</div>
          <div className="mt-4">
            <div className="text-xs text-slate-400 mb-1">年用水量</div>
            <div className="text-lg font-bold text-water-red data-number">260吨以上</div>
          </div>
          <div className="mt-3 pt-3 border-t border-water-red/10">
            <div className="text-xs text-slate-400 mb-1">单价</div>
            <div className="text-2xl font-bold text-water-red data-number glow-text">¥8.75</div>
            <div className="text-xs text-slate-500 mt-1">元/吨</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Metering() {
  const { customers, bills, fetchAll, payBill, remindBill, createValveOrder } = useMeteringStore();
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedArea, setSelectedArea] = useState('全部');
  const [selectedPeriod, setSelectedPeriod] = useState('全部');
  const [selectedBillStatus, setSelectedBillStatus] = useState('全部');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const adaptedCustomers: MeterCustomer[] = useMemo(() => {
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      meterNo: c.meterNo,
      area: c.area,
      currentReading: c.meterReading,
      lastReading: c.lastReading,
      status: mapCustomerStatus(c.status),
    }));
  }, [customers]);

  const adaptedBills: MeterBill[] = useMemo(() => {
    return bills.map((b) => {
      const customer = customerMap.get(b.customerId);
      return {
        id: b.id,
        customerName: customer?.name || b.customerId,
        period: b.period,
        consumption: b.consumption,
        tierDetail: generateTierDetail(b.tierAmounts),
        amount: b.totalAmount,
        lateFee: b.lateFee,
        status: mapBillStatus(b.status),
        dueDate: formatDate(b.dueDate),
      };
    });
  }, [bills, customerMap]);

  const smsRecords: SmsRecord[] = useMemo(() => {
    const records: SmsRecord[] = [];
    bills.forEach((b) => {
      const customer = customerMap.get(b.customerId);
      b.reminders.forEach((r, idx) => {
        records.push({
          id: `sms-${b.id}-${idx}`,
          sendTime: formatDateTime(r.date),
          customerName: customer?.name || b.customerId,
          content: r.type === 'urgent'
            ? `【水务催缴】${customer?.name || '您'}${b.period}月水费${b.totalAmount.toFixed(2)}元已逾期超30天，将采取关阀措施，请立即缴费。`
            : `【水务提醒】${customer?.name || '您'}${b.period}月水费${b.totalAmount.toFixed(2)}元，缴费期限至${formatDate(b.dueDate)}。`,
          status: r.sent ? 'success' : (idx === b.reminders.length - 1 ? 'pending' : 'failed'),
        });
      });
    });
    return records.sort((a, b) => b.sendTime.localeCompare(a.sendTime));
  }, [bills, customerMap]);

  const valveCommands: ValveCommand[] = useMemo(() => {
    const commands: ValveCommand[] = [];
    const fieldWorkers = ['外勤-张师傅', '外勤-李师傅', '外勤-王师傅', '外勤-赵师傅'];
    let idx = 0;
    bills
      .filter((b) => b.status === 'suspend' || b.status === 'overdue')
      .forEach((b) => {
        const customer = customerMap.get(b.customerId);
        commands.push({
          id: `valve-${b.id}`,
          issueTime: formatDateTime(b.dueDate + 86400000 * 3),
          customerName: customer?.name || b.customerId,
          fieldWorker: fieldWorkers[idx % fieldWorkers.length],
          status: b.status === 'suspend' ? 'completed' : (idx % 2 === 0 ? 'processing' : 'pending'),
        });
        idx++;
      });
    return commands.sort((a, b) => b.issueTime.localeCompare(a.issueTime));
  }, [bills, customerMap]);

  const filteredCustomers = useMemo(() => {
    return adaptedCustomers.filter((c) => {
      const matchKeyword =
        !searchKeyword ||
        c.name.includes(searchKeyword) ||
        c.meterNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.address.includes(searchKeyword);
      const matchArea = selectedArea === '全部' || c.area === selectedArea;
      return matchKeyword && matchArea;
    });
  }, [adaptedCustomers, searchKeyword, selectedArea]);

  const filteredBills = useMemo(() => {
    return adaptedBills.filter((b) => {
      const matchPeriod = selectedPeriod === '全部' || b.period === selectedPeriod;
      const statusMap: Record<string, MeterBill['status'] | null> = {
        '全部': null,
        '未缴费': 'unpaid',
        '已缴费': 'paid',
        '已逾期': 'overdue',
        '已关阀': 'shutoff',
      };
      const targetStatus = statusMap[selectedBillStatus];
      const matchStatus = !targetStatus || b.status === targetStatus;
      return matchPeriod && matchStatus;
    });
  }, [adaptedBills, selectedPeriod, selectedBillStatus]);

  const overdueStats = useMemo(() => {
    return {
      within1Month: adaptedBills.filter((b) => b.status === 'overdue').length,
      within3Months: adaptedBills.filter((b) => b.status === 'overdue').length,
      over3Months: adaptedBills.filter((b) => b.status === 'shutoff').length,
    };
  }, [adaptedBills]);

  const customerColumns: DataTableColumn<MeterCustomer & { isExpanded: boolean; usage: number }>[] = [
    { key: 'expand', title: '', width: 40, align: 'center', render: (_, row) => (
      <button onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }} className="text-water-cyan hover:text-water-teal transition-colors">
        {row.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    )},
    { key: 'name', title: '姓名', render: (v) => <span className="font-medium text-slate-200">{v as string}</span> },
    { key: 'address', title: '地址', width: 240, render: (v) => <span className="text-slate-400 text-xs">{v as string}</span> },
    { key: 'meterNo', title: '表号', render: (v) => <span className="data-number text-water-cyan text-xs">{v as string}</span> },
    { key: 'area', title: '片区', render: (v) => (
      <span className="inline-flex items-center gap-1 text-xs text-slate-300">
        <MapPin size={12} className="text-water-cyan" />
        {v as string}
      </span>
    )},
    { key: 'currentReading', title: '当前读数', align: 'right', render: (v) => <span className="data-number text-slate-200">{v as number}</span> },
    { key: 'lastReading', title: '上次读数', align: 'right', render: (v) => <span className="data-number text-slate-400">{v as number}</span> },
    { key: 'usage', title: '用水量(吨)', align: 'right', render: (v) => <span className="data-number font-bold text-water-teal">{v as number}</span> },
    { key: 'status', title: '状态', align: 'center', render: (v) => <StatusBadge status={v as MeterCustomer['status']} /> },
  ];

  const customerTableData = filteredCustomers.map((c) => ({
    ...c,
    isExpanded: expandedRows.has(c.id),
    usage: c.currentReading - c.lastReading,
  }));

  const billColumns: DataTableColumn<MeterBill>[] = [
    { key: 'customerName', title: '用户', render: (v) => <span className="font-medium text-slate-200">{v as string}</span> },
    { key: 'period', title: '账期', render: (v) => <span className="data-number text-water-cyan">{v as string}</span> },
    { key: 'consumption', title: '用水量(吨)', align: 'right', render: (v) => <span className="data-number text-slate-200">{v as number}</span> },
    { key: 'tierDetail', title: '阶梯明细', width: 160, render: (v) => <span className="text-xs text-slate-400">{v as string}</span> },
    { key: 'amount', title: '金额(元)', align: 'right', render: (v) => <span className="data-number font-bold text-water-teal">¥{(v as number).toFixed(2)}</span> },
    { key: 'lateFee', title: '滞纳金(元)', align: 'right', render: (v) => (
      <span className={cn('data-number', (v as number) > 0 ? 'text-water-red' : 'text-slate-500')}>
        {(v as number) > 0 ? `¥${(v as number).toFixed(2)}` : '-'}
      </span>
    )},
    { key: 'status', title: '状态', align: 'center', render: (v) => {
      const statusMap: Record<string, 'normal' | 'success' | 'alarm' | 'warning'> = {
        unpaid: 'normal',
        paid: 'success',
        overdue: 'alarm',
        shutoff: 'warning',
      };
      const labelMap: Record<string, string> = {
        unpaid: '未缴费',
        paid: '已缴费',
        overdue: '已逾期',
        shutoff: '已关阀',
      };
      return <StatusBadge status={statusMap[v as string]} text={labelMap[v as string]} />;
    }},
    { key: 'dueDate', title: '缴费期限', render: (v) => <span className="data-number text-slate-400 text-xs">{v as string}</span> },
  ];

  const smsColumns: DataTableColumn<SmsRecord>[] = [
    { key: 'sendTime', title: '发送时间', width: 160, render: (v) => <span className="data-number text-slate-400 text-xs">{v as string}</span> },
    { key: 'customerName', title: '用户', render: (v) => <span className="font-medium text-slate-200">{v as string}</span> },
    { key: 'content', title: '内容', width: 400, render: (v) => <span className="text-xs text-slate-400">{v as string}</span> },
    { key: 'status', title: '状态', align: 'center', render: (v) => {
      const statusMap: Record<string, 'success' | 'pending' | 'offline'> = {
        success: 'success',
        pending: 'pending',
        failed: 'offline',
      };
      const labelMap: Record<string, string> = {
        success: '发送成功',
        pending: '发送中',
        failed: '发送失败',
      };
      return <StatusBadge status={statusMap[v as string]} text={labelMap[v as string]} />;
    }},
  ];

  const valveColumns: DataTableColumn<ValveCommand>[] = [
    { key: 'issueTime', title: '下达时间', width: 160, render: (v) => <span className="data-number text-slate-400 text-xs">{v as string}</span> },
    { key: 'customerName', title: '用户', render: (v) => <span className="font-medium text-slate-200">{v as string}</span> },
    { key: 'fieldWorker', title: '外勤人员', render: (v) => <span className="text-slate-300">{v as string}</span> },
    { key: 'status', title: '执行状态', align: 'center', render: (v) => {
      const statusMap: Record<string, 'pending' | 'processing' | 'completed'> = {
        pending: 'pending',
        processing: 'processing',
        completed: 'completed',
      };
      const labelMap: Record<string, string> = {
        pending: '待执行',
        processing: '执行中',
        completed: '已完成',
      };
      return <StatusBadge status={statusMap[v as string]} text={labelMap[v as string]} pulse={v === 'processing'} />;
    }},
  ];

  const getHistoryChartOption = (row: MeterCustomer & { isExpanded: boolean; usage: number }): EChartsOption => {
    const originalCustomer = customers.find((c) => c.id === row.id);
    const { dates, readings } = generateHistoryData(originalCustomer?.lastReading || row.lastReading, originalCustomer?.lastReadingDate || Date.now());
    return {
      grid: { top: 30, right: 20, bottom: 30, left: 40 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 30, 54, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '读数',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
      },
      series: [
        {
          name: '水表读数',
          type: 'line',
          smooth: true,
          data: readings,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#00D4FF' },
              { offset: 1, color: '#00E5CC' },
            ],
          }},
          itemStyle: { color: '#00D4FF', borderColor: '#0a1628', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 212, 255, 0.25)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0)' },
              ],
            },
          },
        },
      ],
    };
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">远程抄表管理</h1>
          <p className="text-sm text-slate-500 mt-1">用户抄表、账单管理与催缴控制中心</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost flex items-center gap-2">
            <FileText size={16} />
            导出报表
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TabButton active={activeTab === 'users'} icon={<Users size={16} />} label="用户列表" onClick={() => setActiveTab('users')} />
        <TabButton active={activeTab === 'bills'} icon={<Receipt size={16} />} label="账单管理" onClick={() => setActiveTab('bills')} />
        <TabButton active={activeTab === 'reminders'} icon={<Bell size={16} />} label="催缴管理" onClick={() => setActiveTab('reminders')} />
      </div>

      {activeTab === 'users' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="搜索姓名、表号、地址..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-water-dark/60 border border-water-cyan/15 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-water-cyan/40 focus:bg-water-dark/80 transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-lg bg-water-dark/60 border border-water-cyan/15 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/40 focus:bg-water-dark/80 transition-all cursor-pointer"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a} className="bg-water-dark">{a}</option>
                ))}
              </select>
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-water-cyan pointer-events-none" />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <DataTable
              columns={customerColumns}
              data={customerTableData}
              rowKey="id"
              onRowClick={(row) => toggleRow(row.id)}
              rowClassName={(row) => row.isExpanded ? 'bg-water-cyan/5' : ''}
            />
            {customerTableData.map((row) => row.isExpanded && (
              <div key={`expanded-${row.id}`} className="glass-card rounded-xl mt-2 p-4 ml-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{row.name}</span>
                    <span className="text-xs text-slate-500">历史读数趋势（近12个月）</span>
                  </div>
                  <span className="text-xs text-water-cyan">表号：{row.meterNo}</span>
                </div>
                <ReactECharts
                  option={getHistoryChartOption(row)}
                  style={{ height: 200, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <TierPriceCard />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-lg bg-water-dark/60 border border-water-cyan/15 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/40 focus:bg-water-dark/80 transition-all cursor-pointer"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p} className="bg-water-dark">{p}</option>
                ))}
              </select>
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-water-cyan pointer-events-none" />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedBillStatus}
                onChange={(e) => setSelectedBillStatus(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-lg bg-water-dark/60 border border-water-cyan/15 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/40 focus:bg-water-dark/80 transition-all cursor-pointer"
              >
                {BILL_STATUS.map((s) => (
                  <option key={s} value={s} className="bg-water-dark">{s}</option>
                ))}
              </select>
              <AlertTriangle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-water-cyan pointer-events-none" />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <DataTable columns={billColumns} data={filteredBills} rowKey="id" />
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="逾期1月内" value={overdueStats.within1Month} unit="户" color="yellow" icon={<Clock size={20} className="text-water-deep" />} />
            <StatCard title="逾期1-3月" value={overdueStats.within3Months} unit="户" color="orange" icon={<AlertTriangle size={20} className="text-water-deep" />} />
            <StatCard title="逾期超3月" value={overdueStats.over3Months} unit="户" color="orange" icon={<Zap size={20} className="text-water-deep" />} />
          </div>

          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-water-cyan/15 flex items-center justify-center">
                  <MessageSquare size={14} className="text-water-cyan" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">短信催缴记录</h3>
              </div>
              <button className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                <Send size={12} />
                发送催缴短信
              </button>
            </div>
            <DataTable columns={smsColumns} data={smsRecords} rowKey="id" />
          </div>

          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-water-red/15 flex items-center justify-center">
                  <Power size={14} className="text-water-red" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">关阀指令列表</h3>
              </div>
              <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-3 border-water-red/30 text-water-red hover:bg-water-red/10 hover:border-water-red/60">
                <Zap size={12} />
                生成关阀指令
              </button>
            </div>
            <DataTable columns={valveColumns} data={valveCommands} rowKey="id" />
          </div>
        </div>
      )}
    </div>
  );
}
