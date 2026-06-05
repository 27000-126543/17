import type { Request, Response, NextFunction } from 'express';
import { db } from '../database.js';
import type { UserRole, User } from '../types.js';

export interface AuthRequest extends Request {
  user?: User;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;
  const token = req.headers['x-auth-token'] as string;
  if (!userId || !token) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }
  const user = db.users.get(userId);
  if (!user) {
    res.status(401).json({ success: false, error: '用户不存在' });
    return;
  }
  req.user = user;
  next();
};

export const requireRoles = (roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: '权限不足' });
    return;
  }
  next();
};

export const filterByScope = <T extends { plantId?: string; area?: string }>(
  items: T[],
  user: User
): T[] => {
  switch (user.role) {
    case 'admin':
    case 'dispatcher':
      return items;
    case 'plant_leader':
      return items.filter(i => i.plantId === user.plantId);
    case 'inspector':
      return items.filter(i => i.area === user.area);
    default:
      return [];
  }
};

export const canAccess = (item: { plantId?: string; area?: string }, user: User): boolean => {
  switch (user.role) {
    case 'admin':
    case 'dispatcher':
      return true;
    case 'plant_leader':
      return item.plantId === user.plantId;
    case 'inspector':
      return item.area === user.area;
    default:
      return false;
  }
};
