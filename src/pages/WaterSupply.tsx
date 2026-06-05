import { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Gauge,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Power,
  PowerOff,
  AlertTriangle,
  Activity,
  Clock,
  RefreshCw,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWaterStore, type Pump } from '@/stores/waterStore';
import { useDashboardStore, type PressurePoint } from '@/stores/dashboardStore';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable from '@/components/common/DataTable';
import StatCard from '@/components/common/StatCard';

type SupplyTab = 'pressure' | 'pump' | 'energy';
type PressureStatus = 'normal' | 'low' | 'high';

interface PressurePointView {
  id: string;
  name: string;
  area: string;
  pressure: number;
  status: PressureStatus;
  lastUpdate: string;
  lng: number;
  lat: number;
}

const mapPressureStatus = (point: PressurePoint): PressureStatus => {
  if (point.status === 'normal') return 'normal';
  if (point.pressure < 0.25) return 'low';
  return 'high';
};

export default function WaterSupply() {
  const [activeTab, setActiveTab] = useState<SupplyTab>('pressure');
  const [pumpModes, setPumpModes] = useState<Record<string, 'auto' | 'manual'>>({});

  const { pumps, togglePump, getPumpEnergyData, fetchAll: fetchWaterAll } = useWaterStore();

  useEffect(() => {
    const initial: Record<string, 'auto' | 'manual'> = {};
    pumps.forEach((p) => {
      initial[p.id] = p.mode;
    });
    setPumpModes(initial);
  }, [pumps]);
  const {
    pressurePoints: rawPressurePoints,
    monthlyEnergy,
    fetchPressure,
    fetchMonthlyEnergy,
  } = useDashboardStore();

  useEffect(() => {
    fetchWaterAll();
    fetchPressure();
    fetchMonthlyEnergy();
  }, [fetchWaterAll, fetchPressure, fetchMonthlyEnergy]);

  useEffect(() => {
    if (activeTab !== 'pressure') return;
    const timer = setInterval(() => {
      fetchPressure();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeTab, fetchPressure]);

  const pressurePoints = useMemo<PressurePointView[]>(
    () =>
      rawPressurePoints.map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area ?? '',
        lng: p.lng,
        lat: p.lat,
        pressure: p.pressure,
        status: mapPressureStatus(p),
        lastUpdate: p.lastUpdate,
      })),
    [rawPressurePoints],
  );

  const tabs: { key: SupplyTab; label: string; icon: React.ReactNode }[] = [
    { key: 'pressure', label: '压力监控', icon: <Gauge size={16} /> },
    { key: 'pump', label: '水泵控制', icon: <Zap size={16} /> },
    { key: 'energy', label: '能耗统计', icon: <BarChart3 size={16} /> },
  ];

  const currentMonthEnergy = monthlyEnergy[monthlyEnergy.length - 1]?.energy ?? 0;
  const lastMonthEnergy = monthlyEnergy[monthlyEnergy.length - 2]?.energy ?? currentMonthEnergy;
  const yoyEnergy = currentMonthEnergy;
  const lastYearSame = currentMonthEnergy * 0.95;

  const pressureStats = useMemo(() => {
    const normal = pressurePoints.filter((p) => p.status === 'normal').length;
    const low = pressurePoints.filter((p) => p.status === 'low').length;
    const high = pressurePoints.filter((p) => p.status === 'high').length;
    const avg = pressurePoints.reduce((s, p) => s + p.pressure, 0) / pressurePoints.length;
    return { normal, low, high, avg };
  }, [pressurePoints]);

  const heatmapOption: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 30, 54, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: unknown) => {
        const p = params as { data?: PressurePointView; value?: number[] };
        if (p.data) {
          const d = p.data as unknown as PressurePointView;
          return `${d.name}<br/>压力: <b>${d.pressure} MPa</b><br/>状态: ${d.status === 'normal' ? '正常' : d.status === 'low' ? '偏低' : '偏高'}`;
        }
        if (p.value) {
          return `压力: <b>${p.value[2]} MPa</b>`;
        }
        return '';
      },
    },
    grid: { left: 40, right: 40, top: 40, bottom: 50 },
    xAxis: {
      type: 'value',
      min: 121.25,
      max: 121.75,
      axisLine: { show: false },
      axisLabel: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 30.95,
      max: 31.45,
      axisLine: { show: false },
      axisLabel: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    visualMap: {
      min: 0.15,
      max: 0.45,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 5,
      textStyle: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 10 },
      inRange: {
        color: ['#00D4FF', '#00E5CC', '#00E676', '#FFB020', '#FF4D4F'],
      },
      itemWidth: 15,
      itemHeight: 120,
      text: ['高', '低'],
    },
    series: [
      {
        name: '压力热力',
        type: 'effectScatter',
        coordinateSystem: 'cartesian2d',
        data: pressurePoints.map((p) => ({
          value: [p.lng, p.lat, p.pressure],
          ...p,
        })) as unknown as Array<{ value: number[]; name: string; pressure: number }>,
        symbolSize: (val: number[]) => 20 + val[2] * 80,
        rippleEffect: {
          brushType: 'stroke',
          scale: 3,
          period: 4,
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 212, 255, 0.5)',
        },
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as { data?: { pressure?: number } };
            return p.data?.pressure ? `${p.data.pressure}` : '';
          },
          position: 'inside',
          color: '#fff',
          fontSize: 10,
          fontFamily: '"JetBrains Mono", monospace',
        },
      },
    ],
  };

  const pumpBarOption: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 30, 54, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const arr = params as Array<{ name: string; value: number; marker: string }>;
        if (!arr?.length) return '';
        return `${arr[0].name}<br/>${arr[0].marker} 能耗: <b>${arr[0].value} kWh</b>`;
      },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: pumps.map((p) => p.name),
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
      axisLabel: {
        color: 'rgba(148, 163, 184, 0.7)',
        fontSize: 11,
        rotate: 20,
        interval: 0,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
      nameTextStyle: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
    },
    series: [
      {
        type: 'bar',
        data: pumps.map((p, i) => ({
          value: Math.round(20000 + Math.random() * 25000 + i * 1500),
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#00D4FF' },
                { offset: 1, color: 'rgba(0, 212, 255, 0.2)' },
              ],
            },
          },
        })),
        barWidth: '50%',
      },
    ],
  };

  const energyTrendOption: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 30, 54, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
    },
    legend: {
      data: ['能耗', '电费'],
      textStyle: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
      top: 5,
      right: 20,
      icon: 'roundRect',
    },
    grid: { left: 55, right: 55, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: monthlyEnergy.map((m) => m.month),
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
      axisLabel: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '能耗(kWh)',
        nameTextStyle: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
      },
      {
        type: 'value',
        name: '电费(元)',
        nameTextStyle: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '能耗',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: monthlyEnergy.map((m) => m.energy),
        lineStyle: {
          width: 2.5,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#00D4FF' },
              { offset: 1, color: '#00E5CC' },
            ],
          },
        },
        itemStyle: { color: '#00D4FF', borderColor: '#00E5CC', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 212, 255, 0.25)' },
              { offset: 1, color: 'rgba(0, 212, 255, 0)' },
            ],
          },
        },
      },
      {
        name: '电费',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: monthlyEnergy.map((m) => m.cost),
        lineStyle: { width: 2, color: '#FFB020', type: 'dashed' },
        itemStyle: { color: '#FFB020', borderColor: '#FF7A45', borderWidth: 2 },
      },
    ],
  };

  const pumpStatusConfig = (status: Pump['status']) => {
    if (status === 'running') return { label: '运行中', color: 'bg-water-green/15 text-water-green border-water-green/30' };
    if (status === 'maintenance' || status === 'stopped') return { label: status === 'maintenance' ? '维护中' : '已停止', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    return { label: '故障', color: 'bg-water-red/15 text-water-red border-water-red/30' };
  };

  const renderMiniSparkline = (data: number[], color: string = '#00D4FF') => {
    if (!data || data.length < 2) return null;
    const width = 120;
    const height = 36;
    const padding = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
    const areaPoints = [
      `${padding},${height - padding}`,
      ...data.map((v, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      }),
      `${width - padding},${height - padding}`,
    ].join(' ');
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-9" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`spark-pump-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#spark-pump-${color.replace('#', '')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-water-cyan" />
            供水调度
          </h1>
          <p className="text-sm text-slate-400 mt-1">供水管网压力监控、水泵控制与能耗分析</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-slate-500 animate-spin-slow" />
          <span className="text-xs text-slate-500">
            实时更新 · {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-water-cyan/10 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 relative',
              activeTab === tab.key ? 'text-water-cyan' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-water-cyan to-water-teal rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-2">
        {activeTab === 'pressure' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="监测点总数"
                value={pressurePoints.length}
                unit="个"
                color="cyan"
                icon={<Gauge size={20} className="text-white" />}
              />
              <StatCard
                title="正常"
                value={pressureStats.normal}
                unit="个"
                color="green"
                icon={<MapPin size={20} className="text-white" />}
              />
              <StatCard
                title="压力偏低"
                value={pressureStats.low}
                unit="个"
                color="yellow"
                icon={<TrendingDown size={20} className="text-white" />}
              />
              <StatCard
                title="压力偏高"
                value={pressureStats.high}
                unit="个"
                color="orange"
                icon={<TrendingUp size={20} className="text-white" />}
              />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5">
                <div className="glass-card corner-deco rounded-xl p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-water-cyan flex items-center gap-2">
                      <Gauge size={14} /> 压力监测点列表
                    </h3>
                    <span className="text-xs text-slate-500">平均 {pressureStats.avg.toFixed(3)} MPa</span>
                  </div>
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {pressurePoints.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-water-cyan/5 hover:bg-water-cyan/10 transition-colors border border-water-cyan/5"
                      >
                        <span
                          className={cn(
                            'relative w-2.5 h-2.5 rounded-full flex-shrink-0',
                            p.status === 'normal'
                              ? 'bg-water-green'
                              : p.status === 'low'
                              ? 'bg-water-yellow'
                              : 'bg-water-red',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute inset-0 rounded-full animate-ping opacity-60',
                              p.status === 'normal'
                                ? 'bg-water-green'
                                : p.status === 'low'
                                ? 'bg-water-yellow'
                                : 'bg-water-red',
                            )}
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-200 truncate">{p.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={10} />
                            {p.area}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={cn(
                              'data-number text-sm font-bold',
                              p.status === 'normal'
                                ? 'text-water-green'
                                : p.status === 'low'
                                ? 'text-water-yellow'
                                : 'text-water-red',
                            )}
                          >
                            {p.pressure.toFixed(3)}
                            <span className="text-xs text-slate-500 ml-1 font-normal">MPa</span>
                          </div>
                          <div className="text-xs text-slate-500 data-number">{p.lastUpdate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-7">
                <div className="glass-card corner-deco rounded-xl p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-water-cyan flex items-center gap-2">
                      <Activity size={14} /> 管网压力热力图
                    </h3>
                    <StatusBadge status="normal" text="实时刷新" pulse />
                  </div>
                  <div className="h-[480px] bg-grid-pattern rounded-lg">
                    <ReactECharts
                      option={heatmapOption}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pump' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pumps.map((pump) => {
              const energyData = getPumpEnergyData(pump.id, 7).map((d) => d.energy);
              const isRunning = pump.status === 'running';
              const isFault = pump.status === 'fault' || pump.status === 'maintenance';
              const statusCfg = pumpStatusConfig(pump.status);
              return (
                <div
                  key={pump.id}
                  className={cn(
                    'relative glass-card corner-deco rounded-xl p-5 overflow-hidden transition-all duration-300',
                    isRunning && 'ring-1 ring-water-green/30',
                  )}
                >
                  {isRunning && (
                    <>
                      <div className="absolute inset-0 bg-water-green/5 pointer-events-none" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-water-green/10 blur-3xl animate-pulse-slow pointer-events-none" />
                    </>
                  )}
                  {isFault && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-water-yellow/10 blur-3xl pointer-events-none" />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'relative w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                            isRunning
                              ? 'from-water-green/30 to-water-teal/30 text-water-green'
                              : isFault
                              ? 'from-water-yellow/30 to-water-orange/30 text-water-yellow'
                              : 'from-slate-500/20 to-slate-600/20 text-slate-400',
                          )}
                        >
                          {isRunning ? (
                            <Power size={24} className="animate-pulse-slow" />
                          ) : isFault ? (
                            <AlertTriangle size={24} />
                          ) : (
                            <PowerOff size={24} />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{pump.name}</h3>
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border mt-1', statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-slate-500">运行模式</span>
                        <button
                          onClick={() => {
                            if (pump.status === 'maintenance') return;
                            setPumpModes((prev) => ({
                              ...prev,
                              [pump.id]: prev[pump.id] === 'auto' ? 'manual' : 'auto',
                            }));
                          }}
                          disabled={pump.status === 'maintenance'}
                          className={cn(
                            'relative w-12 h-6 rounded-full transition-colors duration-300',
                            pump.status === 'maintenance'
                              ? 'bg-slate-700 cursor-not-allowed opacity-50'
                              : (pumpModes[pump.id] ?? pump.mode) === 'auto'
                              ? 'bg-water-cyan/30 cursor-pointer'
                              : 'bg-water-orange/30 cursor-pointer',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 w-5 h-5 rounded-full shadow-lg transition-transform duration-300 flex items-center justify-center text-[8px] font-bold',
                              (pumpModes[pump.id] ?? pump.mode) === 'auto'
                                ? 'translate-x-6 bg-water-cyan text-water-deep'
                                : 'translate-x-0.5 bg-water-orange text-water-deep',
                            )}
                          >
                            {(pumpModes[pump.id] ?? pump.mode) === 'auto' ? 'A' : 'M'}
                          </span>
                        </button>
                        <span className={cn(
                          'text-[10px] font-medium',
                          (pumpModes[pump.id] ?? pump.mode) === 'auto' ? 'text-water-cyan' : 'text-water-orange',
                        )}>
                          {(pumpModes[pump.id] ?? pump.mode) === 'auto' ? '自动' : '手动'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-water-cyan/5 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-slate-500 mb-1">功率</div>
                        <div className="data-number text-sm font-bold text-water-cyan">
                          {pump.ratedPower ?? pump.power}
                          <span className="text-[10px] text-slate-500 ml-0.5">kW</span>
                        </div>
                      </div>
                      <div className="bg-water-cyan/5 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-slate-500 mb-1">能耗</div>
                        <div className="data-number text-sm font-bold text-water-teal">
                          {(pump.currentEnergy ?? pump.totalEnergy ?? 0).toFixed(1)}
                          <span className="text-[10px] text-slate-500 ml-0.5">kWh</span>
                        </div>
                      </div>
                      <div className="bg-water-cyan/5 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-slate-500 mb-1">效率</div>
                        <div className="data-number text-sm font-bold text-water-green">
                          {pump.efficiency}
                          <span className="text-[10px] text-slate-500 ml-0.5">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <RefreshCw size={11} /> 启动 {pump.startCount} 次
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> 运行 {pump.runHours} h
                      </span>
                    </div>

                    {energyData.length >= 2 && (
                      <div className="pt-3 border-t border-water-cyan/5">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>近7日能耗趋势</span>
                          <span className="data-number">{energyData[energyData.length - 1]?.toFixed(1)} kWh</span>
                        </div>
                        {renderMiniSparkline(energyData, isRunning ? '#00E676' : '#64748b')}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => togglePump(pump.id)}
                        disabled={pump.status === 'maintenance'}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200',
                          pump.status === 'maintenance'
                            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                            : isRunning
                            ? 'bg-water-red/15 text-water-red border border-water-red/30 hover:bg-water-red/25'
                            : 'bg-water-green/15 text-water-green border border-water-green/30 hover:bg-water-green/25',
                        )}
                      >
                        {isRunning ? (
                          <>
                            <PowerOff size={12} /> 停止运行
                          </>
                        ) : pump.status === 'maintenance' ? (
                          <>
                            <AlertTriangle size={12} /> 维护中
                          </>
                        ) : (
                          <>
                            <Power size={12} /> 启动水泵
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'energy' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="当月总能耗"
                value={currentMonthEnergy}
                unit="kWh"
                color="cyan"
                icon={<Zap size={20} className="text-white" />}
                sparklineData={monthlyEnergy.slice(0, 6).map((m) => m.energy)}
              />
              <StatCard
                title="当月电费"
                value={Math.round(currentMonthEnergy * 0.82)}
                unit="元"
                color="yellow"
                icon={<BarChart3 size={20} className="text-white" />}
              />
              <div className="relative group">
                <div className="absolute -inset-px rounded-xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 blur-sm bg-gradient-to-br from-water-green to-water-teal" />
                <div className="relative glass-card corner-deco p-5 rounded-xl overflow-hidden">
                  <div className="absolute -top-0 -right-0 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-water-green to-water-teal" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-water-green to-water-teal flex items-center justify-center shadow-lg shadow-water-green/20">
                          <ArrowDownRight size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">环比上月</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-water-green/15 text-water-green">
                        <TrendingDown size={12} />
                        {(((lastMonthEnergy - currentMonthEnergy) / lastMonthEnergy) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="data-number text-3xl font-bold tracking-tight text-water-green glow-text">
                        {(lastMonthEnergy - currentMonthEnergy).toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-400">kWh 下降</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute -inset-px rounded-xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 blur-sm bg-gradient-to-br from-water-orange to-water-red" />
                <div className="relative glass-card corner-deco p-5 rounded-xl overflow-hidden">
                  <div className="absolute -top-0 -right-0 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-water-orange to-water-red" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-water-orange to-water-red flex items-center justify-center shadow-lg shadow-water-orange/20">
                          <ArrowUpRight size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">同比去年</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-water-orange/15 text-water-orange">
                        <TrendingUp size={12} />
                        {(((yoyEnergy - lastYearSame) / lastYearSame) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="data-number text-3xl font-bold tracking-tight text-water-orange glow-text">
                        {(yoyEnergy - lastYearSame).toFixed(0)}
                      </span>
                      <span className="text-sm text-slate-400">kWh 上升</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5">
                <div className="glass-card corner-deco rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-water-cyan mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> 各泵当月能耗
                  </h3>
                  <div className="h-80">
                    <ReactECharts
                      option={pumpBarOption}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-7">
                <div className="glass-card corner-deco rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-water-cyan mb-4 flex items-center gap-2">
                    <TrendingUp size={14} /> 近12个月能耗趋势
                  </h3>
                  <div className="h-80">
                    <ReactECharts
                      option={energyTrendOption}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card corner-deco rounded-xl p-5">
              <h3 className="text-sm font-semibold text-water-cyan mb-4 flex items-center gap-2">
                <Lightbulb size={14} /> 节能建议
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { title: '优化水泵运行组合', desc: '根据用水曲线调整泵组运行方案，避免大泵小流量工况，预计节能 8~12%。', level: 'high' },
                  { title: '实施变频调速改造', desc: '对 3#、4# 泵加装变频装置，根据压力闭环调节转速，预计节能 15%。', level: 'high' },
                  { title: '管网漏损控制', desc: '加强夜间压力监控与DMA分区计量，降低管网漏损率至 8% 以下。', level: 'medium' },
                  { title: '错峰用电调度', desc: '利用水塔调蓄能力，在谷电时段多供水，峰电时段减少供水量。', level: 'medium' },
                  { title: '定期维护保养', desc: '按期清理叶轮水垢、更换密封件，保持水泵高效运行，防止效率衰减。', level: 'low' },
                  { title: '更换低效设备', desc: '对运行超过10年的老旧水泵进行能效评估，分批更换为高效节能泵。', level: 'low' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-4 rounded-xl border transition-all duration-300 hover:shadow-lg',
                      item.level === 'high'
                        ? 'bg-water-green/5 border-water-green/20 hover:shadow-water-green/10'
                        : item.level === 'medium'
                        ? 'bg-water-yellow/5 border-water-yellow/20 hover:shadow-water-yellow/10'
                        : 'bg-water-cyan/5 border-water-cyan/20 hover:shadow-water-cyan/10',
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-200">{item.title}</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium',
                          item.level === 'high'
                            ? 'bg-water-green/15 text-water-green'
                            : item.level === 'medium'
                            ? 'bg-water-yellow/15 text-water-yellow'
                            : 'bg-water-cyan/15 text-water-cyan',
                        )}
                      >
                        {item.level === 'high' ? '高潜力' : item.level === 'medium' ? '中潜力' : '常规'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
