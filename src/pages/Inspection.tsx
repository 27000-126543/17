import { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  Calendar,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Droplets,
  Wrench,
  MoreHorizontal,
  Play,
  ArrowUpCircle,
  XCircle,
  FileText,
  Camera,
  Upload,
  UploadCloud,
  ArrowLeft,
  Zap,
  Clock3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/common/StatusBadge';
import {
  useInspectionStore,
  type InspectionTask as StoreInspectionTask,
  type WorkOrder as StoreWorkOrder,
} from '@/stores/inspectionStore';
import { authApi, inspectionApi } from '@/lib/api';
import type { User } from '@/types';

type InspectionTab = 'tasks' | 'workorders' | 'detail';

interface ExtendedInspectionTask extends StoreInspectionTask {
  inspectorName: string;
  date: string;
  checkPoints: (StoreInspectionTask['checkPoints'][number] & {
    checkTime?: number | null;
    photos: string[];
  })[];
}

interface ExtendedWorkOrder extends Omit<StoreWorkOrder, 'photos'> {
  reporterName: string;
  assigneeName: string;
  overdueHours: number;
  autoUpgraded: boolean;
  location: string;
  photos: string[];
  repairPhotos: string[];
  closedAt: number | null;
  upgradeCount: number;
}

const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  leak: { label: '漏损', icon: <Droplets size={14} />, color: 'text-water-cyan' },
  device: { label: '设备', icon: <Wrench size={14} />, color: 'text-water-orange' },
  equipment: { label: '设备', icon: <Wrench size={14} />, color: 'text-water-orange' },
  sewage: { label: '污水', icon: <MoreHorizontal size={14} />, color: 'text-water-purple' },
  meter: { label: '水表', icon: <MoreHorizontal size={14} />, color: 'text-water-purple' },
  other: { label: '其他', icon: <MoreHorizontal size={14} />, color: 'text-water-purple' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: '紧急', color: 'text-water-red', bg: 'bg-water-red', border: 'border-water-red' },
  high: { label: '高', color: 'text-water-orange', bg: 'bg-water-orange', border: 'border-water-orange' },
  medium: { label: '中', color: 'text-water-yellow', bg: 'bg-water-yellow', border: 'border-water-yellow' },
  low: { label: '低', color: 'text-water-cyan', bg: 'bg-water-cyan', border: 'border-water-cyan' },
};

const statusLabels: Record<string, { label: string; type: 'pending' | 'processing' | 'completed' | 'alarm' | 'warning' }> = {
  pending: { label: '待接单', type: 'pending' },
  assigned: { label: '已指派', type: 'warning' },
  processing: { label: '处理中', type: 'processing' },
  completed: { label: '已完成', type: 'completed' },
  upgraded: { label: '已升级', type: 'alarm' },
  closed: { label: '已关闭', type: 'completed' },
  in_progress: { label: '进行中', type: 'processing' },
  overdue: { label: '已超时', type: 'alarm' },
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function getOverdueHours(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 3600000);
}

function getUserName(users: User[], userId?: string): string {
  if (!userId) return '-';
  return users.find((u) => u.id === userId)?.name || '-';
}

