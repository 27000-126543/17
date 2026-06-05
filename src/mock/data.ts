import type {
  User,
  WaterSource,
  WaterQualityData,
  Alarm,
  Pump,
  PressurePoint,
  Customer,
  Bill,
  DrainagePoint,
  SewageStage,
  SewageData,
  InspectionTask,
  WorkOrder,
  DashboardStats,
} from '@/types';

export const users: User[] = [
  { id: 'u001', username: 'admin', name: '王志强', role: 'admin', area: '总部', plantId: 'p001' },
  { id: 'u002', username: 'dispatcher01', name: '李明华', role: 'dispatcher', area: '黄浦区', plantId: 'p001' },
  { id: 'u003', username: 'leader01', name: '张建国', role: 'plant_leader', area: '浦东新区', plantId: 'p001' },
  { id: 'u004', username: 'leader02', name: '赵国栋', role: 'plant_leader', area: '徐汇区', plantId: 'p002' },
  { id: 'u005', username: 'inspector01', name: '陈卫东', role: 'inspector', area: '浦东新区', plantId: 'p001' },
  { id: 'u006', username: 'inspector02', name: '刘晓峰', role: 'inspector', area: '黄浦区', plantId: 'p001' },
  { id: 'u007', username: 'inspector03', name: '周文斌', role: 'inspector', area: '徐汇区', plantId: 'p002' },
  { id: 'u008', username: 'dispatcher02', name: '孙丽华', role: 'dispatcher', area: '徐汇区', plantId: 'p002' },
];

export const waterSources: WaterSource[] = [
  { id: 'ws001', name: '青草沙水源地', location: '上海市崇明区长兴岛', plantId: 'p001', status: 'normal' },
  { id: 'ws002', name: '黄浦江上游水源地', location: '上海市松江区', plantId: 'p001', status: 'normal' },
  { id: 'ws003', name: '陈行水库', location: '上海市宝山区罗泾镇', plantId: 'p001', status: 'warning' },
  { id: 'ws004', name: '金泽水库', location: '上海市青浦区金泽镇', plantId: 'p002', status: 'normal' },
  { id: 'ws005', name: '东风西沙水库', location: '上海市崇明区', plantId: 'p002', status: 'alarm' },
];

const now = Date.now();

export const waterQualityHistory: WaterQualityData[] = Array.from({ length: 168 }, (_, i) => {
  const sourceIndex = i % 5;
  return {
    sourceId: `ws00${sourceIndex + 1}`,
    timestamp: now - (168 - i) * 3600000,
    turbidity: +(0.3 + Math.random() * 1.2).toFixed(2),
    ph: +(6.8 + Math.random() * 1.4).toFixed(2),
    residualChlorine: +(0.3 + Math.random() * 0.6).toFixed(2),
    cod: +(2 + Math.random() * 3).toFixed(1),
    ammoniaNitrogen: +(0.05 + Math.random() * 0.15).toFixed(3),
  };
});

