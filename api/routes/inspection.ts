import { Router, type Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../database.js';
import { checkWorkOrderEscalation } from '../services.js';
import type { InspectionTask, WorkOrder, WorkOrderPriority } from '../types.js';

const router = Router();

router.get('/tasks', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  let tasks = Array.from(db.inspectionTasks.values());
  if (req.user.role === 'inspector') tasks = tasks.filter(t => t.inspectorId === req.user!.id);
  else if (req.user.role === 'plant_leader') tasks = tasks.filter(t => {
    const inspector = db.users.get(t.inspectorId);
    return inspector?.plantId === req.user!.plantId;
  });
  tasks.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ success: true, data: tasks });
});

router.get('/tasks/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const task = db.inspectionTasks.get(req.params.id);
  if (!task) { res.status(404).json({ success: false, error: '任务不存在' }); return; }
  if (req.user.role === 'inspector' && task.inspectorId !== req.user.id) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.user.role === 'plant_leader') {
    const inspector = db.users.get(task.inspectorId);
    if (inspector?.plantId !== req.user.plantId) { res.status(403).json({ success: false, error: '权限不足' }); return; }
  }
  res.json({ success: true, data: task });
});

router.post('/tasks/:id/checkpoint/:cpId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'inspector'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const task = db.inspectionTasks.get(req.params.id);
  if (!task) { res.status(404).json({ success: false, error: '任务不存在' }); return; }
  if (task.inspectorId !== req.user.id && req.user.role === 'inspector') {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const cp = task.checkPoints.find(c => c.id === req.params.cpId);
  if (!cp) { res.status(404).json({ success: false, error: '检查点不存在' }); return; }
  cp.checked = true;
  cp.checkedAt = Date.now();
  cp.photoUrl = req.body.photoUrl;
  if (task.status === 'pending') task.status = 'in_progress';
  if (task.checkPoints.every(c => c.checked)) {
    task.status = 'completed';
    task.completedAt = Date.now();
  }
  res.json({ success: true, data: task });
});

router.post('/tasks/generate', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !['admin', 'dispatcher'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const areas = req.body.areas || ['东城区', '西城区', '北城区', '崇明区'];
  const created: InspectionTask[] = [];
  areas.forEach((area: string) => {
    const inspector = Array.from(db.users.values()).find(u => u.role === 'inspector' && u.area === area);
    if (!inspector) return;
    const cps = Array.from({ length: 3 }, (_, i) => ({
      id: db.uid('cp'), name: `${area}${i + 1}#巡检点`,
      lng: 121.4 + Math.random() * 0.2, lat: 31.1 + Math.random() * 0.3,
      checked: false
    }));
    const task: InspectionTask = {
      id: db.uid('task'),
      title: `${area}${new Date().toLocaleDateString('zh-CN')}巡检任务`,
      area, inspectorId: inspector.id,
      route: cps.map(c => c.id), status: 'pending',
      createdAt: Date.now(), dueDate: Date.now() + 3 * 24 * 3600 * 1000,
      checkPoints: cps
    };
    db.inspectionTasks.set(task.id, task);
    created.push(task);
  });
  res.json({ success: true, data: created });
});

router.get('/work-orders', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const status = req.query.status as string;
  const priority = req.query.priority as string;
  let orders = Array.from(db.workOrders.values());
  if (req.user.role === 'inspector') {
    orders = orders.filter(w => w.reporterId === req.user!.id || w.assigneeId === req.user!.id);
  } else if (req.user.role === 'plant_leader') {
    orders = orders.filter(w => w.plantId === req.user!.plantId);
  }
  if (status) orders = orders.filter(w => w.status === status);
  if (priority) orders = orders.filter(w => w.priority === priority);
  orders.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ success: true, data: orders });
});

router.get('/work-orders/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const wo = db.workOrders.get(req.params.id);
  if (!wo) { res.status(404).json({ success: false, error: '工单不存在' }); return; }
  if (req.user.role === 'inspector' && wo.reporterId !== req.user.id && wo.assigneeId !== req.user.id) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.user.role === 'plant_leader' && wo.plantId && wo.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  res.json({ success: true, data: wo });
});

router.post('/work-orders', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'inspector'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const { title, type, priority, description, area, plantId, stageId, photos } = req.body;
  const wo: WorkOrder = {
    id: db.uid('wo'), title: title || '异常工单',
    type: type || 'device',
    priority: (priority as WorkOrderPriority) || 'medium',
    description: description || '',
    area: area || req.user.area,
    plantId: plantId || (req.user.role === 'plant_leader' ? req.user.plantId : undefined),
    stageId, reporterId: req.user.id,
    photos: photos || {},
    status: 'pending', createdAt: Date.now(), updatedAt: Date.now()
  };
  if (wo.priority === 'urgent') {
    const dispatcher = Array.from(db.users.values()).find(u => u.role === 'dispatcher');
    wo.assigneeId = dispatcher?.id;
    wo.status = 'assigned';
  }
  db.workOrders.set(wo.id, wo);
  res.json({ success: true, data: wo });
});

router.put('/work-orders/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const wo = db.workOrders.get(req.params.id);
  if (!wo) { res.status(404).json({ success: false, error: '工单不存在' }); return; }
  if (req.user.role === 'inspector' && wo.reporterId !== req.user.id && wo.assigneeId !== req.user.id) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.user.role === 'plant_leader' && wo.plantId && wo.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  Object.assign(wo, req.body);
  wo.updatedAt = Date.now();
  if (req.body.status === 'completed' && !wo.completedAt) wo.completedAt = Date.now();
  res.json({ success: true, data: wo });
});

router.post('/work-orders/:id/complete', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const wo = db.workOrders.get(req.params.id);
  if (!wo) { res.status(404).json({ success: false, error: '工单不存在' }); return; }
  if (req.user.role === 'inspector' && wo.reporterId !== req.user.id && wo.assigneeId !== req.user.id) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.body.beforePhotos || req.body.afterPhotos) {
    wo.photos = {
      before: [...(wo.photos.before || []), ...(req.body.beforePhotos || [])],
      after: [...(wo.photos.after || []), ...(req.body.afterPhotos || [])]
    };
  }
  if (!wo.photos.after || wo.photos.after.length === 0) {
    res.status(400).json({ success: false, error: '请上传修复后对比照片' }); return;
  }
  wo.status = 'completed';
  wo.completedAt = Date.now();
  wo.updatedAt = Date.now();
  res.json({ success: true, data: wo });
});

router.post('/work-orders/:id/upgrade', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !['admin', 'dispatcher'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const wo = db.workOrders.get(req.params.id);
  if (!wo) { res.status(404).json({ success: false, error: '工单不存在' }); return; }
  const target = req.body.targetRole === 'tech_center' ? 'u-007' : 'u-003';
  wo.upgradedTo = target;
  wo.upgradeReason = req.body.reason || '手动升级';
  wo.status = 'upgraded';
  wo.escalatedAt = Date.now();
  wo.updatedAt = Date.now();
  res.json({ success: true, data: wo });
});

router.post('/check-escalation', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const upgraded = checkWorkOrderEscalation();
  res.json({ success: true, data: { upgradedCount: upgraded.length, upgraded } });
});

export default router;
