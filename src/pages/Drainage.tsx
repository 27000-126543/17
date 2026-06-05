import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  Waves,
  AlertTriangle,
  Gauge,
  Zap,
  Power,
  Play,
  Pause,
  RefreshCw,
  Clock,
  FileText,
  MapPin,
  AlertOctagon,
  TrendingUp,
  BarChart3,
  Send,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatCard from '@/components/common/StatCard';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type TabKey = 'level' | 'control' | 'risk';

interface DrainagePointData extends Record<string, unknown> {
  id: string;
  name: string;
  level: number;
  warningLevel: number;
  alarmLevel: number;
  maxLevel: number;
  pumpStatus: 'idle' | 'running';
}

interface PumpData extends Record<string, unknown> {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'fault';
  mode: 'auto' | 'manual';
  power: number;
  currentEnergy: number;
  flow: number;
}

interface OperationRecord extends Record<string, unknown> {
  id: string;
  startTime: string;
  stopTime: string;
  displacement: number;
  energy: number;
}

interface FloodRiskPoint extends Record<string, unknown> {
  id: string;
  name: string;
  location: string;
  level: 'low' | 'medium' | 'high' | 'extreme';
  updateTime: string;
}

interface PushRecord extends Record<string, unknown> {
  id: string;
  time: string;
  location: string;
  level: 'low' | 'medium' | 'high' | 'extreme';
  department: string;
  status: 'pending' | 'processing' | 'resolved';
}

interface HistoryEvent extends Record<string, unknown> {
  year: string;
  count: number;
  maxLevel: number;
  affected: number;
}

const mockDrainagePoints: DrainagePointData[] = [
  { id: 'dp001', name: '外滩排水泵站', level: 2.1, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp002', name: '苏州河排水站', level: 1.8, warningLevel: 3.2, alarmLevel: 4.2, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp003', name: '杨浦泵站', level: 3.6, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'running' },
  { id: 'dp004', name: '虹口港排水站', level: 2.5, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp005', name: '龙华排水泵站', level: 1.5, warningLevel: 3.0, alarmLevel: 4.0, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp006', name: '漕河泾泵站', level: 4.7, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'running' },
  { id: 'dp007', name: '桃浦排水站', level: 2.9, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp008', name: '浦东机场泵站', level: 2.0, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp009', name: '金桥排水站', level: 1.6, warningLevel: 3.2, alarmLevel: 4.2, maxLevel: 5.0, pumpStatus: 'idle' },
  { id: 'dp010', name: '虹桥泵站', level: 2.3, warningLevel: 3.5, alarmLevel: 4.5, maxLevel: 5.0, pumpStatus: 'idle' },
];

const mockPumps: PumpData[] = [
  { id: 'p001', name: '1#排涝泵', status: 'running', mode: 'auto', power: 280, currentEnergy: 245.6, flow: 850 },
  { id: 'p002', name: '2#排涝泵', status: 'running', mode: 'auto', power: 280, currentEnergy: 238.2, flow: 820 },
  { id: 'p003', name: '3#排涝泵', status: 'idle', mode: 'manual', power: 320, currentEnergy: 0, flow: 0 },
  { id: 'p004', name: '4#排涝泵', status: 'fault', mode: 'manual', power: 320, currentEnergy: 0, flow: 0 },
  { id: 'p005', name: '5#排涝泵', status: 'idle', mode: 'auto', power: 250, currentEnergy: 0, flow: 0 },
  { id: 'p006', name: '6#排涝泵', status: 'running', mode: 'auto', power: 250, currentEnergy: 215.8, flow: 780 },
];

const mockOperationRecords: OperationRecord[] = [
  { id: 'op001', startTime: '2026-06-05 06:30:00', stopTime: '2026-06-05 09:15:00', displacement: 12580, energy: 892.5 },
  { id: 'op002', startTime: '2026-06-04 22:10:00', stopTime: '2026-06-05 01:40:00', displacement: 9850, energy: 705.2 },
  { id: 'op003', startTime: '2026-06-04 14:20:00', stopTime: '2026-06-04 17:05:00', displacement: 8420, energy: 598.6 },
  { id: 'op004', startTime: '2026-06-04 05:45:00', stopTime: '2026-06-04 08:30:00', displacement: 7680, energy: 542.8 },
  { id: 'op005', startTime: '2026-06-03 18:00:00', stopTime: '2026-06-03 21:30:00', displacement: 11200, energy: 795.4 },
];

