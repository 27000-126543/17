import type {
  User, WaterSource, WaterQualityData, Alarm, Pump, PressurePoint,
  EnergyRecord, Customer, Bill, DrainagePoint, DrainagePump,
  SewageStage, SewageDevice, InspectionTask, WorkOrder, RiskWarning,
  SystemConfig
} from './types.js';

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const rnd = (min: number, max: number, d = 2) => +(min + Math.random() * (max - min)).toFixed(d);
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const initialUsers: User[] = [
  { id: 'u-001', username: 'admin', password: '123456', name: '赵管理', role: 'admin', area: '全局', plantId: 'all', phone: '13800000000' },
  { id: 'u-002', username: 'dispatcher', password: '123456', name: '钱调度', role: 'dispatcher', area: '调度中心', plantId: 'all', phone: '13800000001' },
  { id: 'u-003', username: 'plant_leader', password: '123456', name: '孙厂长', role: 'plant_leader', area: '东城区', plantId: 'p-001', phone: '13800000002' },
  { id: 'u-004', username: 'inspector', password: '123456', name: '李巡线', role: 'inspector', area: '东城区', plantId: 'p-001', phone: '13800000003' },
  { id: 'u-005', username: 'inspector2', password: '123456', name: '周巡线', role: 'inspector', area: '西城区', plantId: 'p-002', phone: '13800000004' },
  { id: 'u-006', username: 'plant_leader2', password: '123456', name: '吴厂长', role: 'plant_leader', area: '西城区', plantId: 'p-002', phone: '13800000005' },
  { id: 'u-007', username: 'tech_center', password: '123456', name: '郑总工', role: 'dispatcher', area: '集团技术中心', plantId: 'all', phone: '13800000006' },
  { id: 'u-008', username: 'field', password: '123456', name: '王外勤', role: 'inspector', area: '北城区', plantId: 'p-003', phone: '13800000007' },
];

const sourceNames = ['青草沙水库', '黄浦江取水口', '陈行水库', '金泽水库', '东风西沙水库'];
const areas = ['东城区', '西城区', '北城区', '西城区', '崇明区'];
const initialWaterSources: WaterSource[] = sourceNames.map((n, i) => ({
  id: `ws-00${i + 1}`, name: n, location: n, plantId: `p-00${i + 1}`,
  area: areas[i], status: 'normal', capacity: 1e7 * (i + 2)
}));

const initialPumps: Pump[] = initialWaterSources.flatMap((s, si) =>
  [0, 1, 2].map(i => ({
    id: `pump-${si * 3 + i + 1}`.padStart(11, '0'),
    name: `${i + 1}#${si === 0 ? '主供' : si === 1 ? '取水' : si === 2 ? '深井' : '加压'}泵`,
    plantId: s.plantId, sourceId: s.id,
    status: (['running', 'running', 'stopped'] as const)[i] as Pump['status'],
    mode: (['auto', 'auto', 'manual'] as const)[i],
    ratedPower: 150 + si * 30 + i * 20,
    power: i < 2 ? 130 + si * 25 + i * 15 : 0,
    flow: i < 2 ? 180 + si * 40 + i * 20 : 0,
    head: 35 + si * 8,
    efficiency: i < 2 ? 78 + si * 2 + i * 1 : 0,
    runHours: 500 + si * 200 + i * 100,
    startCount: 20 + si * 8 + i * 5,
    totalEnergy: 15000 + si * 8000 + i * 3000,
    currentEnergy: i < 2 ? 200 + si * 80 + i * 30 : 0
  }))
);

const initialPressurePoints: PressurePoint[] = Array.from({ length: 18 }, (_, i) => {
  const si = i % 5;
  return {
    id: `pp-${String(i + 1).padStart(3, '0')}`,
    name: ['市政府', '人民广场', '中心医院', '火车站', '大学城', '陆家嘴', '徐家汇', '虹桥机场', '浦东机场', '南京路', '外滩', '静安寺', '虹口足球场', '宝山', '闵行', '嘉定', '松江', '崇明'][i] + '监测点',
    plantId: `p-00${si + 1}`,
    area: areas[si],
    lng: 121.3 + (i % 6) * 0.08,
    lat: 31.05 + Math.floor(i / 6) * 0.18,
    pressure: rnd(0.25, 0.38, 3),
    status: 'normal' as const,
    timestamp: now
  };
});

