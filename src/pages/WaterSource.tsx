import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Droplets,
  MapPin,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Eye,
  Lightbulb,
  CheckSquare,
  Filter,
  X,
  Clock,
  User,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWaterStore } from '@/stores/waterStore';
import { useAlarmStore, type Alarm } from '@/stores/alarmStore';
import StatusBadge from '@/components/common/StatusBadge';
import GaugeChart from '@/components/common/GaugeChart';
import DataTable from '@/components/common/DataTable';

type SourceTab = 'overview' | 'quality' | 'alarm';
type LevelFilter = 'all' | 1 | 2 | 3;
type StatusFilter = 'all' | 'pending' | 'processing' | 'resolved';

const statusBarMap: Record<string, string> = {
  normal: 'bg-water-green',
  warning: 'bg-water-yellow',
  alarm: 'bg-water-red',
  offline: 'bg-slate-500',
};

const statusLabelMap: Record<string, string> = {
  normal: '正常',
  warning: '警告',
  alarm: '报警',
  offline: '离线',
};

const sourceTypeMap: Record<string, string> = {
  reservoir: '水库',
  river: '河道',
  groundwater: '地下水',
};

const paramThresholds: Record<string, { min: number; max: number; unit: string; label: string }> = {
  turbidity: { min: 0, max: 1.0, unit: 'NTU', label: '浊度' },
  ph: { min: 6.5, max: 8.5, unit: '', label: 'pH值' },
  residualChlorine: { min: 0.1, max: 0.8, unit: 'mg/L', label: '余氯' },
  cod: { min: 0, max: 6.0, unit: 'mg/L', label: 'COD' },
  ammoniaNitrogen: { min: 0, max: 0.2, unit: 'mg/L', label: '氨氮' },
  temperature: { min: 5, max: 30, unit: '℃', label: '温度' },
};

function gen24hTrend(): { time: string; values: Record<string, number> }[] {
  const arr: { time: string; values: Record<string, number> }[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    arr.push({
      time: `${d.getHours().toString().padStart(2, '0')}:00`,
      values: {
        turbidity: +(0.3 + Math.random() * 0.6).toFixed(2),
        ph: +(7 + (Math.random() - 0.5) * 0.6).toFixed(2),
        residualChlorine: +(0.3 + Math.random() * 0.4).toFixed(2),
        cod: +(2 + Math.random() * 3).toFixed(1),
        ammoniaNitrogen: +(0.05 + Math.random() * 0.12).toFixed(3),
        temperature: +(18 + Math.random() * 6).toFixed(1),
      },
    });
  }
  return arr;
}

