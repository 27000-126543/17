import { useState } from 'react';
import {
  Users,
  Settings2,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Shield,
  User as UserIcon,
  MapPin,
  Factory,
  Activity,
  Droplets,
  DollarSign,
  Clock3,
  AlertCircle,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { users as mockUsers } from '@/mock/data';
import type { User, UserRole } from '@/types';

type SettingsTab = 'users' | 'rules';

interface ExtendedUser extends User {
  status: 'active' | 'disabled';
  plantName: string;
}

const roleLabels: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  admin: { label: '系统管理员', color: 'text-water-purple', bg: 'bg-water-purple/15', border: 'border-water-purple/30' },
  plant_leader: { label: '水厂负责人', color: 'text-water-orange', bg: 'bg-water-orange/15', border: 'border-water-orange/30' },
  dispatcher: { label: '调度员', color: 'text-water-cyan', bg: 'bg-water-cyan/15', border: 'border-water-cyan/30' },
  inspector: { label: '巡检员', color: 'text-water-teal', bg: 'bg-water-teal/15', border: 'border-water-teal/30' },
};

const plantNames: Record<string, string> = {
  p001: '浦东水厂',
  p002: '徐汇水厂',
};

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  accent = 'cyan',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  accent?: 'cyan' | 'teal' | 'green' | 'yellow' | 'orange' | 'purple' | 'red';
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const accentMap: Record<string, string> = {
    cyan: 'from-water-cyan to-water-cyan',
    teal: 'from-water-teal to-water-teal',
    green: 'from-water-green to-water-green',
    yellow: 'from-water-yellow to-water-yellow',
    orange: 'from-water-orange to-water-orange',
    purple: 'from-water-purple to-water-purple',
    red: 'from-water-red to-water-red',
  };
  const trackGradient = accentMap[accent] || accentMap.cyan;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex items-center gap-1">
          <span className={cn(
            'data-number font-bold text-sm',
            `text-water-${accent}`,
          )}>
            {value}
          </span>
          {unit && <span className="text-xs text-slate-500">{unit}</span>}
        </div>
      </div>
      <div className="relative">
        <div className="h-1.5 bg-water-dark rounded-full overflow-hidden">
          <div
            className={cn('h-full bg-gradient-to-r rounded-full', trackGradient)}
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-water-deep shadow-lg transition-all pointer-events-none',
            `border-water-${accent}`,
          )}
          style={{ left: `calc(${percent}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);

  const [users, setUsers] = useState<ExtendedUser[]>(
    mockUsers.map((u, i) => ({
      ...u,
      status: i < 6 ? 'active' : 'disabled',
      plantName: plantNames[u.plantId] || '-',
    })),
  );

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'inspector' as UserRole,
    area: '',
    plantId: 'p001',
    status: 'active' as 'active' | 'disabled',
  });

  const [waterQualityRules, setWaterQualityRules] = useState({
    codMin: 0,
    codMax: 50,
    ammoniaMin: 0,
    ammoniaMax: 5,
    turbidityMin: 0,
    turbidityMax: 1,
    phMin: 6.5,
    phMax: 8.5,
    residualChlorineMin: 0.3,
    residualChlorineMax: 4,
  });

  const [tieredPricing, setTieredPricing] = useState({
    tier1Limit: 15,
    tier1Price: 3.5,
    tier2Limit: 30,
    tier2Price: 5.25,
    tier3Price: 7.0,
  });

  const [escalationRules, setEscalationRules] = useState({
    inspectionHours: 48,
    sewageHours: 24,
  });

  const [dunningRules, setDunningRules] = useState({
    lateFeeRate: 0.5,
    dunningCycle: 7,
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name.includes(searchTerm) ||
      u.username.includes(searchTerm) ||
      u.area.includes(searchTerm),
  );

  const userColumns: DataTableColumn<ExtendedUser>[] = [
    {
      key: 'username',
      title: '账号',
      width: 120,
      render: (v) => (
        <span className="font-mono text-sm text-water-cyan">{v as string}</span>
      ),
    },
    {
      key: 'name',
      title: '姓名',
      width: 100,
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-water-cyan/30 to-water-teal/30 flex items-center justify-center text-xs">
            {(v as string).charAt(0)}
          </div>
          <span className="text-slate-200">{v as string}</span>
        </div>
      ),
    },
    {
      key: 'role',
      title: '角色',
      width: 120,
      render: (v) => {
        const role = roleLabels[v as UserRole] || roleLabels.inspector;
        return (
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
            role.bg, role.color, role.border,
          )}>
            {role.label}
          </span>
        );
      },
    },
    {
      key: 'area',
      title: '负责区域/水厂',
      render: (_v, row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-slate-300">
            <MapPin size={11} className="text-water-cyan" />
            {row.area}
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
            <Factory size={10} />
            {row.plantName}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      align: 'center',
      render: (v) => (
        <StatusBadge
          status={v === 'active' ? 'normal' : 'offline'}
          text={v === 'active' ? '启用' : '停用'}
          pulse={v === 'active'}
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 140,
      align: 'center',
      render: (_v, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => {
              setEditingUser(row);
              setFormData({
                username: row.username,
                name: row.name,
                role: row.role,
                area: row.area,
                plantId: row.plantId,
                status: row.status,
              });
              setShowUserModal(true);
            }}
            className="p-1.5 rounded-md text-water-cyan hover:bg-water-cyan/10 transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm(`确认删除用户 ${row.name}？`)) {
                setUsers(users.filter((u) => u.id !== row.id));
              }
            }}
            className="p-1.5 rounded-md text-water-red hover:bg-water-red/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      role: 'inspector',
      area: '',
      plantId: 'p001',
      status: 'active',
    });
    setShowUserModal(true);
  };

  const handleSaveUser = () => {
    if (!formData.username || !formData.name) {
      alert('请填写账号和姓名');
      return;
    }
    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, ...formData, plantName: plantNames[formData.plantId] || '-' }
            : u,
        ),
      );
    } else {
      const newUser: ExtendedUser = {
        id: `u${Date.now()}`,
        ...formData,
        plantName: plantNames[formData.plantId] || '-',
      };
      setUsers([...users, newUser]);
    }
    setShowUserModal(false);
  };

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: '用户管理', icon: <Users size={16} /> },
    { key: 'rules', label: '规则配置', icon: <Settings2 size={16} /> },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-water-cyan">系统</span>设置
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-water-purple/10 border border-water-purple/20 text-water-purple text-xs">
          <Shield size={12} />
          仅管理员可访问
        </div>
      </div>

      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative flex items-center gap-2',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-water-cyan/20 to-water-teal/20 text-water-cyan border border-water-cyan/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent',
            )}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-water-cyan to-water-teal rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="glass-card corner-deco rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索账号、姓名、区域..."
                  className="w-full bg-water-dark/60 border border-water-cyan/20 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-water-cyan/50"
                />
              </div>
              <div className="text-sm text-slate-400">
                共 <span className="text-water-cyan font-semibold data-number">{filteredUsers.length}</span> 个用户
              </div>
              <button
                onClick={openAddModal}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-water-cyan to-water-teal text-water-deep font-medium text-sm hover:shadow-lg hover:shadow-water-cyan/30 transition-all"
              >
                <Plus size={16} />
                新增用户
              </button>
            </div>
          </div>

          <div className="flex-1">
            <DataTable
              columns={userColumns as any}
              data={filteredUsers as any}
              rowKey="id"
            />
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-auto content-start">
          <div className="glass-card corner-deco rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center text-water-deep">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">水质报警阈值配置</h3>
                <p className="text-xs text-slate-500">设置各水质参数的上下限报警阈值</p>
              </div>
            </div>
            <div className="space-y-5">
              <Slider
                label="COD 上限"
                value={waterQualityRules.codMax}
                min={10}
                max={100}
                unit="mg/L"
                onChange={(v) => setWaterQualityRules({ ...waterQualityRules, codMax: v })}
                accent="cyan"
              />
              <Slider
                label="氨氮 上限"
                value={waterQualityRules.ammoniaMax}
                min={1}
                max={20}
                step={0.5}
                unit="mg/L"
                onChange={(v) => setWaterQualityRules({ ...waterQualityRules, ammoniaMax: v })}
                accent="teal"
              />
              <Slider
                label="浊度 上限"
                value={waterQualityRules.turbidityMax}
                min={0.1}
                max={5}
                step={0.1}
                unit="NTU"
                onChange={(v) => setWaterQualityRules({ ...waterQualityRules, turbidityMax: v })}
                accent="green"
              />
              <div className="grid grid-cols-2 gap-4">
                <Slider
                  label="pH 下限"
                  value={waterQualityRules.phMin}
                  min={5}
                  max={7}
                  step={0.1}
                  onChange={(v) => setWaterQualityRules({ ...waterQualityRules, phMin: v })}
                  accent="yellow"
                />
                <Slider
                  label="pH 上限"
                  value={waterQualityRules.phMax}
                  min={8}
                  max={10}
                  step={0.1}
                  onChange={(v) => setWaterQualityRules({ ...waterQualityRules, phMax: v })}
                  accent="orange"
                />
              </div>
              <Slider
                label="余氯 上限"
                value={waterQualityRules.residualChlorineMax}
                min={1}
                max={8}
                step={0.1}
                unit="mg/L"
                onChange={(v) => setWaterQualityRules({ ...waterQualityRules, residualChlorineMax: v })}
                accent="purple"
              />
            </div>
            <div className="mt-5 pt-4 border-t border-water-cyan/10">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-water-cyan/20 text-water-cyan border border-water-cyan/30 hover:bg-water-cyan/30 transition-colors text-sm">
                <Save size={14} />
                保存水质配置
              </button>
            </div>
          </div>

          <div className="glass-card corner-deco rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-water-green to-water-teal flex items-center justify-center text-water-deep">
                <DollarSign size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">阶梯水价配置</h3>
                <p className="text-xs text-slate-500">设置3级阶梯用水价格</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-water-green/5 border border-water-green/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-water-green/20 flex items-center justify-center text-water-green text-xs font-bold">1</span>
                    <span className="text-sm font-medium text-water-green">第一阶梯</span>
                  </div>
                  <span className="text-xs text-slate-400">基础用水量</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">月用水量上限 (m³)</label>
                    <input
                      type="number"
                      value={tieredPricing.tier1Limit}
                      onChange={(e) => setTieredPricing({ ...tieredPricing, tier1Limit: Number(e.target.value) })}
                      className="w-full bg-water-dark/60 border border-water-green/20 rounded-lg px-3 py-1.5 text-sm text-water-green data-number focus:outline-none focus:border-water-green/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">单价 (元/m³)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tieredPricing.tier1Price}
                      onChange={(e) => setTieredPricing({ ...tieredPricing, tier1Price: Number(e.target.value) })}
                      className="w-full bg-water-dark/60 border border-water-green/20 rounded-lg px-3 py-1.5 text-sm text-water-green data-number focus:outline-none focus:border-water-green/50"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-water-yellow/5 border border-water-yellow/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-water-yellow/20 flex items-center justify-center text-water-yellow text-xs font-bold">2</span>
                    <span className="text-sm font-medium text-water-yellow">第二阶梯</span>
                  </div>
                  <span className="text-xs text-slate-400">超量加价</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">月用水量上限 (m³)</label>
                    <input
                      type="number"
                      value={tieredPricing.tier2Limit}
                      onChange={(e) => setTieredPricing({ ...tieredPricing, tier2Limit: Number(e.target.value) })}
                      className="w-full bg-water-dark/60 border border-water-yellow/20 rounded-lg px-3 py-1.5 text-sm text-water-yellow data-number focus:outline-none focus:border-water-yellow/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">单价 (元/m³)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tieredPricing.tier2Price}
                      onChange={(e) => setTieredPricing({ ...tieredPricing, tier2Price: Number(e.target.value) })}
                      className="w-full bg-water-dark/60 border border-water-yellow/20 rounded-lg px-3 py-1.5 text-sm text-water-yellow data-number focus:outline-none focus:border-water-yellow/50"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-water-red/5 border border-water-red/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-water-red/20 flex items-center justify-center text-water-red text-xs font-bold">3</span>
                    <span className="text-sm font-medium text-water-red">第三阶梯</span>
                  </div>
                  <span className="text-xs text-slate-400">超量累进加价</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    单价 (元/m³) <span className="text-slate-500">（超过{tieredPricing.tier2Limit}m³部分）</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tieredPricing.tier3Price}
                    onChange={(e) => setTieredPricing({ ...tieredPricing, tier3Price: Number(e.target.value) })}
                    className="w-full bg-water-dark/60 border border-water-red/20 rounded-lg px-3 py-1.5 text-sm text-water-red data-number focus:outline-none focus:border-water-red/50"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-water-cyan/10">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-water-cyan/20 text-water-cyan border border-water-cyan/30 hover:bg-water-cyan/30 transition-colors text-sm">
                <Save size={14} />
                保存水价配置
              </button>
            </div>
          </div>

          <div className="glass-card corner-deco rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-water-purple to-water-cyan flex items-center justify-center text-white">
                <Clock3 size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">工单升级时限配置</h3>
                <p className="text-xs text-slate-500">超时未处理工单自动升级</p>
              </div>
            </div>
            <div className="space-y-6">
              <Slider
                label="巡检工单升级时限"
                value={escalationRules.inspectionHours}
                min={12}
                max={96}
                unit="小时"
                onChange={(v) => setEscalationRules({ ...escalationRules, inspectionHours: v })}
                accent="purple"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-water-purple/5 border border-water-purple/20">
                <AlertCircle size={14} className="text-water-purple mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  巡检工单超过 <span className="text-water-purple font-semibold data-number">{escalationRules.inspectionHours}小时</span> 未处理，将自动升级至上级处理
                </p>
              </div>
              <div className="h-px bg-water-cyan/10" />
              <Slider
                label="污水工单升级时限"
                value={escalationRules.sewageHours}
                min={6}
                max={48}
                unit="小时"
                onChange={(v) => setEscalationRules({ ...escalationRules, sewageHours: v })}
                accent="red"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-water-red/5 border border-water-red/20">
                <AlertCircle size={14} className="text-water-red mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  污水异常工单超过 <span className="text-water-red font-semibold data-number">{escalationRules.sewageHours}小时</span> 未处理，将自动升级至集团技术中心
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-water-cyan/10">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-water-cyan/20 text-water-cyan border border-water-cyan/30 hover:bg-water-cyan/30 transition-colors text-sm">
                <Save size={14} />
                保存时限配置
              </button>
            </div>
          </div>

          <div className="glass-card corner-deco rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-water-orange to-water-yellow flex items-center justify-center text-water-deep">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">催缴规则配置</h3>
                <p className="text-xs text-slate-500">水费逾期滞纳金及催缴周期</p>
              </div>
            </div>
            <div className="space-y-6">
              <Slider
                label="滞纳金比例"
                value={dunningRules.lateFeeRate}
                min={0.1}
                max={5}
                step={0.1}
                unit="‰/天"
                onChange={(v) => setDunningRules({ ...dunningRules, lateFeeRate: v })}
                accent="orange"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-water-orange/5 border border-water-orange/20">
                <DollarSign size={14} className="text-water-orange mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  逾期水费按日加收 <span className="text-water-orange font-semibold data-number">{dunningRules.lateFeeRate}‰</span> 滞纳金
                </p>
              </div>
              <div className="h-px bg-water-cyan/10" />
              <Slider
                label="催缴周期"
                value={dunningRules.dunningCycle}
                min={1}
                max={30}
                unit="天"
                onChange={(v) => setDunningRules({ ...dunningRules, dunningCycle: v })}
                accent="yellow"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-water-yellow/5 border border-water-yellow/20">
                <Droplets size={14} className="text-water-yellow mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  每 <span className="text-water-yellow font-semibold data-number">{dunningRules.dunningCycle}天</span> 进行一次水费催缴提醒
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-water-cyan/10">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-water-cyan/20 text-water-cyan border border-water-cyan/30 hover:bg-water-cyan/30 transition-colors text-sm">
                <Save size={14} />
                保存催缴规则
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card corner-deco rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-water-cyan/10">
              <h3 className="text-lg font-semibold text-white">
                {editingUser ? '编辑用户' : '新增用户'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">账号 <span className="text-water-red">*</span></label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="请输入登录账号"
                    className="w-full bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-water-cyan/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">姓名 <span className="text-water-red">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入用户姓名"
                    className="w-full bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-water-cyan/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                >
                  <option value="admin">系统管理员</option>
                  <option value="plant_leader">水厂负责人</option>
                  <option value="dispatcher">调度员</option>
                  <option value="inspector">巡检员</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">负责区域</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="如：浦东新区"
                    className="w-full bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-water-cyan/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">所属水厂</label>
                  <select
                    value={formData.plantId}
                    onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
                    className="w-full bg-water-dark/60 border border-water-cyan/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-water-cyan/50"
                  >
                    <option value="p001">浦东水厂</option>
                    <option value="p002">徐汇水厂</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">状态</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                      formData.status === 'active'
                        ? 'bg-water-green/15 text-water-green border-water-green/40'
                        : 'bg-water-dark/40 text-slate-400 border-water-cyan/10 hover:border-water-cyan/20',
                    )}
                  >
                    启用
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, status: 'disabled' })}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                      formData.status === 'disabled'
                        ? 'bg-slate-500/15 text-slate-400 border-slate-500/40'
                        : 'bg-water-dark/40 text-slate-400 border-water-cyan/10 hover:border-water-cyan/20',
                    )}
                  >
                    停用
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-water-cyan/10 bg-water-dark/30">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 rounded-lg border border-water-cyan/20 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveUser}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-water-cyan to-water-teal text-water-deep font-medium text-sm hover:shadow-lg hover:shadow-water-cyan/30 transition-all"
              >
                <Save size={14} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