const initialCustomers: Customer[] = Array.from({ length: 25 }, (_, i) => {
  const si = i % 5;
  return {
    id: `c-${String(i + 1).padStart(3, '0')}`,
    name: ['张', '李', '王', '刘', '陈', '杨', '赵', '孙', '周', '吴'][i % 10] + ['伟', '娜', '芳', '强', '静', '洋', '敏', '磊', '涛', '婷'][i % 10],
    meterNo: `SM${String(i + 1).padStart(6, '0')}`,
    address: `${areas[si]}XX路${100 + i}号`,
    area: areas[si],
    plantId: `p-00${si + 1}`,
    phone: `138${String(10000000 + i).slice(0, 8)}`,
    meterReading: 400 + i * 150 + Math.floor(Math.random() * 100),
    lastReading: 0,
    lastReadingDate: now - (28 + (i % 4) * 5) * dayMs,
    status: (['normal', 'normal', 'normal', 'arrears', 'suspended'] as const)[i % 5]
  };
}).map(c => ({ ...c, lastReading: c.meterReading - (40 + Math.floor(Math.random() * 180)) }));

const stagesData = ['进水', '粗格栅', '细格栅', '沉砂池', '生化池', '沉淀池', '消毒', '出水'];
const initialSewageStages: SewageStage[] = initialWaterSources.slice(0, 2).flatMap((s, si) =>
  stagesData.map((name, i) => ({
    id: `stage-${si}${i}`,
    name, plantId: s.plantId, order: i + 1,
    status: (i === 5 && si === 0) ? 'warning' : 'normal' as const,
    cod: i === 0 ? 300 + si * 20 : i < 5 ? 250 - i * 45 + si * 8 : 20 + i * 3,
    ammoniaNitrogen: i === 0 ? 40 + si * 3 : i < 5 ? 35 - i * 7 + si * 1 : 1 + i * 0.3,
    codRemoval: i === 0 || i === 7 ? 0 : 12 + i * 6 + (si === 0 && i === 5 ? 5 : 0),
    ammoniaRemoval: i === 0 || i === 7 ? 0 : 4 + i * 11,
    threshold: { cod: i === 0 ? 500 : i < 5 ? 280 - i * 30 : 50, ammoniaNitrogen: i === 0 ? 60 : i < 5 ? 50 - i * 6 : 5, codRemoval: i === 0 || i === 7 ? 0 : 8 + i * 3, ammoniaRemoval: i === 0 || i === 7 ? 0 : 2 + i * 3 },
    deviceIds: i === 5 ? [`sd-${si}0`, `sd-${si}1`] : i < 5 && i !== 0 ? [`sd-${si}${i}`] : [],
    timestamp: now
  }))
);

const initialSewageDevices: SewageDevice[] = [
  { id: 'sd-00', name: '1#进水泵', stageId: 'stage-00', status: 'running' },
  { id: 'sd-01', name: '1#粗格栅', stageId: 'stage-01', status: 'running' },
  { id: 'sd-02', name: '1#细格栅', stageId: 'stage-02', status: 'running' },
  { id: 'sd-03', name: '1#沉砂器', stageId: 'stage-03', status: 'running' },
  { id: 'sd-04', name: '1#曝气风机', stageId: 'stage-04', status: 'running' },
  { id: 'sd-05', name: '2#曝气风机', stageId: 'stage-04', status: 'running' },
  { id: 'sd-00', name: '1#刮泥机', stageId: 'stage-05', status: 'running' },
  { id: 'sd-01', name: '2#刮泥机', stageId: 'stage-05', status: 'locked', lockedBy: 'system', lockedAt: now - 2 * 3600 * 1000, lockReason: 'COD超标' },
  { id: 'sd-07', name: '1#紫外消毒', stageId: 'stage-06', status: 'running' },
  { id: 'sd-10', name: '西厂1#进水泵', stageId: 'stage-10', status: 'running' },
  { id: 'sd-14', name: '西厂1#曝气风机', stageId: 'stage-14', status: 'running' },
].map((d, i) => ({ ...d, id: `sd-${String(i).padStart(3, '0')}` }));

