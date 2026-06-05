import { db } from './database.js';
import type { Alarm, WaterQualityData, AlarmLevel, Pump, WorkOrder, PressurePoint, DrainagePoint, DrainagePump, SewageStage, SewageDevice, Bill, EnergyRecord } from './types.js';

const hourMs = 60 * 60 * 1000;

export const generateWaterQualityData = (): WaterQualityData[] => {
  const newData: WaterQualityData[] = [];
  const now = Date.now();
  db.waterSources.forEach(source => {
    const base = source.id === 'ws-003' ? { turbidity: 0.9, cod: 5.5 } : { turbidity: 0.4, cod: 3.5 };
    const shouldSpike = Math.random() < 0.08;
    const d: WaterQualityData = {
      id: db.uid('qd'),
      sourceId: source.id,
      timestamp: now,
      turbidity: shouldSpike && source.id === 'ws-003' ? db.rnd(1.2, 2.0) : db.rnd(Math.max(0.1, base.turbidity - 0.3), base.turbidity + 0.4),
      ph: shouldSpike ? db.rnd(6.2, 6.7) : db.rnd(7.0, 7.6),
      residualChlorine: db.rnd(0.3, 0.7),
      cod: shouldSpike && source.id === 'ws-003' ? db.rnd(6.5, 9.0, 1) : db.rnd(Math.max(1.5, base.cod - 1), base.cod + 1.5, 1),
      ammoniaNitrogen: db.rnd(0.1, 0.4)
    };
    db.waterQualityData.set(d.id, d);
    newData.push(d);
  });
  return newData;
};

const getAlarmSuggestion = (type: string, param: string, level: number): string => {
  const suggestions: Record<string, string[]> = {
    '浊度': ['建议加强混凝沉淀效果，检查PAC投加量', '建议立即增加投药量，启动应急处理预案', '严重超标！建议切断供水并启动应急水源'],
    'pH值': ['建议检查pH调节系统，微调酸碱投加量', '建议加大酸碱调节力度，查明污染源', 'pH严重异常！建议立即排查源头污染'],
    'COD': ['建议增加活性炭投加，监测后续工艺', '建议启动深度处理工艺，增加曝气时间', 'COD严重超标！建议排查上游污染源并上报'],
    '余氯': ['建议检查加氯系统，调整投加量', '建议立即调整加氯量，确保消毒效果', '余氯严重不足！存在水质安全风险'],
    '氨氮': ['建议增加曝气强度，延长生化停留时间', '建议启动备用硝化工艺，加大回流量', '氨氮严重超标！建议立即上报环保部门'],
  };
  const arr = suggestions[param] || ['建议加强监测，排查异常原因', '建议采取应急处置措施', '严重异常，建议立即上报'];
  return arr[Math.min(level - 1, arr.length - 1)];
};

