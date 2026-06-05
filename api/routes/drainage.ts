import { Router, type Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../database.js';
import { checkDrainageLevel } from '../services.js';

const router = Router();

router.get('/points', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  checkDrainageLevel();
  let points = Array.from(db.drainagePoints.values());
  if (req.user.role === 'inspector') points = points.filter(p => p.area === req.user!.area);
  res.json({ success: true, data: points });
});

router.get('/points/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const p = db.drainagePoints.get(req.params.id);
  if (!p) { res.status(404).json({ success: false, error: '监测点不存在' }); return; }
  if (req.user.role === 'inspector' && p.area !== req.user.area) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  res.json({ success: true, data: p });
});

router.get('/pumps', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const pointId = req.query.pointId as string;
  let pumps = Array.from(db.drainagePumps.values());
  if (pointId) pumps = pumps.filter(p => p.pointId === pointId);
  if (req.user.role === 'inspector') {
    const points = Array.from(db.drainagePoints.values()).filter(p => p.area === req.user!.area).map(p => p.id);
    pumps = pumps.filter(p => points.includes(p.pointId));
  }
  res.json({ success: true, data: pumps });
});

router.post('/pumps/:id/toggle', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const pump = db.drainagePumps.get(req.params.id);
  if (!pump) { res.status(404).json({ success: false, error: '排涝泵不存在' }); return; }
  const dp = db.drainagePoints.get(pump.pointId);
  const start = pump.status === 'stopped';
  if (start) {
    pump.status = 'running';
    pump.flow = 800 + Math.random() * 200;
    pump.power = 170 + Math.random() * 40;
    pump.startTime = Date.now();
  } else {
    pump.status = 'stopped';
    if (pump.startTime) {
      pump.totalRunTime += (Date.now() - pump.startTime) / 3600000;
    }
    pump.flow = 0;
    pump.power = 0;
    pump.startTime = undefined;
  }
  res.json({ success: true, data: pump });
});

router.post('/check', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const started = checkDrainageLevel();
  const warnings = Array.from(db.riskWarnings.values()).filter(w => w.type === 'flood' && w.status === 'active');
  res.json({ success: true, data: { startedPumps: started.length, activeWarnings: warnings.length } });
});

router.get('/warnings', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  let warnings = Array.from(db.riskWarnings.values()).sort((a, b) => b.timestamp - a.timestamp);
  if (req.user.role === 'inspector') warnings = warnings.filter(w => w.area === req.user!.area);
  res.json({ success: true, data: warnings });
});

export default router;
