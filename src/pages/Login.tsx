import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  User,
  Lock,
  LogIn,
  Shield,
  Factory,
  Radio,
  Wrench,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface RoleOption {
  value: UserRole;
  label: string;
  icon: React.ReactNode;
  color: string;
  username: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'admin',
    label: '系统管理员',
    icon: <Shield size={20} />,
    color: 'from-water-purple to-water-cyan',
    username: 'admin',
  },
  {
    value: 'dispatcher',
    label: '调度员',
    icon: <Radio size={20} />,
    color: 'from-water-cyan to-water-teal',
    username: 'dispatcher',
  },
  {
    value: 'plant_leader',
    label: '水厂厂长',
    icon: <Factory size={20} />,
    color: 'from-water-teal to-water-green',
    username: 'plant_leader',
  },
  {
    value: 'inspector',
    label: '巡检员',
    icon: <Wrench size={20} />,
    color: 'from-water-yellow to-water-orange',
    username: 'inspector',
  },
];

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-40" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(0, 212, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0, 229, 204, 0.12) 0%, transparent 50%)',
        }}
      />
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-water-cyan/30 animate-pulse"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = async (role: RoleOption) => {
    setSelectedRole(role.value);
    setUsername(role.username);
    setPassword('123456');
    setError('');
    setLoading(true);
    try {
      const success = await login(role.username, '123456');
      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('登录失败');
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('用户名或密码错误');
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-water-deep">
      <ParticleBackground />

      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-br from-water-cyan to-water-teal rounded-2xl blur-md opacity-50 animate-pulse-slow" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center shadow-lg shadow-water-cyan/30">
            <Droplets className="text-water-deep" size={32} strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider glow-text">
            智慧水务综合管理平台
          </h1>
          <p className="text-sm text-water-cyan/70 tracking-widest mt-0.5">
            SMART WATER MANAGEMENT PLATFORM
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-md mx-4 z-10">
        <div className="absolute -inset-1 bg-gradient-to-br from-water-cyan/40 via-water-teal/20 to-water-cyan/40 rounded-3xl blur-xl opacity-60" />

        <div className="relative glass-card corner-deco p-8 rounded-3xl backdrop-blur-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-water-cyan to-water-teal flex items-center justify-center shadow-xl shadow-water-cyan/30 border-4 border-water-dark">
              <Droplets className="text-water-deep" size={36} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-center text-xl font-semibold text-white mb-1">
              欢迎登录
            </h2>
            <p className="text-center text-sm text-slate-400 mb-6">
              请选择角色或输入账号密码登录
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {roleOptions.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => handleRoleSelect(role)}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300',
                  'border border-water-cyan/10 hover:border-water-cyan/40',
                  selectedRole === role.value
                    ? 'bg-gradient-to-br ' + role.color + ' bg-opacity-20 border-water-cyan/60 shadow-lg shadow-water-cyan/20'
                    : 'bg-water-dark/40 hover:bg-water-dark/70'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                    selectedRole === role.value
                      ? 'bg-white/20 text-white'
                      : 'bg-water-cyan/10 text-water-cyan'
                  )}
                >
                  {role.icon}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    selectedRole === role.value ? 'text-white' : 'text-slate-400'
                  )}
                >
                  {role.label}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">用户名</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-water-cyan/20 to-water-teal/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                <div className="relative flex items-center">
                  <User className="absolute left-4 text-water-cyan/60" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full pl-11 pr-4 py-3 bg-water-dark/60 border border-water-cyan/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-water-cyan/60 focus:bg-water-dark/80 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">密码</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-water-cyan/20 to-water-teal/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-water-cyan/60" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-11 pr-4 py-3 bg-water-dark/60 border border-water-cyan/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-water-cyan/60 focus:bg-water-dark/80 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-water-red/10 border border-water-red/30 text-water-red text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 rounded-xl font-semibold text-water-deep overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-water-cyan via-water-teal to-water-cyan bg-[length:200%_100%] animate-pulse-slow group-hover:bg-[position:100%_0] transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-water-cyan to-water-teal opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <LogIn size={20} />
                )}
                <span>{loading ? '登录中...' : '安全登录'}</span>
              </div>
            </button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-water-dark/40 border border-water-cyan/10">
            <p className="text-xs text-slate-400 text-center">
              <span className="text-water-cyan/60">测试账号：</span>
              admin / dispatcher / plant_leader / inspector
            </p>
            <p className="text-xs text-slate-400 text-center mt-1">
              <span className="text-water-cyan/60">默认密码：</span>
              123456
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
        <p className="text-sm text-slate-500">
          © {currentYear} 智慧水务综合管理平台 · 版权所有
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Smart Water Management Platform v2.0
        </p>
      </div>
    </div>
  );
}