export const alarms: Alarm[] = [
  { id: 'a001', sourceId: 'ws005', level: 3, type: '水质超标', parameter: '氨氮', value: 0.32, threshold: 0.2, timestamp: now - 1800000, status: 'processing', suggestion: '立即启动应急处理，加大活性炭投加量', pushedTo: ['u001', 'u004', 'u008'] },
  { id: 'a002', sourceId: 'ws003', level: 2, type: '水质预警', parameter: '浊度', value: 1.42, threshold: 1.0, timestamp: now - 7200000, status: 'processing', suggestion: '加强混凝沉淀工艺监控，调整PAC投加量', pushedTo: ['u001', 'u003'] },
  { id: 'a003', sourceId: 'ws005', level: 2, type: '水质预警', parameter: 'COD', value: 5.2, threshold: 5.0, timestamp: now - 14400000, status: 'resolved', suggestion: '调整氧化剂投加量，加强监测', pushedTo: ['u001', 'u004'] },
  { id: 'a004', sourceId: 'ws001', level: 1, type: '参数异常', parameter: 'pH值', value: 8.3, threshold: 8.5, timestamp: now - 28800000, status: 'resolved', suggestion: '持续监测，确认水源水质变化', pushedTo: ['u003'] },
  { id: 'a005', sourceId: 'ws002', level: 1, type: '参数异常', parameter: '余氯', value: 0.28, threshold: 0.3, timestamp: now - 43200000, status: 'resolved', suggestion: '微调加氯量，确保管网余氯达标', pushedTo: ['u002'] },
  { id: 'a006', sourceId: 'ws004', level: 2, type: '水质预警', parameter: '浊度', value: 1.25, threshold: 1.0, timestamp: now - 57600000, status: 'pending', suggestion: '检查过滤工艺运行状态', pushedTo: ['u004', 'u008'] },
  { id: 'a007', sourceId: 'ws003', level: 3, type: '水质超标', parameter: '氨氮', value: 0.28, threshold: 0.2, timestamp: now - 72000000, status: 'resolved', suggestion: '启动应急预案，已解决', pushedTo: ['u001', 'u003'] },
  { id: 'a008', sourceId: 'ws001', level: 1, type: '参数异常', parameter: 'COD', value: 4.8, threshold: 5.0, timestamp: now - 86400000, status: 'resolved', suggestion: '关注原水水质变化趋势', pushedTo: ['u003'] },
  { id: 'a009', sourceId: 'ws005', level: 1, type: '参数异常', parameter: '余氯', value: 0.25, threshold: 0.3, timestamp: now - 100800000, status: 'resolved', suggestion: '调整加氯系统参数', pushedTo: ['u008'] },
  { id: 'a010', sourceId: 'ws002', level: 2, type: '水质预警', parameter: 'pH值', value: 8.6, threshold: 8.5, timestamp: now - 115200000, status: 'resolved', suggestion: '已调整pH调节剂投加量', pushedTo: ['u002', 'u003'] },
  { id: 'a011', sourceId: 'ws004', level: 3, type: '水质超标', parameter: '浊度', value: 1.85, threshold: 1.0, timestamp: now - 129600000, status: 'resolved', suggestion: '反冲洗滤池，加强混凝沉淀', pushedTo: ['u001', 'u004'] },
  { id: 'a012', sourceId: 'ws003', level: 1, type: '参数异常', parameter: 'pH值', value: 6.7, threshold: 6.8, timestamp: now - 144000000, status: 'resolved', suggestion: '正常波动，持续监测', pushedTo: ['u003'] },
];

export const pumps: Pump[] = [
  { id: 'pump001', name: '1#送水泵', plantId: 'p001', status: 'running', mode: 'auto', power: 280, currentEnergy: 245.6, totalEnergy: 128560, startCount: 156 },
  { id: 'pump002', name: '2#送水泵', plantId: 'p001', status: 'running', mode: 'auto', power: 280, currentEnergy: 238.2, totalEnergy: 115420, startCount: 142 },
  { id: 'pump003', name: '3#送水泵', plantId: 'p001', status: 'stopped', mode: 'manual', power: 320, currentEnergy: 0, totalEnergy: 98230, startCount: 128 },
  { id: 'pump004', name: '4#送水泵', plantId: 'p001', status: 'fault', mode: 'manual', power: 320, currentEnergy: 0, totalEnergy: 87650, startCount: 98 },
  { id: 'pump005', name: '1#送水泵', plantId: 'p002', status: 'running', mode: 'auto', power: 250, currentEnergy: 215.8, totalEnergy: 105280, startCount: 135 },
  { id: 'pump006', name: '2#送水泵', plantId: 'p002', status: 'running', mode: 'auto', power: 250, currentEnergy: 208.4, totalEnergy: 98760, startCount: 125 },
  { id: 'pump007', name: '3#送水泵', plantId: 'p002', status: 'stopped', mode: 'manual', power: 280, currentEnergy: 0, totalEnergy: 76540, startCount: 92 },
  { id: 'pump008', name: '4#送水泵', plantId: 'p002', status: 'running', mode: 'auto', power: 280, currentEnergy: 226.5, totalEnergy: 89320, startCount: 108 },
];