export const checkWaterQualityAlarms = (data: WaterQualityData[]): Alarm[] => {
  const newAlarms: Alarm[] = [];
  const thresholds = db.systemConfig.waterQualityThresholds;
  const activeAlarms = Array.from(db.alarms.values()).filter(a => a.type === 'water_quality' && a.status !== 'resolved');
  data.forEach(d => {
    const source = db.waterSources.get(d.sourceId);
    if (!source) return;
    const checks: { param: string; value: number; warn: number; alarm: number; isMin?: boolean }[] = [
      { param: '浊度', value: d.turbidity, warn: thresholds.turbidity.warning, alarm: thresholds.turbidity.alarm },
      { param: 'pH值', value: d.ph, warn: d.ph < 7 ? thresholds.ph.warningMin : thresholds.ph.warningMax, alarm: d.ph < 7 ? thresholds.ph.min : thresholds.ph.max, isMin: d.ph < 7 },
      { param: '余氯', value: d.residualChlorine, warn: thresholds.residualChlorine.warning, alarm: thresholds.residualChlorine.alarm, isMin: true },
      { param: 'COD', value: d.cod, warn: thresholds.cod.warning, alarm: thresholds.cod.alarm },
      { param: '氨氮', value: d.ammoniaNitrogen, warn: thresholds.ammoniaNitrogen.warning, alarm: thresholds.ammoniaNitrogen.alarm },
    ];
    checks.forEach(c => {
      const isOver = c.isMin ? d[c.param === 'pH值' ? 'ph' : (c.param === '余氯' ? 'residualChlorine' : c.param.toLowerCase()) as keyof WaterQualityData] as number < c.warn :
        (c.param === 'pH值' ? d.ph > c.warn :
          c.param === '余氯' ? d.residualChlorine < c.warn :
          c.param === 'COD' ? d.cod > c.warn :
          c.param === '氨氮' ? d.ammoniaNitrogen > c.warn :
          d.turbidity > c.warn);
      const isAlarmOver = c.isMin ? d[c.param === 'pH值' ? 'ph' : (c.param === '余氯' ? 'residualChlorine' : c.param.toLowerCase()) as keyof WaterQualityData] as number < c.alarm :
        (c.param === 'pH值' ? d.ph > c.alarm :
          c.param === '余氯' ? d.residualChlorine < c.alarm :
          c.param === 'COD' ? d.cod > c.alarm :
          c.param === '氨氮' ? d.ammoniaNitrogen > c.alarm :
          d.turbidity > c.alarm);
      let level: AlarmLevel = 1;
      if (isAlarmOver) level = d.sourceId === 'ws-003' && c.param === '浊度' ? 3 : 2;
      else if (!isOver) return;
      const exists = activeAlarms.find(a =>
        a.sourceId === d.sourceId && a.parameter === c.param && a.status !== 'resolved' &&
        Date.now() - a.timestamp < 2 * hourMs
      );
      if (exists) {
        if (level > exists.level) {
          exists.level = level;
          exists.timestamp = Date.now();
          exists.suggestion = getAlarmSuggestion('water_quality', c.param, level);
          if (level === 3 && !exists.pushedTo.includes('集团技术中心')) exists.pushedTo.push('集团技术中心');
        }
        return;
      }
      const alarm: Alarm = {
        id: db.uid('alarm'),
        sourceId: d.sourceId,
        plantId: source.plantId,
        level,
        type: 'water_quality',
        parameter: c.param,
        value: c.param === 'pH值' ? d.ph :
          c.param === '余氯' ? d.residualChlorine :
          c.param === 'COD' ? d.cod :
          c.param === '氨氮' ? d.ammoniaNitrogen : d.turbidity,
        threshold: isAlarmOver ? c.alarm : c.warn,
        timestamp: Date.now(),
        status: 'pending',
        suggestion: getAlarmSuggestion('water_quality', c.param, level),
        pushedTo: level === 3 ? ['dispatcher', source.plantId, '集团技术中心'] : ['dispatcher', source.plantId],
      };
      db.alarms.set(alarm.id, alarm);
      newAlarms.push(alarm);
      source.status = level === 3 ? 'alarm' : 'warning';
    });
  });
  return newAlarms;
};

export const calculatePumpCombination = (plantId: string): { toStart: string[]; toStop: string[] } => {
  const plantPumps = Array.from(db.pumps.values()).filter(p => p.plantId === plantId && p.status !== 'maintenance');
  const plantPressurePoints = Array.from(db.pressurePoints.values()).filter(p => p.plantId === plantId);
  const avgPressure = plantPressurePoints.reduce((s, p) => s + p.pressure, 0) / Math.max(1, plantPressurePoints.length);
  const targetPressure = (db.systemConfig.pressureRange.min + db.systemConfig.pressureRange.max) / 2;
  const running = plantPumps.filter(p => p.status === 'running');
  const stopped = plantPumps.filter(p => p.status === 'stopped' && p.mode === 'auto');
  const toStart: string[] = [];
  const toStop: string[] = [];
  if (avgPressure < targetPressure - 0.02 && stopped.length > 0 && running.length < plantPumps.length - 1) {
    stopped.sort((a, b) => b.efficiency - a.efficiency);
    toStart.push(stopped[0].id);
  } else if (avgPressure > targetPressure + 0.02 && running.length > 1) {
    running.sort((a, b) => a.efficiency - b.efficiency);
    toStop.push(running[0].id);
  }
  return { toStart, toStop };
};

export const togglePump = (pumpId: string, start: boolean): Pump | null => {
  const pump = db.pumps.get(pumpId);
  if (!pump || pump.status === 'maintenance' || pump.status === 'fault') return null;
  if (start && pump.status === 'stopped') {
    pump.status = 'running';
    pump.power = pump.ratedPower * db.rnd(0.8, 0.95, 3);
    pump.flow = db.rnd(180, 260, 0);
    pump.efficiency = db.rnd(78, 90, 1);
    pump.startCount++;
    pump.lastStartAt = Date.now();
  } else if (!start && pump.status === 'running') {
    const duration = pump.lastStartAt ? (Date.now() - pump.lastStartAt) / hourMs : 1;
    const energy = +(pump.power * duration / 1000).toFixed(2);
    pump.totalEnergy += energy;
    pump.currentEnergy = 0;
    pump.runHours += duration;
    const rec: EnergyRecord = {
      id: db.uid('er'),
      pumpId,
      timestamp: Date.now(),
      energy,
      power: pump.power,
      flow: pump.flow,
      duration
    };
    db.energyRecords.set(rec.id, rec);
    pump.status = 'stopped';
    pump.power = 0;
    pump.flow = 0;
    pump.efficiency = 0;
    pump.lastStartAt = undefined;
  }
  return pump;
};

