import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Droplets,
  Gauge,
  ScrollText,
  Waves,
  Filter,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type UserRole = 'inspector' | 'plant_leader' | 'dispatcher' | 'admin';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface SidebarProps {
  role?: UserRole;
}

const menuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: '数据总览',
    icon: <LayoutDashboard size={20} />,
    roles: ['inspector', 'plant_leader', 'dispatcher', 'admin'],
  },
  {
    path: '/water-source',
    label: '水源监测',
    icon: <Droplets size={20} />,
    roles: ['plant_leader', 'dispatcher', 'admin'],
  },
  {
    path: '/water-supply',
    label: '供水调度',
    icon: <Gauge size={20} />,
    roles: ['plant_leader', 'dispatcher', 'admin'],
  },
  {
    path: '/metering',
    label: '远程抄表',
    icon: <ScrollText size={20} />,
    roles: ['dispatcher', 'admin'],
  },
  {
    path: '/drainage',
    label: '排水管网',
    icon: <Waves size={20} />,
    roles: ['dispatcher', 'admin'],
  },
  {
    path: '/sewage',
    label: '污水处理',
    icon: <Filter size={20} />,
    roles: ['plant_leader', 'dispatcher', 'admin'],
  },
  {
    path: '/inspection',
    label: '巡检管理',
    icon: <ClipboardCheck size={20} />,
    roles: ['inspector', 'plant_leader', 'dispatcher', 'admin'],
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: <Settings size={20} />,
    roles: ['admin'],
  },
];

export default function Sidebar({ role = 'inspector' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const filteredItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        'relative h-full flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="absolute inset-0 bg-water-dark/80 backdrop-blur-xl" />

      <div className="absolute inset-0 overflow-hidden rounded-r-xl tech-border">
        <div className="absolute inset-0 bg-gradient-to-b from-water-cyan/5 via-transparent to-water-teal/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-water-cyan/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-water-teal/40 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div
          className={cn(
            'h-16 flex items-center border-b border-water-cyan/10',
            collapsed ? 'justify-center px-3' : 'px-5',
          )}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center shadow-lg shadow-water-cyan/30">
              <Droplets size={22} className="text-water-deep" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-water-green animate-pulse border-2 border-water-dark" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <h1 className="text-white font-bold text-lg tracking-wide">智慧水务</h1>
              <p className="text-water-cyan/70 text-xs">SMART WATER</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'group relative flex items-center rounded-lg transition-all duration-200',
                  collapsed ? 'h-11 justify-center px-0' : 'h-11 px-3',
                  isActive
                    ? 'bg-gradient-to-r from-water-cyan/20 to-water-teal/10 text-water-cyan'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-water-cyan to-water-teal shadow-lg shadow-water-cyan/50" />
                )}
                <span
                  className={cn(
                    'transition-transform duration-200',
                    isActive && 'scale-110',
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-water-cyan animate-pulse shadow-lg shadow-water-cyan/60" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="relative p-3 border-t border-water-cyan/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center justify-center h-10 rounded-lg',
              'text-slate-400 hover:text-water-cyan hover:bg-water-cyan/10',
              'transition-all duration-200 border border-transparent hover:border-water-cyan/30',
            )}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span className="ml-2 text-sm">收起菜单</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