const initialDrainagePoints: DrainagePoint[] = areas.slice(0, 4).flatMap((a, i) =>
  [0, 1].map(j => {
    const lv = [0.45, 0.62, 0.78, 0.92, 0.35, 0.55, 0.82, 0.40][i * 2 + j];
    const warn = 0.7, alarm = 0.9;
    return {
      id: `dp-${String(i * 2 + j + 1).padStart(3, '0')}`,
      name: `${a}${j === 0 ? '中心' : '新区'}排水泵站`,
      area: a,
      level: lv,
      warningLevel: warn,
      alarmLevel: alarm,
      status: lv >= alarm ? 'alarm' : lv >= warn ? 'warning' : 'normal' as const,
      pumpIds: [`dp-pump-${i * 4 + j * 2}`, `dp-pump-${i * 4 + j * 2 + 1}`],
      timestamp: now
    };
  })
);

const initialDrainagePumps: DrainagePump[] = Array.from({ length: 16 }, (_, i) => {
  const dp = initialDrainagePoints[Math.floor(i / 2)];
  const running = dp && (dp.status === 'alarm' || (dp.status === 'warning' && i % 2 === 0));
  return {
    id: `dp-pump-${String(i).padStart(3, '0')}`,
    name: `${dp?.name || '泵站'}${i % 2 + 1}#排涝泵`,
    pointId: dp?.id || 'dp-001',
    status: running ? 'running' : 'stopped' as const,
    flow: running ? 800 + Math.random() * 200 : 0,
    power: running ? 170 + Math.random() * 40 : 0,
    startTime: running ? now - Math.floor(Math.random() * 3) * 3600 * 1000 : undefined,
    totalRunTime: 80 + i * 15
  };
});

const initialInspectionTasks: InspectionTask[] = [
  { id: 'task-001', title: '东城区6月巡检', area: '东城区', inspectorId: 'u-004', route: ['cp-1', 'cp-2', 'cp-3'], status: 'in_progress', createdAt: now - 2 * dayMs, dueDate: now + dayMs, checkPoints: [
    { id: 'cp-1', name: '1#阀门井', lng: 121.48, lat: 31.23, checked: true, checkedAt: now - 24 * 3600 * 1000 },
    { id: 'cp-2', name: '2#减压阀', lng: 121.49, lat: 31.235, checked: true, checkedAt: now - 20 * 3600 * 1000 },
    { id: 'cp-3', name: '3#流量计', lng: 121.5, lat: 31.24, checked: false },
  ] },
  { id: 'task-002', title: '西城区6月巡检', area: '西城区', inspectorId: 'u-005', route: ['cp-4', 'cp-5'], status: 'pending', createdAt: now - dayMs, dueDate: now + 2 * dayMs, checkPoints: [
    { id: 'cp-4', name: '4#消防栓', lng: 121.46, lat: 31.22, checked: false },
    { id: 'cp-5', name: '5#排气阀', lng: 121.45, lat: 31.225, checked: false },
  ] },
  { id: 'task-003', title: '北城区6月巡检', area: '北城区', inspectorId: 'u-008', route: ['cp-6'], status: 'completed', createdAt: now - 5 * dayMs, dueDate: now - 2 * dayMs, completedAt: now - 3 * dayMs, checkPoints: [
    { id: 'cp-6', name: '6#主控阀', lng: 121.47, lat: 31.25, checked: true, checkedAt: now - 3 * dayMs + 2 * 3600 * 1000 },
  ] },
];

