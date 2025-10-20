import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/assets/logo/logo.png';
import { useAuth } from '@/providers/AuthProvider';
import { type EmployeeRole } from '@/constants/roles';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

const NAV_ITEMS: Array<{ to: string; label: string; roles: EmployeeRole[] }> = [
  { to: '/', label: 'الرئيسية', roles: ['ADMIN'] },
  { to: '/employees', label: 'الموظفون', roles: ['ADMIN'] },
  { to: '/beneficiaries', label: 'المستفيدون', roles: ['ADMIN'] },
  { to: '/notifications', label: 'الرسائل', roles: ['ADMIN'] },
  { to: '/posts', label: 'المنشورات', roles: ['PUBLISHER'] },
  { to: '/distribution', label: 'التوزيعات', roles: ['DISTRIBUTER'] },
  { to: '/deliver', label: 'تسليم القسائم', roles: ['DELIVERER'] },
];

export default function Header({ title, subtitle, className = '' }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, initializing, logout, role } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  const showPrivateSection = isAuthenticated && !initializing;
  const allowedNavItems = useMemo(() => {
    if (!role) {
      return [];
    }
    return NAV_ITEMS.filter((item) => item.roles.includes(role));
  }, [role]);
  const activePath = useMemo(() => location.pathname || '/', [location.pathname]);

  return (
    <header className={`w-full flex flex-col gap-4 ${className}`} dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={Logo} alt="وِصال" className="w-[180px] h-[100px] object-contain" />
          {(title || subtitle) && (
            <div className="text-right">
              {title && (
                <h1 className="font-heading font-bold text-2xl text-gray-900">{title}</h1>
              )}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          )}
        </div>

        {showPrivateSection && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}</span>
          </button>
        )}
      </div>

      {showPrivateSection && allowedNavItems.length > 0 && (
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm" aria-label="التنقّل الرئيسي">
          {allowedNavItems.map((item) => {
            const isActive = item.to === '/'
              ? activePath === '/'
              : activePath.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-4 py-2 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
