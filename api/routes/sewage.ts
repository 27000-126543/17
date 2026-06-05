import { Router, type Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../database.js';
import { checkSewageStages } from '../services.js';

const router = Router();

router.get('/stages', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const plantId = req.query.plantId as string;
  let stages = Array.from(db.sewageStages.values());
  if (plantId) stages = stages.filter(s => s.plantId === plantId);
  if (req.user.role === 'plant_leader') stages = stages.filter(s => s.plantId === req.user!.plantId);
  stages.sort((a, b) => a.plantId.localeCompare(b.plantId) || a.order - b.order);
  res.json({ success: true, data: stages });
});

router.get('/stages/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const stage = db.sewageStages.get(req.params.id);
  if (!stage) { res.status(404).json({ success: false, error: '工艺段不存在' }); return; }
  if (req.user.role === 'plant_leader' && stage.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  res.json({ success: true, data: stage });
});

router.post('/stages/collect', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const newOrders = checkSewageStages();
  res.json({ success: true, data: { newWorkOrders: newOrders.length } });
});

router.get('/devices', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const stageId = req.query.stageId as string;
  let devices = Array.from(db.sewageDevices.values());
  if (stageId) devices = devices.filter(d => d.stageId === stageId);
  if (req.user.role === 'plant_leader') {
    const stages = Array.from(db.sewageStages.values()).filter(s => s.plantId === req.user!.plantId).map(s => s.id);
    devices = devices.filter(d => stages.includes(d.stageId));
  }
  res.json({ success: true, data: devices });
});

router.post('/devices/:id/unlock', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const dev = db.sewageDevices.get(req.params.id);
  if (!dev) { res.status(404).json({ success: false, error: '设备不存在' }); return; }
  const stage = db.sewageStages.get(dev.stageId);
  if (stage && req.user.role === 'plant_leader' && stage.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (dev.status !== 'locked') { res.status(400).json({ success: false, error: '设备未锁定' }); return; }
  dev.status = 'stopped';
  dev.lockedBy = undefined;
  dev.lockedAt = undefined;
  dev.lockReason = undefined;
  res.json({ success: true, data: dev });
});

export default router;