const initialWorkOrders: WorkOrder[] = [
  { id: 'wo-001', title: '南京路DN300管道漏损', type: 'leak', priority: 'urgent', description: '路面有大量积水，疑似主管破裂', area: '东城区', plantId: 'p-001', reporterId: 'u-004', assigneeId: 'u-004', photos: { before: ['1.jpg'] }, status: 'processing', createdAt: now - 12 * 3600 * 1000, updatedAt: now - 6 * 3600 * 1000 },
  { id: 'wo-002', title: '陆家嘴泵站异响', type: 'device', priority: 'high', description: '2#水泵有异常金属摩擦声', area: '东城区', plantId: 'p-001', reporterId: 'u-004', assigneeId: 'u-004', photos: {}, status: 'pending', createdAt: now - 36 * 3600 * 1000, updatedAt: now - 36 * 3600 * 1000 },
  { id: 'wo-003', title: '沉淀池2#刮泥机故障', type: 'sewage', priority: 'high', description: '设备已锁定，COD异常', area: '东城区', plantId: 'p-001', stageId: 'stage-05', reporterId: 'system', assigneeId: 'u-007', photos: {}, status: 'upgraded', createdAt: now - 30 * 3600 * 1000, updatedAt: now - 5 * 3600 * 1000, upgradedTo: 'u-007', upgradeReason: '超24小时未处置', escalatedAt: now - 5 * 3600 * 1000 },
  { id: 'wo-004', title: '徐家汇路井盖破损', type: 'other', priority: 'medium', description: '井盖有裂纹需更换', area: '西城区', plantId: 'p-002', reporterId: 'u-005', assigneeId: 'u-005', photos: { before: ['m1.jpg'], after: ['m2.jpg'] }, status: 'completed', createdAt: now - 3 * dayMs, updatedAt: now - dayMs, completedAt: now - dayMs },
  { id: 'wo-005', title: '虹桥机场压力异常', type: 'device', priority: 'urgent', description: '持续低压，可能存在暗漏', area: '西城区', plantId: 'p-002', reporterId: 'system', assigneeId: 'u-005', photos: {}, status: 'assigned', createdAt: now - 50 * 3600 * 1000, updatedAt: now - 49 * 3600 * 1000, upgradedTo: 'u-003', upgradeReason: '超48小时未闭环', escalatedAt: now - 2 * 3600 * 1000 },
];

const initialAlarms: Alarm[] = [
  { id: 'alarm-001', sourceId: 'ws-003', level: 2, type: 'water_quality', parameter: '浊度', value: 1.25, threshold: 1.0, timestamp: now - 2 * 3600 * 1000, status: 'processing', suggestion: '建议启动应急投加系统，增加PAC投加量20%', pushedTo: ['dispatcher', 'p-003'], acknowledgedBy: 'u-002' },
  { id: 'alarm-002', sourceId: 'ws-003', level: 1, type: 'water_quality', parameter: 'COD', value: 6.5, threshold: 6.0, timestamp: now - 1.5 * 3600 * 1000, status: 'pending', suggestion: '建议增加活性炭投加', pushedTo: ['dispatcher', 'p-003'] },
  { id: 'alarm-003', level: 2, type: 'drainage', parameter: '液位', value: 0.92, threshold: 0.9, timestamp: now - 90 * 60 * 1000, status: 'processing', suggestion: '已启动全部排涝泵，建议通知市政部门', pushedTo: ['dispatcher', '市政部门'], acknowledgedBy: 'u-002' },
  { id: 'alarm-004', level: 3, type: 'sewage', parameter: 'COD去除率', value: 22.2, threshold: 15, timestamp: now - 3 * 3600 * 1000, status: 'processing', suggestion: '沉淀池设备已锁定，建议检查刮泥机', pushedTo: ['dispatcher', 'p-001', '集团技术中心'], acknowledgedBy: 'u-007' },
  { id: 'alarm-005', level: 1, type: 'pressure', parameter: '压力', value: 0.268, threshold: 0.28, timestamp: now - 30 * 60 * 1000, status: 'pending', suggestion: '建议检查该片区管网并增开加压泵', pushedTo: ['dispatcher', 'p-001'] },
];

const initialConfig: SystemConfig = {
  waterQualityThresholds: {
    turbidity: { warning: 1.0, alarm: 3.0 },
    ph: { min: 6.5, max: 8.5, warningMin: 6.8, warningMax: 8.2 },
    residualChlorine: { warning: 0.3, alarm: 0.1 },
    cod: { warning: 6.0, alarm: 10.0 },
    ammoniaNitrogen: { warning: 0.5, alarm: 1.0 },
  },
  priceTiers: [
    { tier: 1, min: 0, max: 220, price: 3.45 },
    { tier: 2, min: 220, max: 300, price: 4.83 },
    { tier: 3, min: 300, max: Infinity, price: 5.83 },
  ],
  upgradeRules: { workOrderHours: 48, sewageHours: 24 },
  reminderRules: { overdueDays: 15, suspendMonths: 3, lateFeeRate: 0.0005 },
  pressureRange: { min: 0.28, max: 0.45 },
};