export const pressurePoints: PressurePoint[] = [
  { id: 'pp001', name: '陆家嘴压力监测点', lng: 121.5053, lat: 31.2397, pressure: 0.32, status: 'normal' },
  { id: 'pp002', name: '人民广场监测点', lng: 121.4737, lat: 31.2304, pressure: 0.28, status: 'normal' },
  { id: 'pp003', name: '徐家汇监测点', lng: 121.4365, lat: 31.1957, pressure: 0.31, status: 'normal' },
  { id: 'pp004', name: '静安寺监测点', lng: 121.4482, lat: 31.2235, pressure: 0.24, status: 'low' },
  { id: 'pp005', name: '虹桥火车站监测点', lng: 121.3200, lat: 31.1944, pressure: 0.29, status: 'normal' },
  { id: 'pp006', name: '上海火车站监测点', lng: 121.4580, lat: 31.2492, pressure: 0.33, status: 'normal' },
  { id: 'pp007', name: '张江高科技园区', lng: 121.5912, lat: 31.2048, pressure: 0.27, status: 'normal' },
  { id: 'pp008', name: '五角场监测点', lng: 121.5124, lat: 31.2984, pressure: 0.22, status: 'low' },
  { id: 'pp009', name: '莘庄监测点', lng: 121.3852, lat: 31.1118, pressure: 0.30, status: 'normal' },
  { id: 'pp010', name: '宝山监测点', lng: 121.4890, lat: 31.3980, pressure: 0.35, status: 'normal' },
  { id: 'pp011', name: '嘉定监测点', lng: 121.2352, lat: 31.3852, pressure: 0.26, status: 'normal' },
  { id: 'pp012', name: '闵行开发区', lng: 121.3890, lat: 30.9892, pressure: 0.38, status: 'high' },
  { id: 'pp013', name: '松江大学城', lng: 121.2236, lat: 31.0365, pressure: 0.29, status: 'normal' },
  { id: 'pp014', name: '南汇新城', lng: 121.9278, lat: 30.8817, pressure: 0.25, status: 'normal' },
  { id: 'pp015', name: '青浦工业园', lng: 121.1153, lat: 31.1557, pressure: 0.34, status: 'normal' },
  { id: 'pp016', name: '奉贤南桥', lng: 121.4574, lat: 30.9170, pressure: 0.31, status: 'normal' },
  { id: 'pp017', name: '金山石化', lng: 121.1580, lat: 30.7440, pressure: 0.36, status: 'high' },
  { id: 'pp018', name: '崇明城桥', lng: 121.4008, lat: 31.6320, pressure: 0.23, status: 'low' },
];