export default function WaterSource() {
  const [activeTab, setActiveTab] = useState<SourceTab>('overview');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [trendParam, setTrendParam] = useState<keyof typeof paramThresholds>('turbidity');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [suggestionModal, setSuggestionModal] = useState<{ open: boolean; alarm: Alarm | null }>({
    open: false,
    alarm: null,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; alarm: Alarm | null }>({
    open: false,
    alarm: null,
  });

  const { waterSources } = useWaterStore();
  const { alarms, acknowledgeAlarm, resolveAlarm } = useAlarmStore();

  const allSources = useMemo(() => {
    const mock5th = {
      id: 'ws-005',
      name: '南部取水枢纽',
      type: 'river' as const,
      location: '市南区江滨大道1288号',
      status: 'warning' as const,
      currentQuality: {
        turbidity: 0.95,
        ph: 7.42,
        residualChlorine: 0.45,
        cod: 5.2,
        ammoniaNitrogen: 0.15,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      },
      dailyProduction: 38000,
      capacity: 0,
      lastUpdate: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    };
    return [...waterSources, mock5th];
  }, [waterSources]);

  const selectedSource = useMemo(
    () => allSources.find((s) => s.id === selectedSourceId) ?? allSources[0],
    [allSources, selectedSourceId],
  );

  const trendData = useMemo(() => gen24hTrend(), []);

  const filteredAlarms = useMemo(() => {
    return alarms
      .filter((a) => {
        const levelMap: Record<string, 1 | 2 | 3> = { info: 1, warning: 2, critical: 3 };
        const lv = levelMap[a.level];
        if (levelFilter !== 'all' && lv !== levelFilter) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [alarms, levelFilter, statusFilter]);

  const tabs: { key: SourceTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: '水源总览', icon: <Droplets size={16} /> },
    { key: 'quality', label: '水质详情', icon: <Activity size={16} /> },
    { key: 'alarm', label: '报警中心', icon: <AlertTriangle size={16} /> },
  ];

  const statusToBadge = (s: string) => {
    if (s === 'normal') return 'normal';
    if (s === 'warning') return 'warning';
    if (s === 'alarm' || s === 'offline') return 'alarm';
    return 'normal';
  };

  const levelBadge = (level: string) => {
    if (level === 'critical') return { label: '3级', color: 'bg-water-red/15 text-water-red border-water-red/30' };
    if (level === 'warning') return { label: '2级', color: 'bg-water-yellow/15 text-water-yellow border-water-yellow/30' };
    return { label: '1级', color: 'bg-water-cyan/15 text-water-cyan border-water-cyan/30' };
  };

  const statusBadgeAlarm = (status: Alarm['status']) => {
    if (status === 'pending') return { label: '待处理', color: 'bg-water-orange/15 text-water-orange border-water-orange/30' };
    if (status === 'acknowledged') return { label: '处理中', color: 'bg-water-cyan/15 text-water-cyan border-water-cyan/30' };
    return { label: '已解决', color: 'bg-water-green/15 text-water-green border-water-green/30' };
  };

  const trendChartOption: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 30, 54, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => d.time),
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
      axisLabel: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: 'rgba(148, 163, 184, 0.7)', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trendData.map((d) => d.values[trendParam]),
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
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: 'rgba(255, 77, 79, 0.6)' },
          data: ([
            { yAxis: paramThresholds[trendParam].max, label: { formatter: '上限', color: '#FF4D4F', fontSize: 10 } },
            paramThresholds[trendParam].min > 0
              ? { yAxis: paramThresholds[trendParam].min, label: { formatter: '下限', color: '#FF4D4F', fontSize: 10 } }
              : null,
          ].filter(Boolean)) as unknown as Array<{ yAxis: number; label: { formatter: string; color: string; fontSize: number } }>,
        },
      },
    ],
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Droplets className="text-water-cyan" />
            水源监测
          </h1>
          <p className="text-sm text-slate-400 mt-1">实时监控水源地水质状态与报警信息</p>
        </div>
        <div className="text-xs text-slate-500">
          最后更新: {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
        </div>
      </div>

      <div className="flex gap-2 border-b border-water-cyan/10 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 relative',
              activeTab === tab.key
                ? 'text-water-cyan'
                : 'text-slate-400 hover:text-slate-200',
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
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allSources.map((source) => (
              <div
                key={source.id}
                className="relative glass-card corner-deco rounded-xl overflow-hidden group cursor-pointer hover:shadow-lg hover:shadow-water-cyan/10 transition-all duration-300"
                onClick={() => {
                  setSelectedSourceId(source.id);
                  setActiveTab('quality');
                }}
              >
                <div className={cn('h-1.5 w-full', statusBarMap[source.status])} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                          source.status === 'normal'
                            ? 'from-water-cyan/30 to-water-teal/30 text-water-cyan'
                            : source.status === 'warning'
                            ? 'from-water-yellow/30 to-water-orange/30 text-water-yellow'
                            : 'from-water-red/30 to-water-orange/30 text-water-red',
                        )}
                      >
                        <Droplets size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-water-cyan transition-colors">
                          {source.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                          <MapPin size={12} />
                          {source.location}
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      status={statusToBadge(source.status) as 'normal' | 'warning' | 'alarm'}
                      text={statusLabelMap[source.status]}
                      pulse={source.status !== 'normal' && source.status !== 'offline'}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-water-cyan/5 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">浊度</div>
                      <div className="data-number text-lg font-bold text-water-cyan">
                        {source.currentQuality.turbidity.toFixed(2)}
                        <span className="text-xs text-slate-500 ml-1">NTU</span>
                      </div>
                    </div>
                    <div className="bg-water-cyan/5 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">pH</div>
                      <div className="data-number text-lg font-bold text-water-teal">
                        {source.currentQuality.ph.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-water-cyan/5 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">余氯</div>
                      <div className="data-number text-lg font-bold text-water-green">
                        {source.currentQuality.residualChlorine.toFixed(2)}
                        <span className="text-xs text-slate-500 ml-1">mg/L</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-water-cyan/5">
                    <span className="flex items-center gap-1">
                      <Activity size={12} />
                      {sourceTypeMap[source.type]} · 日产 {source.dailyProduction.toLocaleString()} m³
                    </span>
                    <span>{source.lastUpdate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'quality' && selectedSource && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-3 space-y-3">
              <div className="glass-card corner-deco rounded-xl p-4">
                <h3 className="text-sm font-semibold text-water-cyan mb-3 flex items-center gap-2">
                  <Droplets size={14} /> 水源选择
                </h3>
                <div className="space-y-2">
                  {allSources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSourceId(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
                        selectedSource.id === s.id
                          ? 'bg-water-cyan/15 border border-water-cyan/30'
                          : 'hover:bg-water-cyan/5 border border-transparent',
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusBarMap[s.status])} />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm font-medium truncate',
                          selectedSource.id === s.id ? 'text-water-cyan' : 'text-slate-200',
                        )}>
                          {s.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{s.location}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card corner-deco rounded-xl p-4">
                <h3 className="text-sm font-semibold text-water-cyan mb-3 flex items-center gap-2">
                  <AlertCircle size={14} /> 阈值配置
                </h3>
                <div className="space-y-3">
                  {Object.entries(paramThresholds).map(([key, cfg]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{cfg.label}</span>
                        <span className="text-slate-500">{cfg.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-water-red data-number">{cfg.min}</span>
                        <div className="flex-1 h-1.5 bg-water-cyan/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-water-green via-water-yellow to-water-red rounded-full" style={{ width: '100%' }} />
                        </div>
                        <span className="text-water-red data-number">{cfg.max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-9 space-y-4">
              <div className="glass-card corner-deco rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-water-cyan">
                    {selectedSource.name} - 实时水质参数
                  </h3>
                  <StatusBadge
                    status={statusToBadge(selectedSource.status) as 'normal' | 'warning' | 'alarm'}
                    text={statusLabelMap[selectedSource.status]}
                    pulse={selectedSource.status !== 'normal' && selectedSource.status !== 'offline'}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <GaugeChart
                    value={selectedSource.currentQuality.turbidity}
                    max={2}
                    threshold={paramThresholds.turbidity.max}
                    unit="NTU"
                    label="浊度"
                  />
                  <GaugeChart
                    value={selectedSource.currentQuality.ph}
                    min={6}
                    max={9}
                    threshold={paramThresholds.ph.max}
                    label="pH值"
                  />
                  <GaugeChart
                    value={selectedSource.currentQuality.residualChlorine}
                    max={1.2}
                    threshold={paramThresholds.residualChlorine.max}
                    unit="mg/L"
                    label="余氯"
                  />
                  <GaugeChart
                    value={selectedSource.currentQuality.cod}
                    max={10}
                    threshold={paramThresholds.cod.max}
                    unit="mg/L"
                    label="COD"
                  />
                  <GaugeChart
                    value={selectedSource.currentQuality.ammoniaNitrogen}
                    max={0.5}
                    threshold={paramThresholds.ammoniaNitrogen.max}
                    unit="mg/L"
                    label="氨氮"
                  />
                  <GaugeChart
                    value={22.5}
                    min={0}
                    max={40}
                    threshold={paramThresholds.temperature.max}
                    unit="℃"
                    label="温度"
                  />
                </div>
              </div>

              <div className="glass-card corner-deco rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-water-cyan">24小时趋势图</h3>
                  <div className="flex gap-1.5">
                    {(Object.keys(paramThresholds) as Array<keyof typeof paramThresholds>).map((p) => (
                      <button
                        key={p}
                        onClick={() => setTrendParam(p)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs transition-all duration-200',
                          trendParam === p
                            ? 'bg-water-cyan/20 text-water-cyan border border-water-cyan/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-water-cyan/5 border border-transparent',
                        )}
                      >
                        {paramThresholds[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-72">
                  <ReactECharts
                    option={trendChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alarm' && (
          <div className="space-y-4">
            <div className="glass-card corner-deco rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-water-cyan" />
                  <span className="text-sm text-slate-400">级别筛选:</span>
                  <div className="flex gap-1.5">
                    {(['all', 1, 2, 3] as const).map((lv) => (
                      <button
                        key={String(lv)}
                        onClick={() => setLevelFilter(lv)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs transition-all duration-200',
                          levelFilter === lv
                            ? lv === 3
                              ? 'bg-water-red/20 text-water-red border border-water-red/40'
                              : lv === 2
                              ? 'bg-water-yellow/20 text-water-yellow border border-water-yellow/40'
                              : lv === 1
                              ? 'bg-water-cyan/20 text-water-cyan border border-water-cyan/40'
                              : 'bg-water-cyan/20 text-water-cyan border border-water-cyan/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-water-cyan/5 border border-transparent',
                        )}
                      >
                        {lv === 'all' ? '全部' : `${lv}级`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">状态筛选:</span>
                  <div className="flex gap-1.5">
                    {(['all', 'pending', 'acknowledged', 'resolved'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st as StatusFilter)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs transition-all duration-200',
                          statusFilter === st
                            ? 'bg-water-cyan/20 text-water-cyan border border-water-cyan/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-water-cyan/5 border border-transparent',
                        )}
                      >
                        {st === 'all' ? '全部' : st === 'pending' ? '待处理' : st === 'acknowledged' ? '处理中' : '已解决'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-sm text-slate-500">
                  共 <span className="text-water-cyan font-medium">{filteredAlarms.length}</span> 条报警
                </div>
              </div>
            </div>

            <DataTable
              data={filteredAlarms as unknown as Record<string, unknown>[]}
              rowKey="id"
              columns={[
                {
                  key: 'createdAt',
                  title: '报警时间',
                  width: 160,
                  render: (v) => (
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-500" />
                      <span className="data-number text-xs">{v as string}</span>
                    </div>
                  ),
                },
                { key: 'location', title: '水源地', width: 180 },
                {
                  key: 'category',
                  title: '参数',
                  width: 100,
                  render: (v, row) => {
                    const a = row as unknown as Alarm;
                    return (
                      <span className="text-slate-300">
                        {a.title.replace(/(管网|水源|水泵|.*压力|.*流量|.*余氯|.*浊度|.*COD|.*振动|.*效率)/, '') || (v as string)}
                      </span>
                    );
                  },
                },
                {
                  key: 'value',
                  title: '数值',
                  width: 100,
                  align: 'right',
                  render: (v, row) => {
                    const a = row as unknown as Alarm;
                    if (v === undefined || v === null) return <span className="text-slate-500">-</span>;
                    return (
                      <span className="data-number text-water-yellow">
                        {String(v)}{a.unit && ` ${a.unit}`}
                      </span>
                    );
                  },
                },
                {
                  key: 'threshold',
                  title: '阈值',
                  width: 100,
                  align: 'right',
                  render: (_v, row) => {
                    const a = row as unknown as Alarm;
                    if (!a.threshold) return <span className="text-slate-500">-</span>;
                    const parts = [];
                    if (a.threshold.min !== undefined) parts.push(`≥${a.threshold.min}`);
                    if (a.threshold.max !== undefined) parts.push(`≤${a.threshold.max}`);
                    return <span className="data-number text-water-red">{parts.join(' ')}</span>;
                  },
                },
                {
                  key: 'level',
                  title: '级别',
                  width: 70,
                  align: 'center',
                  render: (v) => {
                    const lb = levelBadge(v as string);
                    return (
                      <span className={cn('inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border', lb.color)}>
                        {lb.label}
                      </span>
                    );
                  },
                },
                {
                  key: 'status',
                  title: '处置状态',
                  width: 90,
                  align: 'center',
                  render: (v) => {
                    const sb = statusBadgeAlarm(v as Alarm['status']);
                    return (
                      <span className={cn('inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border', sb.color)}>
                        {sb.label}
                      </span>
                    );
                  },
                },
                {
                  key: 'actions',
                  title: '操作',
                  width: 220,
                  align: 'center',
                  render: (_v, row) => {
                    const a = row as unknown as Alarm;
                    return (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailModal({ open: true, alarm: a })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-water-cyan/30 text-water-cyan hover:bg-water-cyan/10 transition-colors"
                        >
                          <Eye size={12} /> 详情
                        </button>
                        <button
                          onClick={() => setSuggestionModal({ open: true, alarm: a })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-water-yellow/30 text-water-yellow hover:bg-water-yellow/10 transition-colors"
                        >
                          <Lightbulb size={12} /> 建议
                        </button>
                        {a.status !== 'resolved' && (
                          <button
                            onClick={() => acknowledgeAlarm(a.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-water-green/30 text-water-green hover:bg-water-green/10 transition-colors"
                          >
                            <CheckSquare size={12} /> 处理
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          </div>
        )}
      </div>

      {suggestionModal.open && suggestionModal.alarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-water-deep/80 backdrop-blur-sm">
          <div className="glass-card corner-deco rounded-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-water-cyan/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lightbulb className="text-water-yellow" />
                处置建议
              </h3>
              <button
                onClick={() => setSuggestionModal({ open: false, alarm: null })}
                className="p-1.5 rounded-lg hover:bg-water-cyan/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="bg-water-yellow/5 border border-water-yellow/20 rounded-xl p-4">
                <div className="text-xs text-water-yellow mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> 系统自动生成建议
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {suggestionModal.alarm.suggestion || '建议立即组织相关人员现场核查，确认报警真实性后采取对应措施，并做好记录。'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-water-cyan mb-3 flex items-center gap-2">
                  <FileText size={14} /> 操作步骤
                </h4>
                <div className="space-y-2.5">
                  {[
                    '确认报警信息真实性，排除误报可能',
                    '通知相关责任人及值班领导',
                    '现场核实设备运行状态与参数',
                    '采取应急处置措施，控制事态发展',
                    '做好处置记录，必要时生成工单',
                    '持续跟踪，确认问题彻底解决',
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-water-cyan/15 border border-water-cyan/30 text-water-cyan text-xs flex items-center justify-center data-number">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-300 pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-water-cyan mb-3 flex items-center gap-2">
                  <User size={14} /> 处置记录
                </h4>
                <div className="space-y-2">
                  {suggestionModal.alarm.acknowledgedAt && (
                    <div className="flex items-start gap-3 p-3 bg-water-cyan/5 rounded-lg">
                      <CheckCircle size={14} className="text-water-cyan mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <div className="text-slate-300">
                          <span className="text-water-cyan">{suggestionModal.alarm.acknowledgedBy}</span> 已确认报警
                        </div>
                        <div className="text-slate-500 mt-0.5 data-number">{suggestionModal.alarm.acknowledgedAt}</div>
                      </div>
                    </div>
                  )}
                  {suggestionModal.alarm.resolvedAt && (
                    <div className="flex items-start gap-3 p-3 bg-water-green/5 rounded-lg">
                      <CheckCircle size={14} className="text-water-green mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <div className="text-slate-300">
                          <span className="text-water-green">{suggestionModal.alarm.resolvedBy}</span> 已解决
                        </div>
                        <div className="text-slate-400 mt-1">{suggestionModal.alarm.resolvedNote}</div>
                        <div className="text-slate-500 mt-0.5 data-number">{suggestionModal.alarm.resolvedAt}</div>
                      </div>
                    </div>
                  )}
                  {!suggestionModal.alarm.acknowledgedAt && !suggestionModal.alarm.resolvedAt && (
                    <div className="text-sm text-slate-500 text-center py-4">暂无处置记录</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-water-cyan/10">
              <button
                onClick={() => setSuggestionModal({ open: false, alarm: null })}
                className="btn-ghost"
              >
                关闭
              </button>
              {suggestionModal.alarm.status !== 'resolved' && (
                <button
                  onClick={() => {
                    resolveAlarm(suggestionModal.alarm!.id, '已按建议处置完成');
                    setSuggestionModal({ open: false, alarm: null });
                  }}
                  className="btn-primary"
                >
                  确认处理完成
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {detailModal.open && detailModal.alarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-water-deep/80 backdrop-blur-sm">
          <div className="glass-card corner-deco rounded-xl w-full max-w-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-water-cyan/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="text-water-cyan" />
                报警详情
              </h3>
              <button
                onClick={() => setDetailModal({ open: false, alarm: null })}
                className="p-1.5 rounded-lg hover:bg-water-cyan/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">报警标题</div>
                  <div className="text-slate-200">{detailModal.alarm.title}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">报警级别</div>
                  <div>
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                      levelBadge(detailModal.alarm.level).color,
                    )}>
                      {levelBadge(detailModal.alarm.level).label}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">发生位置</div>
                  <div className="text-slate-200">{detailModal.alarm.location}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">发生时间</div>
                  <div className="text-slate-200 data-number">{detailModal.alarm.createdAt}</div>
                </div>
                {detailModal.alarm.value !== undefined && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">当前数值</div>
                    <div className="text-water-yellow data-number">
                      {detailModal.alarm.value}{detailModal.alarm.unit && ` ${detailModal.alarm.unit}`}
                    </div>
                  </div>
                )}
                {detailModal.alarm.threshold && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">阈值范围</div>
                    <div className="text-water-red data-number">
                      {detailModal.alarm.threshold.min !== undefined && `≥${detailModal.alarm.threshold.min} `}
                      {detailModal.alarm.threshold.max !== undefined && `≤${detailModal.alarm.threshold.max}`}
                      {detailModal.alarm.unit && ` ${detailModal.alarm.unit}`}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1.5">详细描述</div>
                <div className="text-sm text-slate-300 bg-water-cyan/5 rounded-lg p-3 leading-relaxed">
                  {detailModal.alarm.description}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-water-cyan/10">
              <button
                onClick={() => setDetailModal({ open: false, alarm: null })}
                className="btn-primary"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
