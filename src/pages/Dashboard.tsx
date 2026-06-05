import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Droplets,
  Gauge,
  Leaf,
  ClipboardCheck,
  AlertTriangle,
  Zap,
  MapPin,
  Download,
  Filter,
  Calendar,
  AreaChart,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { useDashboardStore, DashboardAlarm } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

function SectionTitle({
  icon,
  title,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-water-cyan to-water-teal" />
        <span className="text-water-cyan text-sm">{icon}</span>
        <h3 className="text-white font-medium text-sm">{title}</h3>
      </div>
      {extra}
    </div>
  );
}

function AlarmItem({ alarm }: { alarm: DashboardAlarm }) {
  const levelConfig = {
    critical: {
      bg: 'bg-water-red/10',
      border: 'border-water-red/30',
      dot: 'bg-water-red',
      text: 'text-water-red',
      label: '1级',
    },
    warning: {
      bg: 'bg-water-yellow/10',
      border: 'border-water-yellow/30',
      dot: 'bg-water-yellow',
      text: 'text-water-yellow',
      label: '2级',
    },
    info: {
      bg: 'bg-water-cyan/10',
      border: 'border-water-cyan/30',
      dot: 'bg-water-cyan',
      text: 'text-water-cyan',
      label: '3级',
    },
  };
  const cfg = levelConfig[alarm.level];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-water-cyan/5',
        cfg.bg,
        cfg.border
      )}
    >
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={cn('w-2.5 h-2.5 rounded-full blink-animation', cfg.dot)} />
        <span className={cn('text-xs font-bold', cfg.text)}>{cfg.label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{alarm.message}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
          <MapPin size={12} />
          <span className="truncate">{alarm.location}</span>
          <span className="ml-auto shrink-0">{alarm.time}</span>
        </div>
      </div>
    </div>
  );
}

