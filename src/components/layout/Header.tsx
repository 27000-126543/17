import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Maximize,
  Minimize,
  ChevronDown,
  LogOut,
  User as UserIcon,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from './Sidebar';

interface AlarmItem {
  id: string;
  title: string;
  level: 'critical' | 'warning' | 'info';
  time: string;
}

interface HeaderProps {
  userName?: string;
  role?: UserRole;
  alarmCount?: number;
  alarms?: AlarmItem[];
  onLogout?: () => void;
}

const roleLabels: Record<UserRole, string> = {
  inspector: '巡线员',
  plant_leader: '水厂组长',
  dispatcher: '调度中心',
  admin: '系统管理员',
};

const defaultAlarms: AlarmItem[] = [
  { id: '1', title: '2号泵站压力超标', level: 'critical', time: '2分钟前' },
  { id: '2', title: '沉淀池浊度偏高', level: 'warning', time: '15分钟前' },
  { id: '3', title: '设备离线提醒', level: 'info', time: '1小时前' },
];

export default function Header({
  userName = '管理员',
  role = 'admin',
  alarmCount = 3,
  alarms = defaultAlarms,
  onLogout,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const alarmRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alarmRef.current && !alarmRef.current.contains(e.target as Node)) {
        setShowAlarmPanel(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];
    return `${year}年${month}月${day}日 星期${weekDay}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const getAlarmColor = (level: AlarmItem['level']) => {
    switch (level) {
      case 'critical':
        return 'text-water-red bg-water-red/15 border-water-red/30';
      case 'warning':
        return 'text-water-yellow bg-water-yellow/15 border-water-yellow/30';
      case 'info':
        return 'text-water-cyan bg-water-cyan/15 border-water-cyan/30';
    }
  };

  const getAlarmIcon = (level: AlarmItem['level']) => {
    if (level === 'critical' || level === 'warning') {
      return <AlertTriangle size={14} />;
    }
    return <Bell size={14} />;
  };

  return (
    <header className="relative h-16 flex items-center justify-between px-6">
      <div className="absolute inset-0 bg-water-dark/60 backdrop-blur-xl" />
      <div className="absolute inset-0 tech-border">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-water-cyan/30 to-transparent" />
      </div>

      <div className="relative z-10 flex items-center">
        <div className="text-water-cyan/80">
          <span className="data-number text-lg font-medium tracking-wider text-water-cyan glow-text">
            {formatTime(currentTime)}
          </span>
          <span className="ml-4 text-sm text-slate-400">{formatDate(currentTime)}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div className="relative" ref={alarmRef}>
          <button
            onClick={() => setShowAlarmPanel(!showAlarmPanel)}
            className={cn(
              'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
              'border border-transparent',
              showAlarmPanel
                ? 'bg-water-cyan/15 text-water-cyan border-water-cyan/30'
                : 'text-slate-400 hover:text-water-cyan hover:bg-water-cyan/10 hover:border-water-cyan/20',
            )}
          >
            <Bell size={20} />
            {alarmCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-water-red text-white text-[10px] font-bold flex items-center justify-center border-2 border-water-dark animate-pulse">
                {alarmCount > 99 ? '99+' : alarmCount}
              </span>
            )}
          </button>

          {showAlarmPanel && (
            <div className="absolute right-0 top-12 w-80 rounded-xl bg-water-dark/95 backdrop-blur-xl border border-water-cyan/20 shadow-2xl shadow-black/50 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-water-cyan/10">
                <h3 className="text-white font-semibold">报警通知</h3>
                <button
                  onClick={() => setShowAlarmPanel(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="px-4 py-3 border-b border-water-cyan/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 p-1 rounded border',
                          getAlarmColor(alarm.level),
                        )}
                      >
                        {getAlarmIcon(alarm.level)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{alarm.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{alarm.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-water-cyan/10">
                <button className="w-full text-sm text-water-cyan hover:text-water-teal transition-colors">
                  查看全部报警 →
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-water-cyan hover:bg-water-cyan/10 border border-transparent hover:border-water-cyan/20 transition-all duration-200"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>

        <div className="w-px h-6 bg-water-cyan/20 mx-1" />

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200',
              'border border-transparent',
              showUserMenu
                ? 'bg-water-cyan/10 border-water-cyan/20'
                : 'hover:bg-white/5',
            )}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center shadow-lg shadow-water-cyan/20">
                <UserIcon size={18} className="text-water-deep" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-water-green border-2 border-water-dark" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm text-white font-medium leading-tight">{userName}</p>
              <p className="text-xs text-water-cyan/70">{roleLabels[role]}</p>
            </div>
            <ChevronDown
              size={16}
              className={cn(
                'text-slate-400 transition-transform duration-200',
                showUserMenu && 'rotate-180',
              )}
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 rounded-xl bg-water-dark/95 backdrop-blur-xl border border-water-cyan/20 shadow-2xl shadow-black/50 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-water-cyan/10">
                <p className="text-sm text-white font-medium">{userName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{roleLabels[role]}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-water-red/10 hover:text-water-red transition-colors"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
