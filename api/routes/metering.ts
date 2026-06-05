import { Router, type Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../database.js';
import { checkBillingAndReminders } from '../services.js';
import type { Bill } from '../types.js';

const router = Router();

router.get('/customers', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const search = ((req.query.search as string) || '').toLowerCase();
  let customers = Array.from(db.customers.values());
  if (req.user.role === 'plant_leader') customers = customers.filter(c => c.plantId === req.user!.plantId);
  if (req.user.role === 'inspector') customers = customers.filter(c => c.area === req.user!.area);
  if (search) {
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.meterNo.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      c.address.toLowerCase().includes(search)
    );
  }
  res.json({ success: true, data: customers });
});

router.get('/customers/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const c = db.customers.get(req.params.id);
  if (!c) { res.status(404).json({ success: false, error: '用户不存在' }); return; }
  if (req.user.role === 'plant_leader' && c.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.user.role === 'inspector' && c.area !== req.user.area) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  res.json({ success: true, data: c });
});

router.post('/customers/:id/read', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader', 'inspector'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const c = db.customers.get(req.params.id);
  if (!c) { res.status(404).json({ success: false, error: '用户不存在' }); return; }
  if (req.user.role === 'plant_leader' && c.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (req.user.role === 'inspector' && c.area !== req.user.area) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const reading = req.body.reading || c.meterReading + Math.floor(Math.random() * 50);
  c.lastReading = c.meterReading;
  c.meterReading = reading;
  c.lastReadingDate = Date.now();
  const consumption = c.meterReading - c.lastReading;
  const period = new Date().toISOString().slice(0, 7);
  const tierAmounts: Bill['tierAmounts'] = [];
  let remain = consumption;
  const tiers = db.systemConfig.priceTiers;
  let used = 0;
  tiers.forEach(t => {
    const tc = Math.max(0, Math.min(remain, t.max - used));
    if (tc > 0) {
      tierAmounts.push({ tier: t.tier, consumption: tc, amount: +(tc * t.price).toFixed(2) });
      remain -= tc;
    }
    used += t.max - t.min;
  });
  const baseAmount = +tierAmounts.reduce((s, t) => s + t.amount, 0).toFixed(2);
  const billId = db.uid('bill');
  const bill: Bill = {
    id: billId, customerId: c.id, period,
    startReading: c.lastReading, endReading: c.meterReading, consumption,
    tierAmounts, baseAmount, lateFee: 0, totalAmount: baseAmount,
    paidAmount: 0, issueDate: Date.now(),
    dueDate: Date.now() + 25 * 24 * 3600 * 1000,
    status: 'unpaid', reminders: []
  };
  db.bills.set(billId, bill);
  res.json({ success: true, data: { customer: c, bill } });
});

router.get('/bills', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const status = req.query.status as string;
  const customerId = req.query.customerId as string;
  let bills = Array.from(db.bills.values());
  if (req.user.role === 'plant_leader' || req.user.role === 'inspector') {
    const customers = Array.from(db.customers.values()).filter(c => {
      if (req.user!.role === 'plant_leader') return c.plantId === req.user!.plantId;
      return c.area === req.user!.area;
    }).map(c => c.id);
    bills = bills.filter(b => customers.includes(b.customerId));
  }
  if (status) bills = bills.filter(b => b.status === status);
  if (customerId) bills = bills.filter(b => b.customerId === customerId);
  bills.sort((a, b) => b.issueDate - a.issueDate);
  res.json({ success: true, data: bills });
});

router.get('/bills/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const bill = db.bills.get(req.params.id);
  if (!bill) { res.status(404).json({ success: false, error: '账单不存在' }); return; }
  const c = db.customers.get(bill.customerId);
  if (c && req.user.role === 'plant_leader' && c.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  if (c && req.user.role === 'inspector' && c.area !== req.user.area) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  res.json({ success: true, data: { ...bill, customer: c } });
});

router.post('/bills/:id/pay', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const bill = db.bills.get(req.params.id);
  if (!bill) { res.status(404).json({ success: false, error: '账单不存在' }); return; }
  const amount = req.body.amount || bill.totalAmount;
  bill.paidAmount = +(bill.paidAmount + amount).toFixed(2);
  if (bill.paidAmount >= bill.totalAmount) {
    bill.status = 'paid';
    bill.paidAt = Date.now();
    const c = db.customers.get(bill.customerId);
    if (c && c.status === 'arrears') {
      const unpaid = Array.from(db.bills.values()).filter(b => b.customerId === c.id && !['paid', 'partial'].includes(b.status));
      if (unpaid.length === 0) c.status = 'normal';
    }
  } else {
    bill.status = 'partial';
  }
  res.json({ success: true, data: bill });
});

router.post('/bills/:id/remind', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher', 'plant_leader'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const bill = db.bills.get(req.params.id);
  if (!bill) { res.status(404).json({ success: false, error: '账单不存在' }); return; }
  const c = db.customers.get(bill.customerId);
  if (c && req.user.role === 'plant_leader' && c.plantId !== req.user.plantId) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const type = req.body.type || 'sms';
  bill.reminders.push({ date: Date.now(), type, sent: true });
  res.json({ success: true, data: { bill, message: `已向 ${c?.name || ''} 发送催缴${type === 'sms' ? '短信' : type === 'email' ? '邮件' : '通知单'}` } });
});

router.post('/bills/:id/valve-order', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (!['admin', 'dispatcher'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const bill = db.bills.get(req.params.id);
  if (!bill) { res.status(404).json({ success: false, error: '账单不存在' }); return; }
  if (bill.valveOrder) { res.status(400).json({ success: false, error: '关阀指令已存在' }); return; }
  const c = db.customers.get(bill.customerId);
  if (c) c.status = 'suspended';
  const inspector = Array.from(db.users.values()).find(u => u.role === 'inspector' && u.area === c?.area);
  bill.valveOrder = {
    id: db.uid('vo'), billId: bill.id, customerId: bill.customerId,
    createdAt: Date.now(), status: inspector ? 'assigned' : 'pending',
    assignedTo: inspector?.id,
  };
  bill.status = 'suspend';
  res.json({ success: true, data: bill.valveOrder });
});

router.post('/billing/check', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' }); return;
  }
  const result = checkBillingAndReminders();
  res.json({ success: true, data: result });
});

export default router;