export default function Inspection() {
  const [activeTab, setActiveTab] = useState<InspectionTab>('tasks');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const {
    tasks,
    workOrders,
    fetchAll,
    selectWorkOrder,
    selectedWorkOrderId,
    completeWorkOrder,
    upgradeWorkOrder,
  } = useInspectionStore();

  const [taskDateFilter, setTaskDateFilter] = useState<string>('');
  const [taskAreaFilter, setTaskAreaFilter] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');

  const [woPriorityFilter, setWoPriorityFilter] = useState<string>('');
  const [woStatusFilter, setWoStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchAll();
    authApi.getUsers().then((res) => {
      if (res.success && res.data) {
        setUsers(res.data as User[]);
      }
    });
  }, [fetchAll]);

  const extendedTasks = useMemo<ExtendedInspectionTask[]>(() => {
    return tasks.map((t) => ({
      ...t,
      inspectorName: getUserName(users, t.inspectorId),
      date: formatDate(t.createdAt),
      checkPoints: t.checkPoints.map((cp) => ({
        ...cp,
        checkTime: cp.checkedAt ?? null,
        photos: cp.photoUrl ? [cp.photoUrl] : [],
      })),
    }));
  }, [tasks, users]);

  const extendedWorkOrders = useMemo<ExtendedWorkOrder[]>(() => {
    return workOrders.map((wo) => {
      const overdue = getOverdueHours(wo.createdAt);
      const beforePhotos = wo.photos?.before || [];
      const afterPhotos = wo.photos?.after || [];
      return {
        ...wo,
        reporterName: getUserName(users, wo.reporterId),
        assigneeName: getUserName(users, wo.assigneeId),
        overdueHours: overdue,
        autoUpgraded: overdue > 48 || !!wo.upgradedTo,
        location: wo.area,
        photos: beforePhotos,
        repairPhotos: afterPhotos,
        closedAt: wo.completedAt ?? null,
        upgradeCount: wo.upgradedTo ? 1 : 0,
      };
    });
  }, [workOrders, users]);

  const filteredTasks = useMemo(() => {
    return extendedTasks.filter((t) => {
      if (taskDateFilter && t.date !== taskDateFilter) return false;
      if (taskAreaFilter && t.area !== taskAreaFilter) return false;
      if (taskStatusFilter && t.status !== taskStatusFilter) return false;
      return true;
    });
  }, [extendedTasks, taskDateFilter, taskAreaFilter, taskStatusFilter]);

  const filteredWorkOrders = useMemo(() => {
    return extendedWorkOrders.filter((wo) => {
      if (woPriorityFilter && wo.priority !== woPriorityFilter) return false;
      if (woStatusFilter && wo.status !== woStatusFilter) return false;
      return true;
    });
  }, [extendedWorkOrders, woPriorityFilter, woStatusFilter]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return extendedWorkOrders.find((wo) => wo.id === selectedWorkOrderId);
  }, [selectedWorkOrderId, extendedWorkOrders]);

  const areas = Array.from(new Set(extendedTasks.map((t) => t.area)));
  const dates = Array.from(new Set(extendedTasks.map((t) => t.date))).sort();

  const tabs: { key: InspectionTab; label: string }[] = [
    { key: 'tasks', label: '任务中心' },
    { key: 'workorders', label: '工单管理' },
    { key: 'detail', label: '工单详情' },
  ];

  const handleAcceptWorkOrder = async (id: string) => {
    const res = await inspectionApi.updateWorkOrder(id, { status: 'assigned' });
    if (res.success) {
      useInspectionStore.getState().fetchWorkOrders();
    }
  };

  const handleStartProcessing = async (id: string) => {
    const res = await inspectionApi.updateWorkOrder(id, { status: 'processing' });
    if (res.success) {
      useInspectionStore.getState().fetchWorkOrders();
    }
  };

  const handleUpgradeWorkOrder = async (id: string) => {
    await upgradeWorkOrder(id, '手动升级处理');
  };

  const handleCloseWorkOrder = async (id: string) => {
    const wo = extendedWorkOrders.find((w) => w.id === id);
    await completeWorkOrder(id, wo?.photos, wo?.repairPhotos);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-water-cyan">巡检管理</span>系统
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock size={14} />
            <span>{new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key !== 'detail') selectWorkOrder('');
            }}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-water-cyan/20 to-water-teal/20 text-water-cyan border border-water-cyan/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent',
            )}
          >
            {tab.label}
            {tab.key === 'workorders' && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-water-orange/20 text-water-orange text-[10px] border border-water-orange/30">
                {extendedWorkOrders.filter((wo) => wo.status !== 'closed' && wo.status !== 'completed').length}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-water-cyan to-water-teal rounded-full" />
            )}
          </button>
        ))}
        {activeTab === 'detail' && selectedWorkOrder && (
          <button
            onClick={() => {
              setActiveTab('workorders');
              selectWorkOrder('');
            }}
            className="ml-auto flex items-center gap-1 text-sm text-water-cyan hover:text-water-teal transition-colors"
          >
            <ArrowLeft size={14} />
            返回工单列表
          </button>
        )}
      </div>

      {activeTab === 'tasks' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-water-cyan" />
                <span className="text-sm text-slate-300">筛选:</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <select
                  value={taskDateFilter}
                  onChange={(e) => setTaskDateFilter(e.target.value)}
                  className="bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                >
                  <option value="">全部日期</option>
                  {dates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <select
                  value={taskAreaFilter}
                  onChange={(e) => setTaskAreaFilter(e.target.value)}
                  className="bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                >
                  <option value="">全部区域</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-slate-400" />
                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                >
                  <option value="">全部状态</option>
                  <option value="pending">待开始</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="overdue">已超时</option>
                </select>
              </div>
              <div className="ml-auto text-sm text-slate-400">
                共 <span className="text-water-cyan font-semibold data-number">{filteredTasks.length}</span> 个任务
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 overflow-auto">
            {filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const checkedCount = task.checkPoints.filter((cp) => cp.checked).length;
              const totalCount = task.checkPoints.length;
              const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
              return (
                <div
                  key={task.id}
                  className="glass-card corner-deco rounded-xl overflow-hidden transition-all duration-300"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-water-cyan/5 transition-colors"
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center text-water-deep">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {task.title || `${task.area}巡检任务`}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {task.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {task.area}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const st = statusLabels[task.status] || statusLabels.pending;
                          return <StatusBadge status={st.type} text={st.label} pulse={task.status === 'overdue'} />;
                        })()}
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <UserIcon size={11} />
                        <span>巡线员: {task.inspectorName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-water-dark rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            task.status === 'completed'
                              ? 'bg-gradient-to-r from-water-green to-water-teal'
                              : 'bg-gradient-to-r from-water-cyan to-water-teal',
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300 data-number font-medium whitespace-nowrap">
                        {checkedCount} / {totalCount}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-water-cyan/10 p-4 bg-water-dark/30">
                      <div className="text-xs text-slate-400 mb-3">检查点详情</div>
                      <div className="grid grid-cols-2 gap-2">
                        {task.checkPoints.map((cp) => (
                          <div
                            key={cp.id}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg text-xs transition-all',
                              cp.checked ? 'bg-water-green/10' : 'bg-water-dark/60',
                            )}
                          >
                            {cp.checked ? (
                              <CheckCircle2 size={14} className="text-water-green shrink-0" />
                            ) : (
                              <Circle size={14} className="text-slate-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                'truncate',
                                cp.checked ? 'text-slate-200' : 'text-slate-400',
                              )}>
                                {cp.name}
                              </div>
                              {cp.checked && cp.checkTime && (
                                <div className="text-[10px] text-water-teal flex items-center gap-0.5 mt-0.5">
                                  <Clock3 size={9} />
                                  {formatTimestamp(cp.checkTime)}
                                </div>
                              )}
                            </div>
                            {cp.photos && cp.photos.length > 0 && (
                              <div className="w-7 h-7 rounded bg-water-cyan/10 flex items-center justify-center shrink-0">
                                <ImageIcon size={12} className="text-water-cyan" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'workorders' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-water-cyan" />
                <span className="text-sm text-slate-300">筛选:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">紧急程度</span>
                <select
                  value={woPriorityFilter}
                  onChange={(e) => setWoPriorityFilter(e.target.value)}
                  className="bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                >
                  <option value="">全部</option>
                  <option value="urgent">紧急</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">状态</span>
                <select
                  value={woStatusFilter}
                  onChange={(e) => setWoStatusFilter(e.target.value)}
                  className="bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                >
                  <option value="">全部</option>
                  <option value="pending">待接单</option>
                  <option value="assigned">已指派</option>
                  <option value="processing">处理中</option>
                  <option value="upgraded">已升级</option>
                  <option value="closed">已关闭</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div className="ml-auto text-sm text-slate-400">
                共 <span className="text-water-cyan font-semibold data-number">{filteredWorkOrders.length}</span> 条工单
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 overflow-auto">
            {filteredWorkOrders.map((wo) => {
              const pri = priorityConfig[wo.priority] || priorityConfig.low;
              const type = typeLabels[wo.type] || typeLabels.other;
              const st = statusLabels[wo.status] || statusLabels.pending;
              const timeLeft = Math.max(0, 48 - wo.overdueHours);
              return (
                <div
                  key={wo.id}
                  className="glass-card rounded-xl overflow-hidden flex transition-all duration-300 hover:border-water-cyan/30 cursor-pointer"
                  onClick={() => {
                    selectWorkOrder(wo.id);
                    setActiveTab('detail');
                  }}
                >
                  <div className={cn('w-1 shrink-0', pri.bg)} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
                          'bg-water-cyan/10 border border-water-cyan/20',
                          type.color,
                        )}>
                          {type.icon}
                          {type.label}
                        </span>
                        {wo.autoUpgraded && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-water-purple/15 text-water-purple border border-water-purple/30">
                            <ArrowUpCircle size={10} />
                            自动升级
                          </span>
                        )}
                      </div>
                      <StatusBadge status={st.type} text={st.label} pulse={wo.status === 'upgraded'} />
                    </div>

                    <div className="font-medium text-white text-sm mb-1.5">{wo.description}</div>

                    <div className="space-y-1 text-xs text-slate-400 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} />
                        <span className="truncate">{wo.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <UserIcon size={10} />
                          上报: {wo.reporterName}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon size={10} />
                          处理: {wo.assigneeName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTimestamp(wo.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        timeLeft <= 12 ? 'text-water-red' : timeLeft <= 24 ? 'text-water-orange' : 'text-slate-400',
                      )}>
                        <Clock3 size={11} />
                        {wo.status === 'closed' || wo.status === 'completed' ? (
                          <span>已完成</span>
                        ) : (
                          <span>
                            {wo.overdueHours >= 48 ? (
                              <span className="text-water-red font-medium blink-animation">超时 {wo.overdueHours - 48}h</span>
                            ) : (
                              <span>剩余 <span className="data-number font-medium">{timeLeft}h</span></span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {wo.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptWorkOrder(wo.id);
                            }}
                            className="px-2.5 py-1 rounded text-[11px] bg-water-cyan/20 text-water-cyan border border-water-cyan/30 hover:bg-water-cyan/30 transition-colors flex items-center gap-1"
                          >
                            <Play size={10} />
                            接单
                          </button>
                        )}
                        {(wo.status === 'assigned' || wo.status === 'processing') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartProcessing(wo.id);
                            }}
                            className="px-2.5 py-1 rounded text-[11px] bg-water-teal/20 text-water-teal border border-water-teal/30 hover:bg-water-teal/30 transition-colors flex items-center gap-1"
                          >
                            <Wrench size={10} />
                            处理
                          </button>
                        )}
                        {wo.status !== 'closed' && wo.status !== 'completed' && wo.status !== 'upgraded' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgradeWorkOrder(wo.id);
                            }}
                            className="px-2.5 py-1 rounded text-[11px] bg-water-purple/20 text-water-purple border border-water-purple/30 hover:bg-water-purple/30 transition-colors flex items-center gap-1"
                          >
                            <ArrowUpCircle size={10} />
                            升级
                          </button>
                        )}
                        {wo.status !== 'closed' && wo.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseWorkOrder(wo.id);
                            }}
                            className="px-2.5 py-1 rounded text-[11px] bg-water-green/20 text-water-green border border-water-green/30 hover:bg-water-green/30 transition-colors flex items-center gap-1"
                          >
                            <XCircle size={10} />
                            关闭
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'detail' && selectedWorkOrder && (() => {
        const pri = priorityConfig[selectedWorkOrder.priority] || priorityConfig.low;
        const type = typeLabels[selectedWorkOrder.type] || typeLabels.other;
        const st = statusLabels[selectedWorkOrder.status] || statusLabels.pending;
        return (
          <div className="flex-1 grid grid-cols-5 gap-4 overflow-auto">
            <div className="col-span-3 flex flex-col gap-4">
              <div className="glass-card corner-deco rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                        'bg-water-cyan/10 border border-water-cyan/20',
                        type.color,
                      )}>
                        {type.icon}
                        {type.label}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                        `bg-${pri.bg}/15`,
                        pri.color,
                        `border ${pri.border}/30`,
                      )}>
                        <AlertTriangle size={10} />
                        {pri.label}
                      </span>
                      {selectedWorkOrder.autoUpgraded && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-water-purple/15 text-water-purple border border-water-purple/30">
                          <ArrowUpCircle size={10} />
                          超48h自动升级
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedWorkOrder.description}</h2>
                  </div>
                  <StatusBadge status={st.type} text={st.label} pulse={selectedWorkOrder.status === 'upgraded'} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-water-cyan" />
                      <span className="text-slate-400 w-16">位置:</span>
                      <span className="text-slate-200">{selectedWorkOrder.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-water-cyan" />
                      <span className="text-slate-400 w-16">上报人:</span>
                      <span className="text-slate-200">{selectedWorkOrder.reporterName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-water-cyan" />
                      <span className="text-slate-400 w-16">指派给:</span>
                      <span className="text-slate-200">{selectedWorkOrder.assigneeName}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-water-cyan" />
                      <span className="text-slate-400 w-16">创建时间:</span>
                      <span className="text-slate-200">{formatTimestamp(selectedWorkOrder.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={14} className="text-water-cyan" />
                      <span className="text-slate-400 w-16">已耗时:</span>
                      <span className={cn(
                        'data-number font-medium',
                        selectedWorkOrder.overdueHours > 48 ? 'text-water-red' : selectedWorkOrder.overdueHours > 24 ? 'text-water-orange' : 'text-water-cyan',
                      )}>
                        {selectedWorkOrder.overdueHours} 小时
                      </span>
                    </div>
                    {selectedWorkOrder.upgradeCount > 0 && (
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle size={14} className="text-water-purple" />
                        <span className="text-slate-400 w-16">升级次数:</span>
                        <span className="text-water-purple font-medium data-number">{selectedWorkOrder.upgradeCount} 次</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-card corner-deco rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Camera size={16} className="text-water-cyan" />
                  <h3 className="text-base font-semibold text-white">现场照片</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {selectedWorkOrder.photos.length > 0 ? selectedWorkOrder.photos.map((photo, idx) => (
                    <div key={idx} className="aspect-video rounded-lg bg-water-dark/80 border border-water-cyan/15 flex items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-water-cyan/5 to-water-teal/5" />
                      <div className="relative flex flex-col items-center gap-1 text-slate-500 group-hover:text-water-cyan/60 transition-colors">
                        <ImageIcon size={28} />
                        <span className="text-xs">{photo}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-3 text-center text-slate-500 text-sm py-4">暂无现场照片</div>
                  )}
                </div>
              </div>

              <div className="glass-card corner-deco rounded-xl p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-water-cyan" />
                  <h3 className="text-base font-semibold text-white">处置记录</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-water-cyan/20 border border-water-cyan/40 flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-water-cyan" />
                      </div>
                      <div className="w-px flex-1 bg-water-cyan/20 mt-1" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-sm text-white">工单创建</div>
                      <div className="text-xs text-slate-500 mt-0.5">{selectedWorkOrder.reporterName} · {formatTimestamp(selectedWorkOrder.createdAt)}</div>
                      <div className="mt-1.5 text-xs text-slate-400">{selectedWorkOrder.description}</div>
                    </div>
                  </div>
                  {selectedWorkOrder.assigneeId && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-water-teal/20 border border-water-teal/40 flex items-center justify-center">
                          <UserIcon size={12} className="text-water-teal" />
                        </div>
                        <div className="w-px flex-1 bg-water-cyan/20 mt-1" />
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="text-sm text-white">工单指派</div>
                        <div className="text-xs text-slate-500 mt-0.5">系统 · {formatTimestamp(selectedWorkOrder.createdAt + 3600000)}</div>
                        <div className="mt-1.5 text-xs text-slate-400">已指派给 {selectedWorkOrder.assigneeName}</div>
                      </div>
                    </div>
                  )}
                  {selectedWorkOrder.autoUpgraded && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-water-purple/20 border border-water-purple/40 flex items-center justify-center">
                          <ArrowUpCircle size={12} className="text-water-purple" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-water-purple font-medium">工单自动升级</div>
                        <div className="text-xs text-slate-500 mt-0.5">系统 · {formatTimestamp(selectedWorkOrder.createdAt + 48 * 3600000)}</div>
                        <div className="mt-1.5 text-xs text-slate-400">已超过48小时未处理，自动升级至集团技术中心</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-4">
              <div className="glass-card corner-deco rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Upload size={16} className="text-water-cyan" />
                  <h3 className="text-base font-semibold text-white">修复前后对比图</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-2">修复前</div>
                    {selectedWorkOrder.photos.length > 0 ? (
                      <div className="aspect-square rounded-lg bg-water-dark/80 border border-water-red/20 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-water-red/5 to-transparent" />
                        <div className="relative flex flex-col items-center gap-1 text-slate-500">
                          <ImageIcon size={24} />
                          <span className="text-[10px]">修复前照片</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg bg-water-dark/40 border border-dashed border-water-cyan/20 flex flex-col items-center justify-center text-slate-500 gap-1.5">
                        <Upload size={20} />
                        <span className="text-xs">上传照片</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-2">修复后</div>
                    {selectedWorkOrder.repairPhotos && selectedWorkOrder.repairPhotos.length > 0 ? (
                      <div className="aspect-square rounded-lg bg-water-dark/80 border border-water-green/20 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-water-green/5 to-transparent" />
                        <div className="relative flex flex-col items-center gap-1 text-slate-500">
                          <ImageIcon size={24} />
                          <span className="text-[10px]">修复后照片</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg bg-water-dark/40 border border-dashed border-water-cyan/20 flex flex-col items-center justify-center text-slate-500 gap-1.5 cursor-pointer hover:border-water-cyan/40 hover:text-water-cyan/60 transition-colors">
                        <Upload size={20} />
                        <span className="text-xs">点击上传</span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedWorkOrder.status !== 'closed' && selectedWorkOrder.status !== 'completed' && (
                  <button className="mt-4 w-full btn-primary text-sm flex items-center justify-center gap-1.5">
                    <UploadCloud size={14} />
                    上传修复记录
                  </button>
                )}
              </div>

              <div className="glass-card corner-deco rounded-xl p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-water-cyan" />
                  <h3 className="text-base font-semibold text-white">快捷操作</h3>
                </div>
                <div className="space-y-2.5">
                  {selectedWorkOrder.status === 'pending' && (
                    <button
                      onClick={() => handleAcceptWorkOrder(selectedWorkOrder.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-water-cyan/20 text-water-cyan border border-water-cyan/30 hover:bg-water-cyan/30 transition-colors text-sm font-medium"
                    >
                      <Play size={14} />
                      接 单
                    </button>
                  )}
                  {(selectedWorkOrder.status === 'assigned' || selectedWorkOrder.status === 'processing') && (
                    <button
                      onClick={() => handleStartProcessing(selectedWorkOrder.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-water-teal/20 text-water-teal border border-water-teal/30 hover:bg-water-teal/30 transition-colors text-sm font-medium"
                    >
                      <Wrench size={14} />
                      开始处理
                    </button>
                  )}
                  {selectedWorkOrder.status !== 'closed' && selectedWorkOrder.status !== 'completed' && selectedWorkOrder.status !== 'upgraded' && (
                    <button
                      onClick={() => handleUpgradeWorkOrder(selectedWorkOrder.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-water-purple/20 text-water-purple border border-water-purple/30 hover:bg-water-purple/30 transition-colors text-sm font-medium"
                    >
                      <ArrowUpCircle size={14} />
                      申请升级
                    </button>
                  )}
                  {selectedWorkOrder.status !== 'closed' && selectedWorkOrder.status !== 'completed' && (
                    <button
                      onClick={() => handleCloseWorkOrder(selectedWorkOrder.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-water-green/20 text-water-green border border-water-green/30 hover:bg-water-green/30 transition-colors text-sm font-medium"
                    >
                      <CheckCircle2 size={14} />
                      关 闭 工 单
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'detail' && !selectedWorkOrder && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>请从工单列表选择一个工单查看详情</p>
          </div>
        </div>
      )}
    </div>
  );
}