const mockFloodRiskPoints: FloodRiskPoint[] = [
  { id: 'fp001', name: '天目路立交', location: '静安区天目路', level: 'extreme', updateTime: '2026-06-05 10:30' },
  { id: 'fp002', name: '广中路地道', location: '虹口区广中路', level: 'high', updateTime: '2026-06-05 10:28' },
  { id: 'fp003', name: '虹桥枢纽', location: '闵行区虹桥', level: 'medium', updateTime: '2026-06-05 10:25' },
  { id: 'fp004', name: '陆家嘴环路', location: '浦东新区陆家嘴', level: 'low', updateTime: '2026-06-05 10:20' },
  { id: 'fp005', name: '莘庄立交', location: '闵行区莘庄', level: 'high', updateTime: '2026-06-05 10:15' },
  { id: 'fp006', name: '中山公园', location: '长宁区长宁路', level: 'medium', updateTime: '2026-06-05 10:10' },
];

const mockPushRecords: PushRecord[] = [
  { id: 'pr001', time: '2026-06-05 10:32:00', location: '天目路立交', level: 'extreme', department: '市政应急中心', status: 'processing' },
  { id: 'pr002', time: '2026-06-05 10:28:00', location: '广中路地道', level: 'high', department: '虹口区市政', status: 'processing' },
  { id: 'pr003', time: '2026-06-05 09:15:00', location: '莘庄立交', level: 'high', department: '闵行区市政', status: 'pending' },
  { id: 'pr004', time: '2026-06-05 08:40:00', location: '虹桥枢纽', level: 'medium', department: '市交通委', status: 'resolved' },
  { id: 'pr005', time: '2026-06-04 22:10:00', location: '五角场下沉广场', level: 'extreme', department: '杨浦区市政', status: 'resolved' },
];

const mockHistoryEvents: HistoryEvent[] = [
  { year: '2026', count: 3, maxLevel: 0.8, affected: 12 },
  { year: '2025', count: 5, maxLevel: 1.2, affected: 28 },
  { year: '2024', count: 4, maxLevel: 0.6, affected: 15 },
  { year: '2023', count: 7, maxLevel: 1.5, affected: 45 },
  { year: '2022', count: 6, maxLevel: 1.0, affected: 32 },
];

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

function LevelCard({ point }: { point: DrainagePointData }) {
  const isAlarm = point.level >= point.alarmLevel;
  const isWarning = !isAlarm && point.level >= point.warningLevel;

  const percent = (point.level / point.maxLevel) * 100;
  const warningPercent = (point.warningLevel / point.maxLevel) * 100;
  const alarmPercent = (point.alarmLevel / point.maxLevel) * 100;

  return (
    <div
      className={cn(
        'relative glass-card corner-deco rounded-xl p-4 transition-all duration-300',
        isAlarm && 'border-2 border-water-red blink-animation',
        isWarning && !isAlarm && 'border-2 border-water-yellow/70',
      )}
      style={isAlarm ? { boxShadow: '0 0 30px rgba(255, 77, 79, 0.3)' } : undefined}
    >
      {isAlarm && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-water-red/20 text-water-red animate-pulse">
          <AlertOctagon size={12} />
          报警
        </div>
      )}
      {isWarning && !isAlarm && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-water-yellow/20 text-water-yellow">
          <AlertTriangle size={12} />
          预警
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isAlarm ? 'bg-water-red/20' : isWarning ? 'bg-water-yellow/20' : 'bg-water-cyan/15',
        )}>
          <Waves size={16} className={isAlarm ? 'text-water-red' : isWarning ? 'text-water-yellow' : 'text-water-cyan'} />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-200">{point.name}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-slate-400">当前液位</span>
          <span className={cn(
            'data-number text-2xl font-bold glow-text',
            isAlarm ? 'text-water-red' : isWarning ? 'text-water-yellow' : 'text-water-cyan',
          )}>
            {point.level.toFixed(1)}
            <span className="text-xs font-normal text-slate-500 ml-1">m</span>
          </span>
        </div>
        <div className="relative h-3 bg-water-dark/80 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full transition-all duration-500',
              isAlarm
                ? 'bg-gradient-to-r from-water-red to-water-orange'
                : isWarning
                  ? 'bg-gradient-to-r from-water-yellow to-water-orange'
                  : 'bg-gradient-to-r from-water-cyan to-water-teal',
            )}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-water-yellow/80"
            style={{ left: `${warningPercent}%` }}
            title="预警线"
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-water-red"
            style={{ left: `${alarmPercent}%` }}
            title="报警线"
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-500">
          <span>0</span>
          <span className="text-water-yellow">预警{point.warningLevel}m</span>
          <span className="text-water-red">报警{point.alarmLevel}m</span>
          <span>{point.maxLevel}m</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-water-cyan/10">
        <span className="text-xs text-slate-500">泵状态</span>
        <StatusBadge
          status={point.pumpStatus === 'running' ? 'processing' : 'offline'}
          text={point.pumpStatus === 'running' ? '运行中' : '空闲'}
          pulse={point.pumpStatus === 'running'}
        />
      </div>
    </div>
  );
}