const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
const givenNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '霞', '平'];
const areas = ['浦东新区', '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '松江区', '青浦区', '奉贤区', '金山区', '崇明区'];
const streets = ['人民大道', '陆家嘴环路', '南京东路', '淮海中路', '四川北路', '徐家汇路', '虹桥路', '延安西路', '中山东一路', '世纪大道', '肇嘉浜路', '武宁路', '大连路', '四平路', '张江路'];

function randomPhone(): string {
  return '139' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

function randomName(): string {
  return surnames[Math.floor(Math.random() * surnames.length)] + givenNames[Math.floor(Math.random() * givenNames.length)];
}

export const customers: Customer[] = Array.from({ length: 25 }, (_, i) => ({
  id: `c${(i + 1).toString().padStart(3, '0')}`,
  name: randomName(),
  address: `${areas[i % areas.length]}${streets[i % streets.length]}${Math.floor(Math.random() * 800) + 1}号${Math.floor(Math.random() * 30) + 1}号楼${Math.floor(Math.random() * 20) + 101}室`,
  meterNo: `SB${(20240000 + i).toString()}`,
  phone: randomPhone(),
  area: areas[i % areas.length],
}));

const billStatuses: Bill['status'][] = ['unpaid', 'paid', 'overdue', 'shutoff'];

export const bills: Bill[] = Array.from({ length: 35 }, (_, i) => {
  const customerIndex = i % 25;
  const monthOffset = Math.floor(i / 25);
  const status = billStatuses[i % 4];
  const baseAmount = 30 + Math.random() * 180;
  const lateFee = status === 'overdue' ? +(baseAmount * 0.05 * (1 + Math.floor(Math.random() * 3))).toFixed(2) : 0;
  const year = 2026;
  const month = ((5 - monthOffset + 12) % 12) + 1;
  return {
    id: `b${(i + 1).toString().padStart(4, '0')}`,
    customerId: `c${(customerIndex + 1).toString().padStart(3, '0')}`,
    period: `${year}-${month.toString().padStart(2, '0')}`,
    consumption: +(5 + Math.random() * 45).toFixed(1),
    amount: +baseAmount.toFixed(2),
    lateFee,
    status,
    dueDate: `${year}-${(month % 12 + 1).toString().padStart(2, '0')}-15`,
    reminders: status === 'overdue' ? Math.floor(Math.random() * 3) + 2 : status === 'shutoff' ? 5 : status === 'unpaid' ? Math.floor(Math.random() * 2) : 0,
  };
});

export const drainagePoints: DrainagePoint[] = [
  { id: 'dp001', name: '外滩排水泵站', lng: 121.4900, lat: 31.2397, level: 2.1, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'idle' },
  { id: 'dp002', name: '苏州河排水站', lng: 121.4610, lat: 31.2460, level: 1.8, warningLevel: 3.2, alarmLevel: 4.2, pumpStatus: 'idle' },
  { id: 'dp003', name: '杨浦泵站', lng: 121.5280, lat: 31.2960, level: 3.6, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'running' },
  { id: 'dp004', name: '虹口港排水站', lng: 121.4980, lat: 31.2680, level: 2.5, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'idle' },
  { id: 'dp005', name: '龙华排水泵站', lng: 121.4470, lat: 31.1790, level: 1.5, warningLevel: 3.0, alarmLevel: 4.0, pumpStatus: 'idle' },
  { id: 'dp006', name: '漕河泾泵站', lng: 121.4050, lat: 31.1750, level: 4.7, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'running' },
  { id: 'dp007', name: '桃浦排水站', lng: 121.3820, lat: 31.2780, level: 2.9, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'idle' },
  { id: 'dp008', name: '浦东机场泵站', lng: 121.8040, lat: 31.1440, level: 2.0, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'idle' },
  { id: 'dp009', name: '金桥排水站', lng: 121.6010, lat: 31.2680, level: 1.6, warningLevel: 3.2, alarmLevel: 4.2, pumpStatus: 'idle' },
  { id: 'dp010', name: '虹桥泵站', lng: 121.3280, lat: 31.1940, level: 2.3, warningLevel: 3.5, alarmLevel: 4.5, pumpStatus: 'idle' },
];

export const sewageStages: SewageStage[] = [
  { id: 'ss001', name: '进水', plantId: 'p001', order: 1 },
  { id: 'ss002', name: '格栅', plantId: 'p001', order: 2 },
  { id: 'ss003', name: '沉砂池', plantId: 'p001', order: 3 },
  { id: 'ss004', name: '初沉池', plantId: 'p001', order: 4 },
  { id: 'ss005', name: '生化池', plantId: 'p001', order: 5 },
  { id: 'ss006', name: '二沉池', plantId: 'p001', order: 6 },
  { id: 'ss007', name: '消毒出水', plantId: 'p001', order: 7 },
  { id: 'ss008', name: '进水', plantId: 'p002', order: 1 },
  { id: 'ss009', name: '格栅', plantId: 'p002', order: 2 },
  { id: 'ss010', name: '沉砂池', plantId: 'p002', order: 3 },
  { id: 'ss011', name: '初沉池', plantId: 'p002', order: 4 },
  { id: 'ss012', name: '生化池', plantId: 'p002', order: 5 },
  { id: 'ss013', name: '二沉池', plantId: 'p002', order: 6 },
  { id: 'ss014', name: '消毒出水', plantId: 'p002', order: 7 },
];

export const sewageData: SewageData[] = Array.from({ length: 336 }, (_, i) => {
  const stageIndex = i % 14;
  const codBase = stageIndex < 7 ? [380, 360, 340, 280, 120, 60, 45][stageIndex] : [350, 330, 310, 250, 100, 50, 38][stageIndex - 7];
  const ammoniaBase = stageIndex < 7 ? [35, 34, 33, 28, 8, 5, 3][stageIndex] : [32, 31, 30, 25, 7, 4, 2.5][stageIndex - 7];
  return {
    stageId: `ss${(stageIndex + 1).toString().padStart(3, '0')}`,
    timestamp: now - (336 - i) * 1800000,
    cod: +(codBase + (Math.random() - 0.5) * 20).toFixed(1),
    codRemoval: stageIndex === 0 || stageIndex === 7 ? 0 : +((stageIndex < 7 ? [0, 5, 10, 25, 70, 85, 90][stageIndex] : [0, 5, 11, 28, 73, 86, 91][stageIndex - 7]) + (Math.random() - 0.5) * 3).toFixed(1),
    ammoniaNitrogen: +(ammoniaBase + (Math.random() - 0.5) * 3).toFixed(2),
    ammoniaRemoval: stageIndex === 0 || stageIndex === 7 ? 0 : +((stageIndex < 7 ? [0, 3, 8, 20, 77, 88, 93][stageIndex] : [0, 4, 9, 22, 78, 89, 94][stageIndex - 7]) + (Math.random() - 0.5) * 2).toFixed(1),
    flow: +(1200 + Math.random() * 400).toFixed(0),
  };
});

function generateCheckPoints(area: string, count: number) {
  const baseLat = area === '浦东新区' ? 31.22 : area === '黄浦区' ? 31.23 : area === '徐汇区' ? 31.19 : 31.20;
  const baseLng = area === '浦东新区' ? 121.54 : area === '黄浦区' ? 121.48 : area === '徐汇区' ? 121.44 : 121.47;
  return Array.from({ length: count }, (_, j) => ({
    id: `cp${j + 1}`,
    name: `${area}${['阀门井', '消火栓', '压力表', '流量计', '检查井', '排气阀'][j % 6]}${Math.floor(j / 6) + 1}号`,
    lat: +(baseLat + (Math.random() - 0.5) * 0.08).toFixed(6),
    lng: +(baseLng + (Math.random() - 0.5) * 0.12).toFixed(6),
    checked: Math.random() > 0.25,
    checkTime: Math.random() > 0.25 ? now - Math.floor(Math.random() * 28800000) : null,
    photos: Math.random() > 0.4 ? [] : [`photo_${j}.jpg`],
  }));
}

export const inspectionTasks: InspectionTask[] = [
  {
    id: 'it001',
    inspectorId: 'u005',
    area: '浦东新区',
    date: '2026-06-05',
    status: 'in_progress',
    checkPoints: generateCheckPoints('浦东新区', 8),
  },
  {
    id: 'it002',
    inspectorId: 'u006',
    area: '黄浦区',
    date: '2026-06-05',
    status: 'in_progress',
    checkPoints: generateCheckPoints('黄浦区', 6),
  },
  {
    id: 'it003',
    inspectorId: 'u007',
    area: '徐汇区',
    date: '2026-06-05',
    status: 'pending',
    checkPoints: generateCheckPoints('徐汇区', 7),
  },
  {
    id: 'it004',
    inspectorId: 'u005',
    area: '浦东新区',
    date: '2026-06-04',
    status: 'completed',
    checkPoints: generateCheckPoints('浦东新区', 8),
  },
  {
    id: 'it005',
    inspectorId: 'u006',
    area: '黄浦区',
    date: '2026-06-04',
    status: 'completed',
    checkPoints: generateCheckPoints('黄浦区', 6),
  },
  {
    id: 'it006',
    inspectorId: 'u007',
    area: '徐汇区',
    date: '2026-06-04',
    status: 'completed',
    checkPoints: generateCheckPoints('徐汇区', 7),
  },
];

const woDescriptions: Record<string, string[]> = {
  leak: ['小区主管道破裂漏水', '消防栓损坏漏水', '水表接口处渗水', '地下管道暗漏', '楼顶水箱漏水', '阀门密封不严漏水'],
  equipment: ['水泵异常振动', '压力表读数异常', '流量计无数据', '阀门无法正常开关', '加氯设备故障', '水质在线监测仪异常'],
  other: ['用户投诉水压低', '水表读数异常', '新装水表验收', '管道施工监护', '水质异常排查', '用户回访'],
};

const woLocations = [
  '浦东新区陆家嘴环路1000号',
  '黄浦区南京东路200号',
  '徐汇区徐家汇路300号',
  '长宁区虹桥路500号',
  '静安区南京西路1266号',
  '普陀区武宁路100号',
  '虹口区四川北路800号',
  '杨浦区四平路1200号',
  '闵行区莘松路500号',
  '宝山区牡丹江路1000号',
  '嘉定区城中路200号',
  '松江区人民北路100号',
];

const priorities: WorkOrder['priority'][] = ['low', 'medium', 'high', 'urgent'];
const statuses: WorkOrder['status'][] = ['pending', 'assigned', 'processing', 'upgraded', 'closed'];

export const workOrders: WorkOrder[] = Array.from({ length: 18 }, (_, i) => {
  const types: WorkOrder['type'][] = ['leak', 'equipment', 'other'];
  const type = types[i % 3];
  const descList = woDescriptions[type];
  const status = statuses[i % 5];
  const isClosed = status === 'closed';
  const createdAt = now - (i + 1) * 3600000 * (2 + Math.floor(Math.random() * 24));
  return {
    id: `wo${(i + 1).toString().padStart(4, '0')}`,
    type,
    priority: priorities[i % 4],
    status,
    description: descList[i % descList.length],
    location: woLocations[i % woLocations.length],
    reporterId: users[i % 4 + 1].id,
    assigneeId: status === 'pending' ? '' : users[4 + (i % 3)].id,
    photos: Math.random() > 0.3 ? [`wo${i + 1}_1.jpg`] : [`wo${i + 1}_1.jpg`, `wo${i + 1}_2.jpg`],
    repairPhotos: isClosed ? [`wo${i + 1}_r1.jpg`, `wo${i + 1}_r2.jpg`] : [],
    createdAt,
    closedAt: isClosed ? createdAt + Math.floor(Math.random() * 28800000) + 3600000 : null,
    upgradeCount: status === 'upgraded' ? 1 + Math.floor(Math.random() * 2) : 0,
  };
});

export const hourlyProductionData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  production: +(8000 + Math.sin((i - 6) / 24 * Math.PI * 2) * 2500 + Math.random() * 800).toFixed(0),
  consumption: +(7500 + Math.sin((i - 7) / 24 * Math.PI * 2) * 2200 + Math.random() * 600).toFixed(0),
}));

export const monthlyEnergyData = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  const base = 450000;
  const seasonal = month >= 6 && month <= 9 ? 80000 : month >= 11 || month <= 2 ? 40000 : 0;
  return {
    month: `${month}月`,
    energy: +(base + seasonal + (Math.random() - 0.5) * 30000).toFixed(0),
    cost: +((base + seasonal + (Math.random() - 0.5) * 30000) * 0.85).toFixed(0),
  };
});

export const dashboardStats: DashboardStats = {
  todayProduction: 185600,
  avgPressure: 0.29,
  waterQualityRate: 98.6,
  inspectionRate: 92.3,
  alarmsToday: 5,
  energyCost: 156800,
  usersTotal: 128650,
};