function AlarmScrollList({ alarms }: { alarms: DashboardAlarm[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    let paused = false;

    const scroll = () => {
      if (!paused && el) {
        el.scrollTop += 0.5;
        if (el.scrollTop >= el.scrollHeight / 2) {
          el.scrollTop = 0;
        }
      }
      raf = requestAnimationFrame(scroll);
    };

    const handleEnter = () => (paused = true);
    const handleLeave = () => (paused = false);

    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);
    raf = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const doubled = [...alarms, ...alarms];

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-hidden space-y-2 pr-1"
      style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}
    >
      {doubled.map((alarm, idx) => (
        <AlarmItem key={`${alarm.id}-${idx}`} alarm={alarm} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const stats = useDashboardStore((s) => s.stats);
  const productionTrend = useDashboardStore((s) => s.productionTrend);
  const pressurePoints = useDashboardStore((s) => s.pressurePoints);
  const alarms = useDashboardStore((s) => s.alarms);
  const startRealTimeUpdates = useDashboardStore((s) => s.startRealTimeUpdates);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    const stop = startRealTimeUpdates();
    return () => stop();
  }, [isAuthenticated, navigate, startRealTimeUpdates]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const trendOption: EChartsOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 30, 54, 0.9)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        textStyle: { color: '#e2e8f0' },
      },
      legend: {
        data: ['产水量', '用水量'],
        textStyle: { color: '#94a3b8' },
        top: 0,
        right: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: productionTrend.map((p) => p.time),
        axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'm³',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
      },
      series: [
        {
          name: '产水量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: productionTrend.map((p) => p.production),
          lineStyle: { color: '#00D4FF', width: 2.5 },
          itemStyle: { color: '#00D4FF', borderColor: '#0F1E36', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 212, 255, 0.35)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0)' },
              ],
            },
          },
        },
        {
          name: '用水量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: productionTrend.map((p) => p.consumption),
          lineStyle: { color: '#00E5CC', width: 2.5 },
          itemStyle: { color: '#00E5CC', borderColor: '#0F1E36', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 229, 204, 0.3)' },
                { offset: 1, color: 'rgba(0, 229, 204, 0)' },
              ],
            },
          },
        },
      ],
    }),
    [productionTrend]
  );

  const pressureOption: EChartsOption = useMemo(() => {
    const xMin = Math.min(...pressurePoints.map((p) => p.lng)) - 0.02;
    const xMax = Math.max(...pressurePoints.map((p) => p.lng)) + 0.02;
    const yMin = Math.min(...pressurePoints.map((p) => p.lat)) - 0.02;
    const yMax = Math.max(...pressurePoints.map((p) => p.lat)) + 0.02;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 30, 54, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        textStyle: { color: '#e2e8f0' },
        formatter: (params: unknown) => {
          const p = params as { data?: [number, number, number, string, string] };
          if (!p.data) return '';
          return `<div style="font-weight:600">${p.data[3]}</div>
            <div style="margin-top:4px;color:#00D4FF">压力: ${p.data[2]} MPa</div>
            <div style="color:#94a3b8;font-size:11px">更新: ${p.data[4]}</div>`;
        },
      },
      grid: { left: '5%', right: '12%', bottom: '8%', top: '5%', containLabel: false },
      xAxis: {
        type: 'value',
        min: xMin,
        max: xMax,
        show: false,
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        show: false,
      },
      visualMap: {
        min: 0.15,
        max: 0.5,
        calculable: true,
        orient: 'vertical',
        right: '2%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 10 },
        inRange: {
          color: ['#FF4D4F', '#FFB020', '#00E5CC', '#00D4FF', '#8B5CF6'],
        },
        text: ['高', '低'],
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 22,
          data: pressurePoints.map((p) => [p.lng, p.lat, p.pressure, p.name, p.lastUpdate]),
          label: {
            show: true,
            position: 'inside',
            formatter: (params: unknown) => {
              const pa = params as { data: [number, number, number] };
              return pa.data[2].toFixed(2);
            },
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(0, 212, 255, 0.5)',
            borderColor: 'rgba(255,255,255,0.3)',
            borderWidth: 1,
          },
          emphasis: {
            scale: 1.4,
            itemStyle: { shadowBlur: 20 },
          },
        },
      ],
    };
  }, [pressurePoints]);

  const plantBarOption: EChartsOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 30, 54, 0.9)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        textStyle: { color: '#e2e8f0' },
      },
      grid: { left: '3%', right: '5%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['一水厂', '二水厂', '三水厂', '四水厂', '五水厂'],
        axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'm³',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.06)' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: '45%',
          data: [42500, 38600, 35200, 28900, 22300],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#00E5CC' },
                { offset: 1, color: 'rgba(0, 212, 255, 0.2)' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            color: '#00D4FF',
            fontSize: 11,
            formatter: (params: unknown) => {
              const p = params as { value: number };
              return (p.value / 1000).toFixed(1) + 'K';
            },
          },
        },
      ],
    }),
    []
  );

  const qualityRingOption: EChartsOption = useMemo(() => {
    const rate = stats.waterQualityRate;
    return {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          pointer: { show: false },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: '#00E676' },
                  { offset: 1, color: '#00D4FF' },
                ],
              },
              shadowColor: 'rgba(0, 230, 118, 0.5)',
              shadowBlur: 15,
            },
          },
          axisLine: {
            lineStyle: {
              width: 16,
              color: [[1, 'rgba(0, 212, 255, 0.1)']],
            },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          data: [{ value: rate, name: '达标率' }],
          detail: {
            valueAnimation: true,
            fontSize: 36,
            fontWeight: 'bold',
            offsetCenter: [0, '-5%'],
            formatter: '{value}%',
            color: '#00E676',
            textShadowColor: 'rgba(0, 230, 118, 0.6)',
            textShadowBlur: 10,
          },
          title: {
            offsetCenter: [0, '35%'],
            fontSize: 13,
            color: '#94a3b8',
          },
        },
      ],
    };
  }, [stats.waterQualityRate]);

  const workOrderPieOption: EChartsOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 30, 54, 0.9)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        textStyle: { color: '#e2e8f0' },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#0F1E36',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'center',
            formatter: '{total|{c}}\n{name|工单总数}',
            rich: {
              total: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#00D4FF',
                lineHeight: 36,
                textShadowColor: 'rgba(0, 212, 255, 0.6)',
                textShadowBlur: 8,
              },
              name: {
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 18,
              },
            },
          },
          data: [
            { value: 23, name: '待处理', itemStyle: { color: '#FFB020' } },
            { value: 45, name: '处理中', itemStyle: { color: '#00D4FF' } },
            { value: 128, name: '已完成', itemStyle: { color: '#00E676' } },
            { value: 8, name: '已升级', itemStyle: { color: '#FF4D4F' } },
          ],
        },
      ],
    }),
    []
  );

  const sparklineBase = useMemo(
    () => [30, 45, 38, 52, 48, 60, 55, 68, 62, 75, 70, 82],
    []
  );

  if (!isAuthenticated) return null;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-water-deep">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-30 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(0, 212, 255, 0.12) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 h-full flex flex-col p-4 gap-3">
        <header className="shrink-0">
          <div className="glass-card corner-deco rounded-xl px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center shadow-lg shadow-water-cyan/30">
                  <Droplets className="text-water-deep" size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-wider glow-text">
                    智慧水务综合管理平台
                  </h1>
                  <p className="text-xs text-water-cyan/60 tracking-widest">
                    SMART WATER MANAGEMENT DASHBOARD
                  </p>
                </div>
              </div>

              <div className="flex-1 mx-8 overflow-hidden">
                <div className="relative">
                  <div className="flex gap-12 whitespace-nowrap animate-scroll" style={{ animationDuration: '30s' }}>
                    {[
                      { label: '实时产水', value: `${(stats.todayProduction / 1000).toFixed(1)}K m³`, color: 'text-water-cyan' },
                      { label: '当前压力', value: `${stats.currentPressure} MPa`, color: 'text-water-teal' },
                      { label: '在线监测点', value: '128 个', color: 'text-water-green' },
                      { label: '活跃工单', value: '68 件', color: 'text-water-yellow' },
                      { label: '今日报警', value: `${stats.activeAlarms} 条`, color: 'text-water-red' },
                      { label: '系统状态', value: '运行正常', color: 'text-water-green' },
                    ].concat([
                      { label: '实时产水', value: `${(stats.todayProduction / 1000).toFixed(1)}K m³`, color: 'text-water-cyan' },
                      { label: '当前压力', value: `${stats.currentPressure} MPa`, color: 'text-water-teal' },
                      { label: '在线监测点', value: '128 个', color: 'text-water-green' },
                      { label: '活跃工单', value: '68 件', color: 'text-water-yellow' },
                      { label: '今日报警', value: `${stats.activeAlarms} 条`, color: 'text-water-red' },
                      { label: '系统状态', value: '运行正常', color: 'text-water-green' },
                    ]).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">{item.label}:</span>
                        <span className={cn('font-bold data-number', item.color)}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-water-dark/60 border border-water-cyan/10">
                  <Filter size={14} className="text-water-cyan" />
                  <select className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer">
                    <option className="bg-water-dark">全部片区</option>
                    <option className="bg-water-dark">东城区</option>
                    <option className="bg-water-dark">西城区</option>
                    <option className="bg-water-dark">朝阳区</option>
                    <option className="bg-water-dark">海淀区</option>
                  </select>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-water-dark/60 border border-water-cyan/10">
                  <Calendar size={14} className="text-water-cyan" />
                  <select className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer">
                    <option className="bg-water-dark">今日</option>
                    <option className="bg-water-dark">本周</option>
                    <option className="bg-water-dark">本月</option>
                  </select>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-water-dark/60 border border-water-cyan/10">
                  <AreaChart size={14} className="text-water-cyan" />
                  <select className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer">
                    <option className="bg-water-dark">全部指标</option>
                    <option className="bg-water-dark">产水量</option>
                    <option className="bg-water-dark">水质</option>
                    <option className="bg-water-dark">能耗</option>
                  </select>
                </div>
                <button className="btn-primary flex items-center gap-1.5 text-sm py-2">
                  <Download size={14} />
                  导出报表
                </button>

                <div className="h-8 w-px bg-water-cyan/20 mx-1" />

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-water-dark/60 border border-water-cyan/10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center">
                    <UserIcon size={14} className="text-water-deep" />
                  </div>
                  <div className="text-sm">
                    <div className="text-white font-medium">{user?.name}</div>
                    <div className="text-xs text-slate-400 leading-none">
                      {user?.role === 'admin' && '系统管理员'}
                      {user?.role === 'dispatcher' && '调度员'}
                      {user?.role === 'plant_leader' && '水厂厂长'}
                      {user?.role === 'inspector' && '巡检员'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg border border-water-cyan/20 text-water-cyan hover:bg-water-cyan/10 transition-colors"
                  title="退出登录"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="shrink-0 grid grid-cols-6 gap-3">
          <StatCard
            title="今日产水量"
            value={stats.todayProduction}
            unit="m³"
            trend={2.5}
            trendUp
            icon={<Droplets size={20} className="text-water-deep" />}
            color="cyan"
            sparklineData={sparklineBase}
          />
          <StatCard
            title="平均供水压力"
            value={stats.currentPressure}
            unit="MPa"
            trend={1.2}
            trendUp
            icon={<Gauge size={20} className="text-water-deep" />}
            color="teal"
            sparklineData={sparklineBase.map((v) => v * 0.8)}
          />
          <StatCard
            title="水质达标率"
            value={stats.waterQualityRate}
            unit="%"
            trend={0.3}
            trendUp
            icon={<Leaf size={20} className="text-water-deep" />}
            color="green"
            sparklineData={sparklineBase.map((v) => v * 0.95)}
          />
          <StatCard
            title="巡检完成率"
            value={stats.inspectionCompleteRate}
            unit="%"
            trend={-1.8}
            trendUp={false}
            icon={<ClipboardCheck size={20} className="text-water-deep" />}
            color="yellow"
            sparklineData={sparklineBase.map((v) => v * 0.7)}
          />
          <StatCard
            title="今日报警数"
            value={stats.activeAlarms}
            unit="条"
            trend={-12.5}
            trendUp={false}
            icon={<AlertTriangle size={20} className="text-water-deep" />}
            color="orange"
            sparklineData={sparklineBase.map((v) => v * 0.5).reverse()}
          />
          <StatCard
            title="今日能耗"
            value={stats.todayEnergy}
            unit="kWh"
            trend={3.2}
            trendUp
            icon={<Zap size={20} className="text-water-deep" />}
            color="purple"
            sparklineData={sparklineBase.map((v) => v * 0.6)}
          />
        </section>

        <section className="shrink-0 grid grid-cols-12 gap-3 flex-1 min-h-0">
          <div className="col-span-4 glass-card corner-deco rounded-xl p-4 flex flex-col min-h-0">
            <SectionTitle
              icon={<Droplets size={14} />}
              title="24小时产水量/用水量趋势"
              extra={<span className="text-xs text-slate-500">单位: m³</span>}
            />
            <div className="flex-1 min-h-0">
              <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="col-span-4 glass-card corner-deco rounded-xl p-4 flex flex-col min-h-0">
            <SectionTitle
              icon={<MapPin size={14} />}
              title="供水压力热力图"
              extra={
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-water-red" />
                    异常
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-water-yellow" />
                    预警
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-water-cyan" />
                    正常
                  </span>
                </div>
              }
            />
            <div className="flex-1 min-h-0 relative">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="pressure-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#00D4FF" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#pressure-grid)" />
                <polygon points="15,20 85,15 90,80 10,85" fill="none" stroke="#00D4FF" strokeWidth="0.5" opacity="0.4" />
                <polygon points="30,30 70,28 75,65 25,68" fill="none" stroke="#00E5CC" strokeWidth="0.3" opacity="0.3" strokeDasharray="2,2" />
              </svg>
              <ReactECharts option={pressureOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="col-span-4 glass-card corner-deco rounded-xl p-4 flex flex-col min-h-0">
            <SectionTitle
              icon={<AlertTriangle size={14} />}
              title="实时报警"
              extra={
                <span className="flex items-center gap-1 text-xs text-water-red">
                  <span className="w-2 h-2 rounded-full bg-water-red blink-animation" />
                  {alarms.length} 条待处理
                </span>
              }
            />
            <div className="flex-1 min-h-0">
              <AlarmScrollList alarms={alarms} />
            </div>
          </div>
        </section>

        <section className="shrink-0 grid grid-cols-12 gap-3 h-[260px]">
          <div className="col-span-4 glass-card corner-deco rounded-xl p-4 flex flex-col">
            <SectionTitle
              icon={<Droplets size={14} />}
              title="各水厂产水量统计"
              extra={<ChevronRight size={14} className="text-water-cyan/60 cursor-pointer hover:text-water-cyan" />}
            />
            <div className="flex-1 min-h-0">
              <ReactECharts option={plantBarOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="col-span-4 glass-card corner-deco rounded-xl p-4 flex flex-col">
            <SectionTitle
              icon={<Leaf size={14} />}
              title="水质达标率"
              extra={
                <span className="text-xs text-water-green font-medium">
                  {stats.waterQualityRate}%
                </span>
              }
            />
            <div className="flex-1 min-h-0">
              <ReactECharts option={qualityRingOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: '浊度', value: '0.45 NTU', ok: true },
                { label: 'pH值', value: '7.35', ok: true },
                { label: '余氯', value: '0.42 mg/L', ok: true },
              ].map((item) => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-water-dark/40">
                  <div className="text-xs text-slate-400">{item.label}</div>
                  <div className={cn('text-sm font-bold data-number mt-0.5', item.ok ? 'text-water-green' : 'text-water-red')}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-4 glass-card corner-deco rounded-xl p-4 flex flex-col">
            <SectionTitle
              icon={<ClipboardCheck size={14} />}
              title="工单处理状态统计"
              extra={<ChevronRight size={14} className="text-water-cyan/60 cursor-pointer hover:text-water-cyan" />}
            />
            <div className="flex-1 min-h-0">
              <ReactECharts option={workOrderPieOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