function PumpCard({ pump, mode, onToggleMode, onTogglePump }: {
  pump: PumpData;
  mode: 'auto' | 'manual';
  onToggleMode: () => void;
  onTogglePump: () => void;
}) {
  const isRunning = pump.status === 'running';
  const isFault = pump.status === 'fault';

  return (
    <div className={cn(
      'glass-card corner-deco rounded-xl p-4',
      isFault && 'opacity-60',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center',
            isRunning ? 'bg-water-green/20' : isFault ? 'bg-water-red/20' : 'bg-water-dark/60',
          )}>
            <Zap size={18} className={cn(
              isRunning ? 'text-water-green' : isFault ? 'text-water-red' : 'text-slate-500',
            )} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">{pump.name}</div>
            <StatusBadge
              status={isRunning ? 'success' : isFault ? 'alarm' : 'offline'}
              text={isRunning ? '运行中' : isFault ? '故障' : '空闲'}
              pulse={isRunning}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMode}
            className={cn(
              'px-2 py-1 rounded text-xs transition-all',
              mode === 'auto'
                ? 'bg-water-cyan/20 text-water-cyan border border-water-cyan/30'
                : 'bg-water-yellow/20 text-water-yellow border border-water-yellow/30',
            )}
          >
            {mode === 'auto' ? '自动' : '手动'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">功率</div>
          <div className="data-number text-sm font-bold text-slate-200">{pump.power}<span className="text-[10px] text-slate-500 ml-0.5">kW</span></div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">流量</div>
          <div className="data-number text-sm font-bold text-water-teal">{pump.flow}<span className="text-[10px] text-slate-500 ml-0.5">m³/h</span></div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">能耗</div>
          <div className="data-number text-sm font-bold text-water-cyan">{pump.currentEnergy}<span className="text-[10px] text-slate-500 ml-0.5">kWh</span></div>
        </div>
      </div>

      <button
        onClick={onTogglePump}
        disabled={isFault || mode !== 'manual'}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
          isFault || mode !== 'manual'
            ? 'bg-water-dark/40 text-slate-600 cursor-not-allowed'
            : isRunning
              ? 'bg-water-red/20 text-water-red border border-water-red/30 hover:bg-water-red/30'
              : 'bg-water-green/20 text-water-green border border-water-green/30 hover:bg-water-green/30',
        )}
      >
        {isRunning ? <Pause size={12} /> : <Play size={12} />}
        {isFault ? '设备故障' : mode !== 'manual' ? '自动模式' : isRunning ? '停止泵' : '启动泵'}
      </button>
    </div>
  );
}