export const db = {
  users: new Map(initialUsers.map(u => [u.id, u])),
  waterSources: new Map(initialWaterSources.map(w => [w.id, w])),
  waterQualityData: new Map<string, WaterQualityData>(),
  alarms: new Map(initialAlarms.map(a => [a.id, a])),
  pumps: new Map(initialPumps.map(p => [p.id, p])),
  pressurePoints: new Map(initialPressurePoints.map(p => [p.id, p])),
  energyRecords: new Map<string, EnergyRecord>(),
  customers: new Map(initialCustomers.map(c => [c.id, c])),
  bills: new Map<string, Bill>(),
  drainagePoints: new Map(initialDrainagePoints.map(d => [d.id, d])),
  drainagePumps: new Map(initialDrainagePumps.map(d => [d.id, d])),
  sewageStages: new Map(initialSewageStages.map(s => [s.id, s])),
  sewageDevices: new Map(initialSewageDevices.map(d => [d.id, d])),
  inspectionTasks: new Map(initialInspectionTasks.map(t => [t.id, t])),
  workOrders: new Map(initialWorkOrders.map(w => [w.id, w])),
  riskWarnings: new Map<string, RiskWarning>(),
  systemConfig: initialConfig,
  uid,
  rnd,
  now
};

initialWaterSources.forEach(s => {
  for (let i = 168; i >= 0; i--) {
    const t = now - i * 3600 * 1000;
    const base = s.id === 'ws-003' ? { turbidity: 0.9, cod: 5.5 } : { turbidity: 0.4, cod: 3.5 };
    const d: WaterQualityData = {
      id: `qd-${s.id}-${i}`, sourceId: s.id, timestamp: t,
      turbidity: rnd(base.turbidity - 0.3, base.turbidity + 0.4),
      ph: rnd(7.0, 7.6),
      residualChlorine: rnd(0.3, 0.7),
      cod: rnd(base.cod - 1, base.cod + 1.5, 1),
      ammoniaNitrogen: rnd(0.1, 0.4)
    };
    db.waterQualityData.set(d.id, d);
  }
});

initialCustomers.forEach(c => {
  const consumption = c.meterReading - c.lastReading;
  const period = new Date(now).toISOString().slice(0, 7);
  const tierAmounts: Bill['tierAmounts'] = [];
  let remain = consumption;
  const tiers = [
    { tier: 1 as const, used: 0, max: 220, price: 3.45 },
    { tier: 2 as const, used: 220, max: 300, price: 4.83 },
    { tier: 3 as const, used: 300, max: 999999, price: 5.83 },
  ];
  tiers.forEach(t => {
    const tc = Math.max(0, Math.min(remain, t.max - t.used));
    if (tc > 0) { tierAmounts.push({ tier: t.tier, consumption: tc, amount: +(tc * t.price).toFixed(2) }); remain -= tc; }
  });
  const baseAmount = +tierAmounts.reduce((s, t) => s + t.amount, 0).toFixed(2);
  const overdueDays = Math.max(0, Math.floor((now - (c.lastReadingDate + 25 * dayMs)) / dayMs));
  const lateFee = overdueDays > 0 && c.status !== 'normal' ? +(baseAmount * 0.0005 * overdueDays).toFixed(2) : 0;
  const status: Bill['status'] = c.status === 'suspended' ? 'suspend' : c.status === 'arrears' ? (overdueDays > 90 ? 'suspend' : 'overdue') : Math.random() > 0.7 ? 'unpaid' : 'paid';
  db.bills.set(`bill-${c.id}`, {
    id: `bill-${c.id}`, customerId: c.id, period,
    startReading: c.lastReading, endReading: c.meterReading, consumption,
    tierAmounts, baseAmount, lateFee: status === 'overdue' || status === 'suspend' ? lateFee : 0,
    totalAmount: +(baseAmount + (status === 'overdue' || status === 'suspend' ? lateFee : 0)).toFixed(2),
    paidAmount: status === 'paid' ? baseAmount : 0,
    issueDate: c.lastReadingDate + dayMs, dueDate: c.lastReadingDate + 25 * dayMs,
    paidAt: status === 'paid' ? c.lastReadingDate + 15 * dayMs : undefined,
    status,
    reminders: (status === 'overdue' || status === 'suspend') && overdueDays > 15 ? [
      { date: c.lastReadingDate + 26 * dayMs, type: 'sms', sent: true },
      { date: c.lastReadingDate + 35 * dayMs, type: 'sms', sent: true },
    ] : []
  });
});
