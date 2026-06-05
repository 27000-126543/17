import { Router, type Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../database.js';
import { getDashboardStats, getProductionTrend, getMonthlyEnergy, exportMonthlyReport, generateWaterQualityData, checkWaterQualityAlarms, updatePressurePoints, checkWorkOrderEscalation, checkDrainageLevel, checkSewageStages, checkBillingAndReminders, togglePump, calculatePumpCombination } from '../services.js';

const router = Router();

router.get('/stats', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const stats = getDashboardStats();
  res.json({ success: true, data: stats });
});

router.get('/production-trend', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const hours = parseInt(req.query.hours as string) || 24;
  res.json({ success: true, data: getProductionTrend(hours) });
});

router.get('/monthly-energy', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const months = parseInt(req.query.months as string) || 12;
  res.json({ success: true, data: getMonthlyEnergy(months) });
});

router.get('/pressure-points', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  let points = Array.from(db.pressurePoints.values());
  if (req.user.role === 'plant_leader') points = points.filter(p => p.plantId === req.user!.plantId);
  if (req.user.role === 'inspector') points = points.filter(p => p.area === req.user!.area);
  res.json({ success: true, data: points });
});

router.get('/alarms', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  let alarms = Array.from(db.alarms.values()).sort((a, b) => b.timestamp - a.timestamp);
  if (req.user.role === 'plant_leader') {
    alarms = alarms.filter(a => !a.plantId || a.plantId === req.user!.plantId);
  }
  if (req.user.role === 'inspector') {
    alarms = alarms.filter(a => a.level >= 2);
  }
  res.json({ success: true, data: alarms.slice(0, 50) });
});

router.post('/alarms/:id/acknowledge', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const alarm = db.alarms.get(req.params.id);
  if (!alarm) { res.status(404).json({ success: false, error: '报警不存在' }); return; }
  alarm.status = 'processing';
  alarm.acknowledgedBy = req.user.id;
  res.json({ success: true, data: alarm });
});

router.post('/alarms/:id/resolve', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const alarm = db.alarms.get(req.params.id);
  if (!alarm) { res.status(404).json({ success: false, error: '报警不存在' }); return; }
  alarm.status = 'resolved';
  alarm.resolvedBy = req.user.id;
  alarm.resolvedAt = Date.now();
  res.json({ success: true, data: alarm });
});

router.get('/tick', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const qData = generateWaterQualityData();
  const qAlarms = checkWaterQualityAlarms(qData);
  const pp = updatePressurePoints();
  Array.from(new Set(pp.map(p => p.plantId))).forEach(plantId => {
    const { toStart, toStop } = calculatePumpCombination(plantId);
    toStart.forEach(id => togglePump(id, true));
    toStop.forEach(id => togglePump(id, false));
  });
  const drainagePumps = checkDrainageLevel();
  const sewWO = checkSewageStages();
  const woUpgraded = checkWorkOrderEscalation();
  const billing = checkBillingAndReminders();
  res.json({
    success: true,
    data: {
      qualityDataCount: qData.length,
      newAlarms: qAlarms.length,
      drainagePumpsStarted: drainagePumps.length,
      sewageWorkOrders: sewWO.length,
      workOrdersUpgraded: woUpgraded.length,
      billingUpdated: billing.bills.length,
      smsSent: billing.smsSent,
      valveOrdersCreated: billing.valveOrders,
    }
  });
});

router.get('/export/:type', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const { type } = req.params;
  const month = req.query.month as string;
  if (!['operation', 'energy'].includes(type)) {
    res.status(400).json({ success: false, error: '不支持的报表类型' }); return;
  }
  const csv = exportMonthlyReport(type as 'operation' | 'energy', month);
  const filename = `${type === 'operation' ? '月度运营分析' : '能耗成本'}_${month || new Date().toISOString().slice(0, 7)}.csv`;
  const encodedFilename = encodeURIComponent(filename);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
  res.send('\uFEFF' + csv);
});

router.get('/config', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  res.json({ success: true, data: db.systemConfig });
});

router.put('/config', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  db.systemConfig = { ...db.systemConfig, ...req.body };
  res.json({ success: true, data: db.systemConfig });
});

export default router;
