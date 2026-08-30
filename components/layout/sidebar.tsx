'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  CalendarDays,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Building2,
  Layers,
  UserCheck,
  LogOut,
  Shield,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useData } from '@/lib/data-context';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/database';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
  admin: 'Manager',
  sales: 'Staff',
  front_desk: 'Staff',
};

const ROLE_BADGES: Record<string, { bg: string; color: string }> = {
  owner: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
  manager: { bg: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' },
  staff: { bg: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' },
};

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  disabled?: boolean;
  badge?: string | null;
  badgeVariant?: 'danger' | 'muted';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, role, isOwner, isManager, signOut } = useAuth();
  const { organization, metrics, leads } = useData();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem('venue_os_sidebar_collapsed');
    if (storedValue === 'true') setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('venue_os_sidebar_collapsed', String(next));
      return next;
    });
  };

  const activeLeadsCount = leads.filter((l) => !l.archived_at).length;
  const overdueCount = metrics.overdueFollowUpsCount;

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        {
          name: 'Dashboard',
          href: '/',
          icon: LayoutDashboard,
          badge: overdueCount > 0 ? String(overdueCount) : null,
          badgeVariant: 'danger',
        },
        {
          name: 'Leads',
          href: '/leads',
          icon: Users2,
          badge: activeLeadsCount > 0 ? String(activeLeadsCount) : null,
          badgeVariant: 'muted',
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: BarChart3,
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: Settings,
        },
      ],
    },
    {
      title: 'Coming in V2',
      items: [
        { name: 'Bookings', href: '#', icon: CalendarDays, disabled: true, badge: 'Soon' },
        { name: 'Quotations', href: '#', icon: FileText, disabled: true, badge: 'Soon' },
        { name: 'Calendar', href: '#', icon: Layers, disabled: true, badge: 'Soon' },
        { name: 'Customers', href: '#', icon: UserCheck, disabled: true, badge: 'Soon' },
        { name: 'Payments', href: '#', icon: CreditCard, disabled: true, badge: 'Soon' },
      ],
    },
  ];

  const roleKey = role || 'staff';
  const roleBadge = ROLE_BADGES[roleKey] || ROLE_BADGES.staff;
  const displayName = profile?.full_name || profile?.name || 'Staff User';

  return (
    <aside
      className={cn(
        'flex-shrink-0 flex flex-col h-screen sticky top-0 z-30 select-none transition-[width] duration-200',
        isCollapsed ? 'w-[72px]' : 'w-[230px]'
      )}
      style={{
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand Header */}
      <div style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 py-4 group transition-colors',
            isCollapsed ? 'justify-center px-2 w-full' : 'px-5'
          )}
        >
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white shadow-xs"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Building2 className="w-4 h-4" />
          </div>
          {!isCollapsed && <div className="flex flex-col min-w-0">
            <span
              className="text-[13px] font-bold tracking-wide leading-none"
              style={{ color: 'var(--sidebar-foreground)' }}
            >
              VENUE OS
            </span>
            <span
              className="text-[10px] font-medium mt-0.5"
              style={{ color: 'var(--sidebar-foreground-muted)' }}
            >
              Banquet Hall V1
            </span>
          </div>}
        </Link>
      </div>

      {/* Venue Context Card */}
      <div className={cn('py-3', isCollapsed ? 'px-2' : 'px-4')} style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div
          className={cn('rounded-[8px] transition-colors', isCollapsed ? 'p-2 flex justify-center' : 'px-2.5 py-2')}
          style={{
            backgroundColor: 'var(--sidebar-surface)',
            border: '1px solid var(--sidebar-border)',
          }}
        >
          <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--success)' }}
            />
            {!isCollapsed && <span
              className="text-[12px] font-semibold truncate leading-none"
              style={{ color: 'var(--sidebar-foreground)' }}
            >
              {organization.name}
            </span>}
          </div>
          {!isCollapsed && <span
            className="text-[10px] font-medium block mt-1 leading-none"
            style={{ color: 'var(--sidebar-foreground-muted)' }}
          >
            Single-Venue Instance
          </span>}
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className={cn('flex-1 py-3 space-y-5 overflow-y-auto', isCollapsed ? 'px-2' : 'px-3')}>
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && <p
              className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5"
              style={{ color: 'var(--sidebar-foreground-muted)' }}
            >
              {section.title}
            </p>}

            {section.items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : item.href !== '#' && pathname.startsWith(item.href);

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className={cn(
                      'flex items-center justify-between py-2 rounded-[8px] text-[13px] font-medium opacity-50 cursor-not-allowed',
                      isCollapsed ? 'justify-center px-2' : 'px-2.5'
                    )}
                    style={{ color: 'var(--sidebar-foreground-muted)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px]"
                        style={{
                          backgroundColor: 'var(--sidebar-surface-secondary)',
                          color: 'var(--sidebar-foreground-muted)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between py-2 rounded-[8px] text-[13px] font-medium transition-all group',
                    isCollapsed ? 'justify-center px-2' : 'px-2.5',
                    isActive ? 'font-semibold' : 'hover:opacity-90'
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--sidebar-active-bg)',
                          color: 'var(--sidebar-active-text)',
                        }
                      : {
                          color: 'var(--sidebar-foreground)',
                          backgroundColor: 'transparent',
                        }
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon
                      className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        color: isActive
                          ? 'var(--sidebar-active-text)'
                          : 'var(--sidebar-foreground-muted)',
                      }}
                    />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={
                        item.badgeVariant === 'danger'
                          ? { backgroundColor: 'var(--danger)', color: '#FFFFFF' }
                          : {
                              backgroundColor: 'var(--sidebar-badge-bg)',
                              color: 'var(--sidebar-foreground-muted)',
                              border: '1px solid var(--sidebar-border)',
                            }
                      }
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar collapse control */}
      <div className={cn('pt-2', isCollapsed ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-full flex items-center rounded-[8px] py-2 text-[12px] font-medium transition-colors hover:bg-white/5',
            isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5'
          )}
          style={{ color: 'var(--sidebar-foreground-muted)' }}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!isCollapsed && <span>Collapse sidebar</span>}
        </button>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className={cn('p-3', isCollapsed && 'px-2')} style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div
          className={cn('rounded-[10px] p-2.5 space-y-2.5 transition-colors', isCollapsed && 'p-2')}
          style={{
            backgroundColor: 'var(--sidebar-surface)',
            border: '1px solid var(--sidebar-border)',
          }}
        >
          {/* User Display */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isOwner ? '#d97706' : isManager ? '#4f46e5' : '#64748b',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] font-semibold truncate leading-tight"
                  style={{ color: 'var(--sidebar-foreground)' }}
                >
                  {displayName}
                </p>
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5"
                  style={{
                    backgroundColor: roleBadge.bg,
                    color: roleBadge.color,
                  }}
                >
                  {ROLE_LABELS[roleKey] || roleKey}
                </span>
              </div>}
            </div>

            <button
              type="button"
              onClick={signOut}
              title="Sign Out of VenueOS"
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/20 hover:text-rose-400"
              style={{
                color: 'var(--sidebar-foreground-muted)',
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