export default function Drainage() {
  const [activeTab, setActiveTab] = useState<TabKey>('level');
  const [pumpModes, setPumpModes] = useState<Record<string, 'auto' | 'manual'>>(() => {
    const init: Record<string, 'auto' | 'manual'> = {};
    mockPumps.forEach((p) => { init[p.id] = p.mode; });
    return init;
  });
  const [pumpStatuses, setPumpStatuses] = useState<Record<string, PumpData['status']>>(() => {
    const init: Record<string, PumpData['status']> = {};
    mockPumps.forEach((p) => { init[p.id] = p.status; });
    return init;
  });

  const [systemMode, setSystemMode] = useState<'auto' | 'manual'>('auto');

  const togglePumpMode = (pumpId: string) => {
    setPumpModes((prev) => ({ ...prev, [pumpId]: prev[pumpId] === 'auto' ? 'manual' : 'auto' }));
  };

  const togglePump = (pumpId: string) => {
    setPumpStatuses((prev) => {
      const cur = prev[pumpId];
      if (cur === 'fault') return prev;
      return { ...prev, [pumpId]: cur === 'running' ? 'idle' : 'running' };
    });
  };

  const pumpsWithStatus = useMemo(() => {
    return mockPumps.map((p) => ({ ...p, mode: pumpModes[p.id], status: pumpStatuses[p.id] }));
  }, [pumpModes, pumpStatuses]);

  const runningCount = pumpsWithStatus.filter((p) => p.status === 'running').length;
  const idleCount = pumpsWithStatus.filter((p) => p.status === 'idle').length;
  const faultCount = pumpsWithStatus.filter((p) => p.status === 'fault').length;
  const totalFlow = pumpsWithStatus.filter((p) => p.status === 'running').reduce((s, p) => s + p.flow, 0);

  const levelChartOption: EChartsOption = {
    grid: { top: 40, right: 20, bottom: 30, left: 40 },
    legend: {
      data: ['漕河泾泵站', '杨浦泵站', '外滩泵站'],
      top: 0,
      right: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 6,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 30, 54, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`),
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
      axisLabel: { color: '#64748b', fontSize: 10, interval: 3 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '液位(m)',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
    },
    series: [
      {
        name: '漕河泾泵站',
        type: 'line',
        smooth: true,
        data: Array.from({ length: 24 }, (_, i) => {
          const base = 2.5 + Math.sin((i - 6) / 8) * 1.2;
          if (i >= 18 && i <= 22) return base + 1.8;
          return +(base + (Math.random() - 0.5) * 0.3).toFixed(1);
        }),
        symbol: 'none',
        lineStyle: { width: 2, color: '#FF4D4F' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,77,79,0.2)' }, { offset: 1, color: 'rgba(255,77,79,0)' }] } },
      },
      {
        name: '杨浦泵站',
        type: 'line',
        smooth: true,
        data: Array.from({ length: 24 }, (_, i) => {
          const base = 2.0 + Math.sin((i - 5) / 7) * 1.0;
          if (i >= 19 && i <= 21) return base + 1.3;
          return +(base + (Math.random() - 0.5) * 0.3).toFixed(1);
        }),
        symbol: 'none',
        lineStyle: { width: 2, color: '#FFB020' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,176,32,0.2)' }, { offset: 1, color: 'rgba(255,176,32,0)' }] } },
      },
      {
        name: '外滩泵站',
        type: 'line',
        smooth: true,
        data: Array.from({ length: 24 }, (_, i) => +(1.8 + Math.sin((i - 4) / 9) * 0.6 + (Math.random() - 0.5) * 0.2).toFixed(1)),
        symbol: 'none',
        lineStyle: { width: 2, color: '#00D4FF' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,212,255,0.2)' }, { offset: 1, color: 'rgba(0,212,255,0)' }] } },
      },
    ],
  };

  const historyChartOption: EChartsOption = {
    grid: { top: 30, right: 20, bottom: 30, left: 40 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 30, 54, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: mockHistoryEvents.map((e) => e.year),
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '次数',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
      },
      {
        type: 'value',
        name: '最大水深(m)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '内涝次数',
        type: 'bar',
        data: mockHistoryEvents.map((e) => e.count),
        barWidth: 20,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00D4FF' }, { offset: 1, color: 'rgba(0,212,255,0.3)' }] },
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '最大水深',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: mockHistoryEvents.map((e) => e.maxLevel),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2, color: '#FF7A45' },
        itemStyle: { color: '#FF7A45', borderColor: '#0a1628', borderWidth: 2 },
      },
    ],
  };

  const operationColumns: DataTableColumn<OperationRecord>[] = [
    { key: 'startTime', title: '启动时间', width: 160, render: (v) => <span className="data-number text-slate-300 text-xs">{v as string}</span> },
    { key: 'stopTime', title: '停止时间', width: 160, render: (v) => <span className="data-number text-slate-300 text-xs">{v as string}</span> },
    { key: 'displacement', title: '排水量(m³)', align: 'right', render: (v) => <span className="data-number font-bold text-water-teal">{(v as number).toLocaleString()}</span> },
    { key: 'energy', title: '能耗(kWh)', align: 'right', render: (v) => <span className="data-number text-water-cyan">{(v as number).toFixed(1)}</span> },
  ];

  const pushColumns: DataTableColumn<PushRecord>[] = [
    { key: 'time', title: '时间', width: 160, render: (v) => <span className="data-number text-slate-400 text-xs">{v as string}</span> },
    { key: 'location', title: '位置', render: (v) => (
      <span className="inline-flex items-center gap-1 text-slate-200 text-sm">
        <MapPin size={12} className="text-water-cyan" />
        {v as string}
      </span>
    )},
    { key: 'level', title: '等级', align: 'center', render: (v) => {
      const map: Record<string, { status: 'normal' | 'warning' | 'alarm'; label: string }> = {
        low: { status: 'normal', label: '低风险' },
        medium: { status: 'warning', label: '中风险' },
        high: { status: 'warning', label: '高风险' },
        extreme: { status: 'alarm', label: '极高风险' },
      };
      const { status, label } = map[v as string];
      return <StatusBadge status={status} text={label} pulse={v === 'extreme'} />;
    }},
    { key: 'department', title: '接收部门', render: (v) => <span className="text-slate-300 text-sm">{v as string}</span> },
    { key: 'status', title: '处置状态', align: 'center', render: (v) => {
      const map: Record<string, 'pending' | 'processing' | 'completed'> = {
        pending: 'pending',
        processing: 'processing',
        resolved: 'completed',
      };
      const labelMap: Record<string, string> = {
        pending: '待处置',
        processing: '处置中',
        resolved: '已处置',
      };
      return <StatusBadge status={map[v as string]} text={labelMap[v as string]} pulse={v === 'processing'} />;
    }},
  ];

  const riskLevelStats = useMemo(() => {
    return {
      extreme: mockFloodRiskPoints.filter((p) => p.level === 'extreme').length,
      high: mockFloodRiskPoints.filter((p) => p.level === 'high').length,
      medium: mockFloodRiskPoints.filter((p) => p.level === 'medium').length,
      low: mockFloodRiskPoints.filter((p) => p.level === 'low').length,
    };
  }, []);

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">排水管网管理</h1>
          <p className="text-sm text-slate-500 mt-1">液位监控、排涝控制与内涝风险预警中心</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost flex items-center gap-2">
            <RefreshCw size={16} />
            刷新数据
          </button>
          <button className="btn-ghost flex items-center gap-2">
            <FileText size={16} />
            导出报表
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TabButton active={activeTab === 'level'} icon={<Gauge size={16} />} label="液位监控" onClick={() => setActiveTab('level')} />
        <TabButton active={activeTab === 'control'} icon={<Power size={16} />} label="排涝控制" onClick={() => setActiveTab('control')} />
        <TabButton active={activeTab === 'risk'} icon={<AlertTriangle size={16} />} label="风险警示" onClick={() => setActiveTab('risk')} />
      </div>

      {activeTab === 'level' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {mockDrainagePoints.map((p) => (
              <LevelCard key={p.id} point={p} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'control' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="运行中水泵" value={runningCount} unit="台" color="green" icon={<Zap size={20} className="text-water-deep" />} />
            <StatCard title="空闲水泵" value={idleCount} unit="台" color="cyan" icon={<Power size={20} className="text-water-deep" />} />
            <StatCard title="故障水泵" value={faultCount} unit="台" color="yellow" icon={<AlertTriangle size={20} className="text-water-deep" />} />
            <StatCard title="当前总流量" value={totalFlow} unit="m³/h" color="teal" icon={<TrendingUp size={20} className="text-water-deep" />} />
          </div>

          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center">
                  <Activity size={16} className="text-water-deep" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">排涝泵状态面板</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">系统模式：</span>
                <button
                  onClick={() => setSystemMode(systemMode === 'auto' ? 'manual' : 'auto')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                    systemMode === 'auto'
                      ? 'bg-water-cyan/20 text-water-cyan border border-water-cyan/30'
                      : 'bg-water-yellow/20 text-water-yellow border border-water-yellow/30',
                  )}
                >
                  {systemMode === 'auto' ? <RefreshCw size={12} /> : <Gauge size={12} />}
                  {systemMode === 'auto' ? '自动控制' : '手动控制'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {pumpsWithStatus.map((p) => (
                <PumpCard
                  key={p.id}
                  pump={p}
                  mode={pumpModes[p.id]}
                  onToggleMode={() => togglePumpMode(p.id)}
                  onTogglePump={() => togglePump(p.id)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 glass-card corner-deco rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-water-cyan/15 flex items-center justify-center">
                  <BarChart3 size={14} className="text-water-cyan" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">运行记录</h3>
              </div>
              <DataTable columns={operationColumns} data={mockOperationRecords} rowKey="id" />
            </div>
            <div className="col-span-3 glass-card corner-deco rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-water-teal/15 flex items-center justify-center">
                    <TrendingUp size={14} className="text-water-teal" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">液位趋势（近24小时）</h3>
                </div>
              </div>
              <ReactECharts option={levelChartOption} style={{ height: 280, width: '100%' }} opts={{ renderer: 'svg' }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="极高风险点" value={riskLevelStats.extreme} unit="处" color="orange" icon={<AlertOctagon size={20} className="text-water-deep" />} />
            <StatCard title="高风险点" value={riskLevelStats.high} unit="处" color="yellow" icon={<AlertTriangle size={20} className="text-water-deep" />} />
            <StatCard title="中风险点" value={riskLevelStats.medium} unit="处" color="teal" icon={<Waves size={20} className="text-water-deep" />} />
            <StatCard title="低风险点" value={riskLevelStats.low} unit="处" color="cyan" icon={<Activity size={20} className="text-water-deep" />} />
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 glass-card corner-deco rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-water-red/15 flex items-center justify-center">
                    <AlertTriangle size={14} className="text-water-red" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">内涝风险等级列表</h3>
                </div>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {mockFloodRiskPoints.map((p) => {
                  const levelMap: Record<string, { color: string; bg: string; label: string }> = {
                    low: { color: 'text-water-cyan', bg: 'bg-water-cyan/10 border-water-cyan/20', label: '低风险' },
                    medium: { color: 'text-water-teal', bg: 'bg-water-teal/10 border-water-teal/20', label: '中风险' },
                    high: { color: 'text-water-yellow', bg: 'bg-water-yellow/10 border-water-yellow/20', label: '高风险' },
                    extreme: { color: 'text-water-red', bg: 'bg-water-red/10 border-water-red/30', label: '极高风险' },
                  };
                  const { color, bg, label } = levelMap[p.level];
                  return (
                    <div key={p.id} className={cn('flex items-center justify-between p-3 rounded-lg border', bg)}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', color.replace('text-', 'bg-'))} />
                        <div>
                          <div className={cn('text-sm font-medium', color)}>{p.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={10} />
                            {p.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', color, bg)}>{label}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          {p.updateTime}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-3 glass-card corner-deco rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-water-cyan/15 flex items-center justify-center">
                    <Send size={14} className="text-water-cyan" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">推送市政记录</h3>
                </div>
              </div>
              <DataTable columns={pushColumns} data={mockPushRecords} rowKey="id" />
            </div>
          </div>

          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-water-purple/15 flex items-center justify-center">
                  <Calendar size={14} className="text-water-purple" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">历史内涝事件统计（近5年）</h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-water-cyan/60" />
                  <span className="text-slate-400">内涝次数</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-water-orange" />
                  <span className="text-slate-400">最大水深</span>
                </div>
              </div>
            </div>
            <ReactECharts option={historyChartOption} style={{ height: 220, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>
        </div>
      )}
    </div>
  );
}