export const checkDrainageLevel = (): DrainagePump[] => {
  const started: DrainagePump[] = [];
  db.drainagePoints.forEach(dp => {
    const pumps = Array.from(db.drainagePumps.values()).filter(p => p.pointId === dp.id);
    const running = pumps.filter(p => p.status === 'running');
    if (dp.level >= dp.alarmLevel && running.length < pumps.length) {
      pumps.filter(p => p.status === 'stopped').forEach(p => {
        p.status = 'running';
        p.flow = db.rnd(800, 1000, 0);
        p.power = db.rnd(170, 220, 0);
        p.startTime = Date.now();
        started.push(p);
      });
      const existingAlarm = Array.from(db.alarms.values()).find(a => a.type === 'drainage' && a.level >= 2 && a.status !== 'resolved' && Date.now() - a.timestamp < 2 * hourMs);
      if (!existingAlarm) {
        const alarm: Alarm = {
          id: db.uid('alarm'),
          level: 3,
          type: 'drainage',
          parameter: '液位',
          value: dp.level,
          threshold: dp.alarmLevel,
          timestamp: Date.now(),
          status: 'pending',
          suggestion: `${dp.name}液位严重超标！已自动启动全部排涝泵，请立即通知市政部门和低洼地段居民`,
          pushedTo: ['dispatcher', '市政部门'],
        };
        db.alarms.set(alarm.id, alarm);
      }
    } else if (dp.level >= dp.warningLevel && running.length === 0 && pumps.length > 0) {
      pumps[0].status = 'running';
      pumps[0].flow = db.rnd(750, 900, 0);
      pumps[0].power = db.rnd(160, 190, 0);
      pumps[0].startTime = Date.now();
      started.push(pumps[0]);
    } else if (dp.level < dp.warningLevel - 0.1 && running.length > 0) {
      running.forEach(p => {
        if (p.startTime) p.totalRunTime += (Date.now() - p.startTime) / hourMs;
        p.status = 'stopped';
        p.flow = 0;
        p.power = 0;
        p.startTime = undefined;
      });
    }
  });
  return started;
};

