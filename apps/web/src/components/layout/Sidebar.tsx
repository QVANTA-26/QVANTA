import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { LogoMark } from '@/components/ui/Logo';
import UserAvatar, { displayNameOf } from '@/components/ui/UserAvatar';

function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(inputs));
}

const IconClose: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const IconDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const IconCircuit: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 6h4a4 4 0 0 1 4 4v0a2 2 0 0 0 2 2h2" />
    <path d="M18 16v-2a4 4 0 0 0-4-4h0a2 2 0 0 1-2-2V8" />
  </svg>
);

const IconLearn: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
    <path d="M4 5.5v16M8 7h8M8 11h7" />
  </svg>
);

const IconCurriculum: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
    <path d="M4 5.5v16M8 7h8M8 11h7M8 15h5" />
  </svg>
);

const IconAlgorithm: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="12" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="19" cy="18" r="2" />
    <path d="M7 12h4M11 12l6-6M11 12l6 6" />
  </svg>
);

const IconTutor: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
  </svg>
);

const IconBilling: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const IconAdmin: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <IconDashboard className="h-5 w-5" />
  },
  {
    to: '/learn',
    label: 'Learn',
    icon: <IconLearn className="h-5 w-5" />
  },
  {
    to: '/curriculum',
    label: 'Curriculum',
    icon: <IconCurriculum className="h-5 w-5" />
  },
  {
    to: '/algorithms',
    label: 'Algorithms',
    icon: <IconAlgorithm className="h-5 w-5" />
  },
  {
    to: '/circuit/new',
    label: 'Circuit Builder',
    icon: <IconCircuit className="h-5 w-5" />
  },
  {
    to: '/tutor',
    label: 'AI Tutor',
    icon: <IconTutor className="h-5 w-5" />
  },
  {
    to: '/billing',
    label: 'Billing',
    icon: <IconBilling className="h-5 w-5" />
  },
  {
    to: '/admin',
    label: 'Admin',
    icon: <IconAdmin className="h-5 w-5" />,
    adminOnly: true
  }
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  mobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  className,
  onNavigate,
  collapsed: collapsedProp,
  mobile = false
}) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storedCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const collapsed = mobile ? false : collapsedProp ?? storedCollapsed;
  const isAdmin = user?.role === 'admin' || user?.role === 'org_admin';
  const planLabel =
    user?.tier === 'pro'
      ? 'Pro Plan'
      : user?.tier === 'institution'
      ? 'Institution'
      : 'Free Plan';
  const userLabel = displayNameOf(user);
  const userEmail = user?.email ?? 'User';

  const closeMobileSidebar = () => {
    setSidebarOpen(false);
    onNavigate?.();
  };

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav
      className={cn(
        'flex h-full min-w-0 w-full flex-col border-r border-bg-800 bg-[linear-gradient(180deg,#1a1517_0%,#120e10_45%,#0c0a0c_100%)] shadow-[18px_0_44px_rgba(0,0,0,0.16)]',
        className
      )}
      aria-label="Primary"
      data-collapsed={collapsed}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-bg-800 transition-[padding,gap] duration-300 motion-reduce:transition-none',
          collapsed ? 'justify-center px-3' : 'gap-2 px-6'
        )}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center"
          role="img"
          aria-label="QVANTA Quantum Platform"
          title={collapsed ? 'QVANTA Quantum Platform' : undefined}
        >
          <span aria-hidden="true">
            <LogoMark size={36} />
          </span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-text-50">QVANTA</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-500">
              Quantum Platform
            </span>
          </div>
        )}

        {mobile && (
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-400 transition-colors hover:bg-bg-800 hover:text-text-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950 lg:hidden"
            aria-label="Close navigation menu"
            title="Close navigation menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        )}
      </div>

      <div
        className={cn(
          'flex-1 overflow-y-auto py-4',
          collapsed ? 'px-2' : 'px-3'
        )}
      >
        <div className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive =
              item.to === '/circuit/new'
                ? location.pathname.startsWith('/circuit')
                : item.to === '/curriculum'
                ? location.pathname.startsWith('/curriculum')
                : item.to === '/algorithms'
                ? location.pathname.startsWith('/algorithms')
                : location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (onNavigate) onNavigate();
                  setSidebarOpen(false);
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={({ isActive: navActive }) =>
                  cn(
                    'group relative flex rounded-lg border border-transparent text-sm font-medium transition-[background-color,border-color,color,transform,padding,gap] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950 motion-reduce:transition-none',
                    collapsed
                      ? 'justify-center px-2 py-3'
                      : 'items-center gap-3 px-3 py-2.5',
                    (isActive || navActive)
                      ? 'border-primary-500/20 bg-primary-600/15 text-primary-200 shadow-[inset_3px_0_0_rgba(216,173,150,0.75)]'
                      : 'text-text-300 hover:-translate-y-px hover:border-bg-700 hover:bg-bg-800/80 hover:text-text-100'
                  )
                }
              >
                <span
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-primary-400' : 'text-text-500 group-hover:text-text-200'
                  )}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                {item.adminOnly && !collapsed && (
                  <span className="ml-auto rounded bg-bg-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-400">
                    Admin
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className={cn('shrink-0 border-t border-bg-800', collapsed ? 'p-2' : 'p-4')}>
        <div
          className={cn(
            'flex rounded-lg bg-bg-800/50 transition-[padding,gap] duration-300 motion-reduce:transition-none',
            collapsed ? 'justify-center p-2' : 'items-center gap-3 p-3'
          )}
          role="group"
          aria-label={`${userLabel} (${userEmail}), ${planLabel}`}
          title={collapsed ? `${userLabel} · ${planLabel}` : undefined}
        >
          <UserAvatar
            user={user}
            size={36}
            className="shadow-[0_8px_20px_rgba(109,0,26,0.28)]"
            textClassName="text-sm font-semibold text-white"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-100">{userLabel}</div>
              <div className="truncate text-xs text-text-500">{planLabel}</div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
