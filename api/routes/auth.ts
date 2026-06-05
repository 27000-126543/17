import { Router, type Request, type Response } from 'express';
import { db } from '../database.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const user = Array.from(db.users.values()).find(u => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
    return;
  }
  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser, token: `token_${user.id}_${Date.now()}` } });
});

router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, message: '已退出登录' });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const { password: _, ...safeUser } = req.user!;
  res.json({ success: true, data: safeUser });
});

router.get('/users', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' });
    return;
  }
  const users = Array.from(db.users.values()).map(u => {
    const { password: _, ...safe } = u;
    return safe;
  });
  res.json({ success: true, data: users });
});

router.post('/users', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' });
    return;
  }
  const data = req.body;
  const id = db.uid('u');
  const newUser = { id, ...data, password: data.password || '123456' };
  db.users.set(id, newUser);
  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, data: safeUser });
});

router.put('/users/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' });
    return;
  }
  const existing = db.users.get(req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: '用户不存在' });
    return;
  }
  const updated = { ...existing, ...req.body };
  db.users.set(req.params.id, updated);
  const { password: _, ...safeUser } = updated;
  res.json({ success: true, data: safeUser });
});

router.delete('/users/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' });
    return;
  }
  db.users.delete(req.params.id);
  res.json({ success: true });
});

export default router;
