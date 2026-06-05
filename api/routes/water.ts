import { Router, type Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../database.js';
import { generateWaterQualityData, checkWaterQualityAlarms, togglePump, calculatePumpCombination, updatePressurePoints } from '../services.js';

const router = Router();

const filterSources = (items: any[], user: any) => {
  if (user.role === 'admin' || user.role === 'dispatcher') return items;
  if (user.role === 'plant_leader') return items.filter((i: any) => i.plantId === user.plantId);
  if (user.role === 'inspector') return items.filter((i: any) => i.area === user.area);
  return [];
};

router.get('/sources', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const sources = filterSources(Array.from(db.waterSources.values()), req.user);
  res.json({ success: true, data: sources });
});

router.get('/sources/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const source = db.waterSources.get(req.params.id);
  if (!source) { res.status(404).json({ success: false, error: '水源不存在' }); return; }
  if (req.user.role === 'plant_leader' && source.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.user.role === 'inspector' && source.area !== req.user.area) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  res.json({ success: true, data: source });
});

router.get('/quality-history', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const sourceId = req.query.sourceId as string;
  const hours = parseInt(req.query.hours as string) || 168;
  let data = Array.from(db.waterQualityData.values());
  if (sourceId) data = data.filter(d => d.sourceId === sourceId);
  data = data.filter(d => Date.now() - d.timestamp < hours * 3600 * 1000);
  if (req.user.role === 'plant_leader' || req.user.role === 'inspector') {
    const allowedSources = Array.from(db.waterSources.values()).filter(s => {
      if (req.user!.role === 'plant_leader') return s.plantId === req.user!.plantId;
      return s.area === req.user!.area;
    }).map(s => s.id);
    data = data.filter(d => allowedSources.includes(d.sourceId));
  }
  data.sort((a, b) => a.timestamp - b.timestamp);
  res.json({ success: true, data });
});

router.post('/quality/collect', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const newData = generateWaterQualityData();
  const alarms = checkWaterQualityAlarms(newData);
  res.json({ success: true, data: { collected: newData.length, newAlarms: alarms.length } });
});

router.get('/pumps', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const pumps = filterSources(Array.from(db.pumps.values()), req.user);
  res.json({ success: true, data: pumps });
});

router.post('/pumps/:id/toggle', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const pump = db.pumps.get(req.params.id);
  if (!pump) { res.status(404).json({ success: false, error: '水泵不存在' }); return; }
  if (req.user.role === 'plant_leader' && pump.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const start = pump.status === 'stopped';
  const updated = togglePump(pump.id, start);
  if (!updated) { res.status(400).json({ success: false, error: '水泵状态无法操作' }); return; }
  res.json({ success: true, data: updated });
});

router.post('/pumps/smart-adjust', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  let plantId = req.body.plantId;
  if (req.user.role === 'plant_leader') plantId = req.user.plantId;
  const plantIds = plantId ? [plantId] : Array.from(new Set(Array.from(db.pumps.values()).map(p => p.plantId)));
  const results: Record<string, { started: string[]; stopped: string[] }> = {};
  plantIds.forEach((pid: string) => {
    const { toStart, toStop } = calculatePumpCombination(pid);
    toStart.forEach((id: string) => togglePump(id, true));
    toStop.forEach((id: string) => togglePump(id, false));
    results[pid] = { started: toStart, stopped: toStop };
  });
  res.json({ success: true, data: results });
});

router.get('/pressure', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  updatePressurePoints();
  const points = filterSources(Array.from(db.pressurePoints.values()), req.user);
  res.json({ success: true, data: points });
});

router.get('/energy-records', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const pumpId = req.query.pumpId as string;
  let records = Array.from(db.energyRecords.values());
  if (pumpId) records = records.filter(r => r.pumpId === pumpId);
  if (req.user.role === 'plant_leader') {
    const allowedPumps = Array.from(db.pumps.values()).filter(p => p.plantId === req.user!.plantId).map(p => p.id);
    records = records.filter(r => allowedPumps.includes(r.pumpId));
  }
  records.sort((a, b) => b.timestamp - a.timestamp);
  res.json({ success: true, data: records.slice(0, 200) });
});

export default router;
