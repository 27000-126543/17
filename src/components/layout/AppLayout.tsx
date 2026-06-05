import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Sidebar, { type UserRole } from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@/stores/authStore';

const roleRoutePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['inspector', 'plant_leader', 'dispatcher', 'admin'],
  '/water-source': ['plant_leader', 'dispatcher', 'admin'],
  '/water-supply': ['plant_leader', 'dispatcher', 'admin'],
  '/metering': ['dispatcher', 'admin'],
  '/drainage': ['dispatcher', 'admin'],
  '/sewage': ['plant_leader', 'dispatcher', 'admin'],
  '/inspection': ['inspector', 'plant_leader', 'dispatcher', 'admin'],
  '/settings': ['admin'],
};

function checkRoutePermission(pathname: string, role: UserRole): boolean {
  for (const [route, roles] of Object.entries(roleRoutePermissions)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return roles.includes(role);
    }
  }
  return true;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (user && !checkRoutePermission(location.pathname, user.role)) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, user, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="w-full h-full flex bg-water-deep">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          role={user.role}
          userName={user.name}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] pointer-events-none opacity-50" />
          <div className="absolute inset-x-0 top-0 h-32 bg-radial-glow pointer-events-none" />
          <div className="relative z-10 p-6 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