export const checkSewageStages = (): WorkOrder[] => {
  const newOrders: WorkOrder[] = [];
  db.sewageStages.forEach(stage => {
    const codBad = stage.cod > stage.threshold.cod;
    const anBad = stage.ammoniaNitrogen > stage.threshold.ammoniaNitrogen;
    const codRemBad = stage.order > 1 && stage.order < 8 && stage.codRemoval < stage.threshold.codRemoval;
    const anRemBad = stage.order > 1 && stage.order < 8 && stage.ammoniaRemoval < stage.threshold.ammoniaRemoval;
    const bad = codBad || anBad || codRemBad || anRemBad;
    if (bad) {
      stage.status = stage.order === 5 && (codRemBad || anRemBad) ? 'alarm' : 'warning';
      stage.deviceIds.forEach(did => {
        const dev = db.sewageDevices.get(did);
        if (dev && dev.status !== 'locked' && stage.order === 5) {
          dev.status = 'locked';
          dev.lockedBy = 'system';
          dev.lockedAt = Date.now();
          dev.lockReason = (codBad ? 'COD' : codRemBad ? 'COD去除率' : anBad ? '氨氮' : '氨氮去除率') + '超标';
        }
      });
      const existingWO = Array.from(db.workOrders.values()).find(w =>
        w.stageId === stage.id && w.type === 'sewage' && !['completed', 'upgraded'].includes(w.status)
      );
      if (!existingWO) {
        const wo: WorkOrder = {
          id: db.uid('wo'),
          title: `${stage.name}${codBad ? 'COD' : codRemBad ? 'COD去除率' : anBad ? '氨氮' : '氨氮去除率'}超标`,
          type: 'sewage',
          priority: stage.order === 5 ? 'urgent' : 'high',
          description: `${stage.name}指标异常，已锁定相关设备，请立即处置`,
          area: db.waterSources.get(db.waterSources.get(stage.plantId)?.id || '')?.area || '东城区',
          plantId: stage.plantId,
          stageId: stage.id,
          reporterId: 'system',
          photos: {},
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        db.workOrders.set(wo.id, wo);
        newOrders.push(wo);
        const alarm: Alarm = {
          id: db.uid('alarm'),
          plantId: stage.plantId,
          stageId: stage.id,
          level: stage.order === 5 ? 3 : 2,
          type: 'sewage',
          parameter: codBad ? 'COD' : codRemBad ? 'COD去除率' : anBad ? '氨氮' : '氨氮去除率',
          value: codBad ? stage.cod : codRemBad ? stage.codRemoval : anBad ? stage.ammoniaNitrogen : stage.ammoniaRemoval,
          threshold: codBad ? stage.threshold.cod : codRemBad ? stage.threshold.codRemoval : anBad ? stage.threshold.ammoniaNitrogen : stage.threshold.ammoniaRemoval,
          timestamp: Date.now(),
          status: 'pending',
          suggestion: `${stage.name}设备已锁定，建议检查设备运行状态，必要时启动备用工艺`,
          pushedTo: stage.order === 5 ? ['dispatcher', stage.plantId, '集团技术中心'] : ['dispatcher', stage.plantId],
        };
        db.alarms.set(alarm.id, alarm);
      }
    } else {
      stage.status = 'normal';
    }
  });
  return newOrders;
};

export const checkWorkOrderEscalation = (): WorkOrder[] => {
  const upgraded: WorkOrder[] = [];
  const now = Date.now();
  const { workOrderHours, sewageHours } = db.systemConfig.upgradeRules;
  db.workOrders.forEach(wo => {
    if (['completed', 'upgraded'].includes(wo.status)) return;
    const threshold = wo.type === 'sewage' ? sewageHours * hourMs : workOrderHours * hourMs;
    if (now - wo.createdAt > threshold && !wo.upgradedTo) {
      wo.upgradedTo = wo.type === 'sewage' ? 'u-007' : 'u-003';
      wo.upgradeReason = `超${wo.type === 'sewage' ? sewageHours : workOrderHours}小时未${wo.status === 'pending' ? '处置' : '闭环'}`;
      wo.status = 'upgraded';
      wo.escalatedAt = now;
      wo.updatedAt = now;
      upgraded.push(wo);
      const alarm: Alarm = {
        id: db.uid('alarm'),
        level: wo.type === 'sewage' ? 3 : 2,
        type: 'workorder',
        parameter: '工单超时',
        value: Math.floor((now - wo.createdAt) / hourMs),
        threshold: Math.floor(threshold / hourMs),
        timestamp: now,
        status: 'pending',
        suggestion: `工单【${wo.title}】已自动升级，请片区主管/技术中心介入处置`,
        pushedTo: wo.type === 'sewage' ? ['dispatcher', '集团技术中心'] : ['dispatcher', '片区主管'],
      };
      db.alarms.set(alarm.id, alarm);
    }
  });
  return upgraded;
};

export const checkBillingAndReminders = (): { bills: Bill[]; smsSent: number; valveOrders: number } => {
  const now = Date.now();
  const dayMs = 24 * hourMs;
  const { overdueDays, suspendMonths, lateFeeRate } = db.systemConfig.reminderRules;
  let smsSent = 0;
  let valveOrders = 0;
  const affectedBills: Bill[] = [];
  db.bills.forEach(bill => {
    if (bill.status === 'paid') return;
    const overdue = Math.max(0, Math.floor((now - bill.dueDate) / dayMs));
    if (overdue > 0 && bill.status === 'unpaid') {
      bill.status = 'overdue';
    }
    if (overdue > 0) {
      bill.lateFee = +(bill.baseAmount * lateFeeRate * overdue).toFixed(2);
      bill.totalAmount = +(bill.baseAmount + bill.lateFee).toFixed(2);
    }
    if (overdue >= overdueDays && bill.reminders.filter(r => r.type === 'sms').length < 3) {
      bill.reminders.push({ date: now, type: 'sms', sent: true });
      smsSent++;
    }
    if (overdue >= suspendMonths * 30 && !bill.valveOrder && bill.status !== 'suspend') {
      bill.status = 'suspend';
      const customer = db.customers.get(bill.customerId);
      if (customer) {
        customer.status = 'suspended';
        bill.valveOrder = {
          id: db.uid('vo'),
          billId: bill.id,
          customerId: bill.customerId,
          createdAt: now,
          status: 'pending',
        };
        valveOrders++;
      }
    }
    if (bill.reminders.length > 0 || bill.lateFee > 0) affectedBills.push(bill);
  });
  return { bills: affectedBills, smsSent, valveOrders };
};

export const updatePressurePoints = (): PressurePoint[] => {
  const updated: PressurePoint[] = [];
  db.pressurePoints.forEach(pp => {
    const delta = db.rnd(-0.012, 0.012, 4);
    pp.pressure = +Math.max(0.2, Math.min(0.5, pp.pressure + delta)).toFixed(3);
    const { min, max } = db.systemConfig.pressureRange;
    pp.status = pp.pressure < min ? 'low' : pp.pressure > max ? 'high' : 'normal';
    pp.timestamp = Date.now();
    updated.push(pp);
    if (pp.status === 'low') {
      const existAlarm = Array.from(db.alarms.values()).find(a => a.type === 'pressure' && a.level === 1 && a.status !== 'resolved' && Date.now() - a.timestamp < 2 * hourMs);
      if (!existAlarm) {
        const a: Alarm = {
          id: db.uid('alarm'),
          level: 1,
          type: 'pressure',
          parameter: '压力',
          value: pp.pressure,
          threshold: min,
          timestamp: Date.now(),
          status: 'pending',
          suggestion: `${pp.name}压力偏低，建议检查该片区管网泄漏情况并增开加压泵`,
          pushedTo: ['dispatcher', pp.plantId],
        };
        db.alarms.set(a.id, a);
      }
    }
  });
  return updated;
};

export const getProductionTrend = (hours = 24) => {
  const data: { time: string; production: number; consumption: number }[] = [];
  const now = Date.now();
  for (let i = hours - 1; i >= 0; i--) {
    const t = new Date(now - i * hourMs);
    const h = t.getHours();
    const seasonal = (h >= 6 && h <= 9) || (h >= 17 && h <= 21) ? 1.3 : h >= 1 && h <= 5 ? 0.65 : 1.0;
    const base = 42000 * seasonal;
    data.push({
      time: `${t.getHours().toString().padStart(2, '0')}:00`,
      production: Math.round(base + Math.random() * 3000),
      consumption: Math.round(base * 0.92 + Math.random() * 2500)
    });
  }
  return data;
};

export const getMonthlyEnergy = (months = 12) => {
  const data: { month: string; energy: number; cost: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = 280000 + Math.round(Math.random() * 80000);
    data.push({
      month: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      energy: e,
      cost: Math.round(e * 0.78)
    });
  }
  return data;
};

export const exportMonthlyReport = (type: 'operation' | 'energy', month?: string): string => {
  const header = type === 'operation'
    ? ['指标', '数值', '单位', '环比']
    : ['月份', '能耗(kWh)', '电费(元)', '单位水耗(kWh/m³)'];
  let rows: string[][] = [];
  if (type === 'operation') {
    const stats = getDashboardStats();
    rows = [
      ['总产水量', stats.totalProduction.toFixed(0), 'm³', '+2.3%'],
      ['平均供水压力', stats.avgPressure.toFixed(3), 'MPa', '-0.5%'],
      ['水质达标率', stats.waterQualityRate.toFixed(1), '%', '+0.8%'],
      ['巡检完成率', stats.inspectionRate.toFixed(1), '%', '+1.2%'],
      ['未处理报警数', String(stats.activeAlarms), '个', '-3'],
      ['总能耗', stats.totalEnergy.toFixed(0), 'kWh', '+1.8%'],
    ];
  } else {
    rows = getMonthlyEnergy().map(r => [r.month, String(r.energy), String(r.cost), (r.energy / 42000).toFixed(3)]);
  }
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const getDashboardStats = () => {
  const production = Array.from(db.pumps.values()).filter(p => p.status === 'running').reduce((s, p) => s + p.flow * 3.6, 0);
  const pp = Array.from(db.pressurePoints.values());
  const avgPressure = pp.reduce((s, p) => s + p.pressure, 0) / pp.length;
  const qData = Array.from(db.waterQualityData.values()).filter(d => Date.now() - d.timestamp < 24 * hourMs);
  const th = db.systemConfig.waterQualityThresholds;
  const qOK = qData.filter(d => d.turbidity < th.turbidity.warning && d.ph >= th.ph.min && d.ph <= th.ph.max && d.cod < th.cod.warning).length;
  const tasks = Array.from(db.inspectionTasks.values());
  const compTasks = tasks.filter(t => t.status === 'completed').length;
  const activeAlarms = Array.from(db.alarms.values()).filter(a => a.status !== 'resolved').length;
  const totalEnergy = Array.from(db.pumps.values()).reduce((s, p) => s + p.totalEnergy, 0);
  return {
    totalProduction: Math.round(production),
    avgPressure,
    waterQualityRate: qData.length > 0 ? (qOK / qData.length) * 100 : 98.5,
    inspectionRate: tasks.length > 0 ? (compTasks / tasks.length) * 100 : 95,
    activeAlarms,
    totalEnergy: Math.round(totalEnergy)
  };
};
