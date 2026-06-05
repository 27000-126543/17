import { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Lock,
  Unlock,
  AlertTriangle,
  TrendingUp,
  Factory,
  Droplets,
  Beaker,
  Waves,
  Shield,
  Clock,
  User,
  Zap,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { useSewageStore, type SewageWorkOrder } from '@/stores/sewageStore';

type SewageTab = 'overview' | 'abnormal';

interface ProcessStage {
  id: string;
  name: string;
  order: number;
  icon: React.ReactNode;
  cod: number;
  ammoniaNitrogen: number;
  codRemoval: number;
  ammoniaRemoval: number;
  flow: number;
  isAlarm: boolean;
}

interface AbnormalWorkOrder extends Record<string, unknown> {
  id: string;
  time: string;
  stageName: string;
  parameter: string;
  value: number;
  threshold: number;
  deviceLocked: boolean;
  status: 'pending' | 'processing' | 'upgraded' | 'resolved';
  overdueHours: number;
  escalated: boolean;
  escalationNote?: string;
  handler: string;
}

const COD_THRESHOLD = 50;
const AMMONIA_THRESHOLD = 5;

const stageIcons: Record<string, React.ReactNode> = {
  '进水': <Droplets size={20} />,
  '粗格栅': <Factory size={20} />,
  '细格栅': <Factory size={20} />,
  '格栅': <Factory size={20} />,
  '沉砂池': <Waves size={20} />,
  '初沉池': <Beaker size={20} />,
  '生化池': <Beaker size={20} />,
  '沉淀池': <Beaker size={20} />,
  '二沉池': <Beaker size={20} />,
  '消毒': <Shield size={20} />,
  '消毒出水': <Shield size={20} />,
  '出水': <Droplets size={20} />,
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function getOverdueHours(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 3600000);
}

export default function Sewage() {
  const [activeTab, setActiveTab] = useState<SewageTab>('overview');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stages, devices, workOrders, fetchAll, unlockDevice } = useSewageStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const processStages = useMemo<ProcessStage[]>(() => {
    return stages
      .filter((s) => s.plantId === 'p001')
      .sort((a, b) => a.order - b.order)
      .map((stage) => ({
        id: stage.id,
        name: stage.name,
        order: stage.order,
        icon: stageIcons[stage.name] || <Factory size={20} />,
        cod: stage.cod,
        ammoniaNitrogen: stage.ammoniaNitrogen,
        codRemoval: stage.codRemoval,
        ammoniaRemoval: stage.ammoniaRemoval,
        flow: stage.flow,
        isAlarm: stage.isAlarm,
      }));
  }, [stages]);

  const abnormalOrders = useMemo<AbnormalWorkOrder[]>(() => {
    return workOrders
      .filter((wo): wo is SewageWorkOrder => wo.type === 'sewage')
      .map((wo) => {
        const stage = stages.find((s) => s.id === wo.stageId);
        const device = devices.find((d) => d.id === wo.deviceId);
        const overdueHours = getOverdueHours(wo.createdAt);
        const escalated = wo.status === 'upgraded';
        const deviceLocked = wo.deviceLocked || device?.status === 'locked' || false;
        let mappedStatus: AbnormalWorkOrder['status'];
        if (wo.status === 'completed' || wo.status === 'closed') {
          mappedStatus = 'resolved';
        } else if (wo.status === 'pending' || wo.status === 'processing' || wo.status === 'upgraded') {
          mappedStatus = wo.status;
        } else {
          mappedStatus = 'pending';
        }
        let parameter = wo.parameter;
        if (!parameter) {
          const match = wo.description?.match(/COD|氨氮|流量/);
          parameter = match?.[0] ?? '指标';
        }
        return {
          id: wo.id,
          time: formatDateTime(wo.createdAt),
          stageName: stage?.name ?? '未知',
          parameter,
          value: wo.value,
          threshold: wo.threshold,
          deviceLocked,
          status: mappedStatus,
          overdueHours,
          escalated,
          escalationNote: wo.upgradeReason,
          handler: wo.assigneeId ?? wo.reporterId ?? '未指派',
        };
      });
  }, [workOrders, stages, devices]);

  const lockedDevicesCount = abnormalOrders.filter((o) => o.deviceLocked).length;

  const abnormalColumns: DataTableColumn<AbnormalWorkOrder>[] = [
    {
      key: 'time',
      title: '时间',
      width: 130,
    },
    {
      key: 'stageName',
      title: '工艺段',
      width: 90,
      render: (v) => (
        <span className="text-water-cyan">{v as string}</span>
      ),
    },
    {
      key: 'parameter',
      title: '超标指标',
      width: 90,
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-water-red" />
          <span className="text-water-red font-medium">{v as string}</span>
          <span className="text-slate-500 text-xs">
            {row.value}/{row.threshold}
          </span>
        </div>
      ),
    },
    {
      key: 'value',
      title: '数值',
      width: 100,
      render: (v, row) => (
        <div className="text-left">
          <div className={cn(
            'data-number font-bold',
            row.value > row.threshold ? 'text-water-red blink-animation' : 'text-water-green',
          )}>
            {v as number}
          </div>
          <div className="text-xs text-slate-500">阈值: {row.threshold}</div>
        </div>
      ),
    },
    {
      key: 'deviceLocked',
      title: '设备锁定',
      width: 100,
      align: 'center',
      render: (v) => (
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          v
            ? 'bg-water-red/15 text-water-red border border-water-red/30'
            : 'bg-water-green/15 text-water-green border border-water-green/30',
        )}>
          {v ? <Lock size={12} /> : <Unlock size={12} />}
          {v ? '已锁定' : '未锁定'}
        </div>
      ),
    },
    {
      key: 'status',
      title: '处置状态',
      width: 100,
      render: (v) => {
        const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'alarm'> = {
          pending: 'pending',
          processing: 'processing',
          upgraded: 'alarm',
          resolved: 'completed',
        };
        const labelMap: Record<string, string> = {
          pending: '待处理',
          processing: '处理中',
          upgraded: '已升级',
          resolved: '已解决',
        };
        return (
          <StatusBadge
            status={statusMap[v as string] ?? 'pending'}
            text={labelMap[v as string]}
            pulse={v === 'upgraded'}
          />
        );
      },
    },
    {
      key: 'overdueHours',
      title: '超时时长',
      width: 110,
      render: (v, row) => (
        <div className={cn(
          'flex items-center gap-1',
          row.escalated ? 'text-water-red font-bold' : (v as number) > 12 ? 'text-water-orange' : 'text-slate-400',
        )}>
          <Clock size={12} />
          <span className="data-number">{v as number}h</span>
          {row.escalated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-water-red/20 text-water-red border border-water-red/30 ml-1">
              升级
            </span>
          )}
        </div>
      ),
    },
  ];

  const tabs: { key: SewageTab; label: string }[] = [
    { key: 'overview', label: '工艺总览' },
    { key: 'abnormal', label: '异常工单' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-water-cyan">污水处理</span>监控中心
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock size={14} />
            <span>最后更新: {formatTime(Date.now())}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-water-cyan/20 to-water-teal/20 text-water-cyan border border-water-cyan/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent',
            )}
          >
            {tab.label}
            {tab.key === 'abnormal' && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-water-red/20 text-water-red text-[10px] border border-water-red/30">
                {abnormalOrders.filter((o) => o.status !== 'resolved').length}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-water-cyan to-water-teal rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="glass-card corner-deco rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Zap size={18} className="text-water-cyan" />
              <h2 className="text-lg font-semibold text-white">污水处理工艺流程</h2>
              <span className="text-xs text-slate-500 ml-2">实时监测各工艺段关键指标</span>
            </div>

            <div className="flex items-stretch gap-2 overflow-x-auto pb-4">
              {processStages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center shrink-0">
                  <div
                    className={cn(
                      'relative w-44 rounded-xl overflow-hidden transition-all duration-300',
                      stage.isAlarm && 'ring-2 ring-water-red/60',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute -inset-px opacity-30 rounded-xl blur-sm',
                        stage.isAlarm
                          ? 'bg-gradient-to-br from-water-red to-water-orange'
                          : 'bg-gradient-to-br from-water-cyan to-water-teal',
                      )}
                    />
                    <div
                      className={cn(
                        'relative glass-card p-4 rounded-xl h-full',
                        stage.isAlarm && 'border-water-red/40',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center',
                            stage.isAlarm
                              ? 'bg-gradient-to-br from-water-red to-water-orange text-white'
                              : 'bg-gradient-to-br from-water-cyan to-water-teal text-water-deep',
                          )}
                        >
                          {stage.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{stage.name}</div>
                          {stage.isAlarm && (
                            <div className="text-[10px] text-water-red blink-animation flex items-center gap-0.5">
                              <AlertTriangle size={10} />
                              超标
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">COD</span>
                          <span
                            className={cn(
                              'data-number font-semibold',
                              stage.isAlarm && stage.cod > COD_THRESHOLD
                                ? 'text-water-red blink-animation'
                                : 'text-water-green',
                            )}
                          >
                            {stage.cod.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">氨氮</span>
                          <span
                            className={cn(
                              'data-number font-semibold',
                              stage.isAlarm && stage.ammoniaNitrogen > AMMONIA_THRESHOLD
                                ? 'text-water-red blink-animation'
                                : 'text-water-green',
                            )}
                          >
                            {stage.ammoniaNitrogen.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">去除率</span>
                          <span className="data-number font-semibold text-water-teal">
                            <TrendingUp size={10} className="inline mr-0.5" />
                            {stage.codRemoval.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">流量</span>
                          <span className="data-number font-semibold text-water-cyan">
                            {stage.flow.toFixed(0)} m³/h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {idx < processStages.length - 1 && (
                    <div className="mx-1 flex items-center">
                      <ArrowRight
                        size={20}
                        className={cn(
                          'text-water-cyan/60',
                          stage.isAlarm && 'text-water-red/60',
                        )}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '进水COD', value: 368.2, unit: 'mg/L', color: 'cyan' as const, trend: 2.3 },
              { label: '出水COD', value: 45.6, unit: 'mg/L', color: 'green' as const, trend: -5.1 },
              { label: '进水氨氮', value: 34.5, unit: 'mg/L', color: 'yellow' as const, trend: 1.2 },
              { label: '出水氨氮', value: 2.8, unit: 'mg/L', color: 'teal' as const, trend: -8.5 },
            ].map((stat, idx) => (
              <div key={idx} className="glass-card corner-deco rounded-xl p-4">
                <div className="text-sm text-slate-400 mb-1">{stat.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold data-number text-water-cyan glow-text">
                    {stat.value}
                  </span>
                  <span className="text-xs text-slate-500">{stat.unit}</span>
                </div>
                <div className={cn(
                  'mt-2 text-xs flex items-center gap-1',
                  stat.trend >= 0 ? 'text-water-red' : 'text-water-green',
                )}>
                  {stat.trend >= 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingUp size={12} className="rotate-180" />
                  )}
                  {Math.abs(stat.trend)}% 较昨日
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'abnormal' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card corner-deco rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-water-red/15 flex items-center justify-center border border-water-red/30">
                <AlertTriangle size={22} className="text-water-red" />
              </div>
              <div>
                <div className="text-2xl font-bold data-number text-water-red glow-text">
                  {abnormalOrders.filter((o) => o.status !== 'resolved').length}
                </div>
                <div className="text-xs text-slate-400">待处理工单</div>
              </div>
            </div>
            <div className="glass-card corner-deco rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-water-orange/15 flex items-center justify-center border border-water-orange/30">
                <Lock size={22} className="text-water-orange" />
              </div>
              <div>
                <div className="text-2xl font-bold data-number text-water-orange glow-text">
                  {lockedDevicesCount}
                </div>
                <div className="text-xs text-slate-400">已锁定设备</div>
              </div>
            </div>
            <div className="glass-card corner-deco rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-water-purple/15 flex items-center justify-center border border-water-purple/30">
                <UploadCloud size={22} className="text-water-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold data-number text-water-purple glow-text">
                  {abnormalOrders.filter((o) => o.escalated).length}
                </div>
                <div className="text-xs text-slate-400">已升级工单</div>
              </div>
            </div>
            <div className="glass-card corner-deco rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-water-green/15 flex items-center justify-center border border-water-green/30">
                <Shield size={22} className="text-water-green" />
              </div>
              <div>
                <div className="text-2xl font-bold data-number text-water-green glow-text">
                  {abnormalOrders.filter((o) => o.status === 'resolved').length}
                </div>
                <div className="text-xs text-slate-400">已解决</div>
              </div>
            </div>
          </div>

          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} className="text-water-orange" />
              <h3 className="text-base font-semibold text-white">超标设备锁定状态</h3>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {abnormalOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    'relative glass-card rounded-lg p-3 transition-all',
                    order.deviceLocked
                      ? 'border-water-red/40'
                      : 'border-water-green/30',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{order.stageName}</span>
                    {order.deviceLocked ? (
                      <Lock size={14} className="text-water-red blink-animation" />
                    ) : (
                      <Unlock size={14} className="text-water-green" />
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {order.parameter}超标
                  </div>
                  <div className={cn(
                    'mt-1 text-xs font-medium data-number',
                    order.deviceLocked ? 'text-water-red' : 'text-water-green',
                  )}>
                    {order.deviceLocked ? '安全锁定中' : '已解锁'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <DataTable<AbnormalWorkOrder>
              columns={abnormalColumns}
              data={abnormalOrders}
              rowKey="id"
              onRowClick={(row) => {
                setExpandedOrderId(expandedOrderId === row.id ? null : row.id);
              }}
              rowClassName={(row) =>
                cn(
                  row.escalated && 'bg-water-red/5',
                )
              }
            />
            {expandedOrderId && (() => {
              const order = abnormalOrders.find((o) => o.id === expandedOrderId);
              if (!order || !order.escalated) return null;
              return (
                <div className="mt-2 glass-card rounded-xl p-4 border-water-purple/30">
                  <div className="flex items-center gap-2 mb-2">
                    <UploadCloud size={16} className="text-water-purple" />
                    <span className="text-sm font-semibold text-water-purple">升级记录</span>
                  </div>
                  <div className="text-sm text-slate-300">{order.escalationNote}</div>
                  <div className="mt-2 text-xs text-slate-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      当前处理人: {order.handler}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      已超时 {order.overdueHours} 小时
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
