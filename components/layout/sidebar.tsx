'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  X,
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
  owner: { bg: 'rgba(245, 158, 11, 0.28)', color: '#fbbf24' },
  manager: { bg: 'rgba(59, 130, 246, 0.28)', color: '#60a5fa' },
  staff: { bg: 'rgba(16, 185, 129, 0.28)', color: '#34d399' },
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
        'hidden md:flex flex-shrink-0 flex-col h-screen sticky top-0 z-30 select-none transition-[width] duration-200',
        isCollapsed ? 'w-[76px]' : 'w-[256px]'
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
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
          >
            <Image
              src="/logo.png"
              alt="VenueOS Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain drop-shadow-md"
              priority
            />
          </div>
          {!isCollapsed && <div className="flex flex-col min-w-0">
            <span
              className="text-[15px] font-extrabold tracking-wide leading-none"
              style={{ color: 'var(--sidebar-foreground)' }}
            >
              VENUE OS
            </span>
            <span
              className="text-[11px] font-semibold mt-1"
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
          className={cn('rounded-[10px] transition-colors', isCollapsed ? 'p-2.5 flex justify-center' : 'px-3 py-2.5')}
          style={{
            backgroundColor: 'var(--sidebar-surface)',
            border: '1px solid var(--sidebar-border)',
          }}
        >
          <div className={cn('flex items-center gap-2.5', isCollapsed && 'justify-center')}>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--success)' }}
            />
            {!isCollapsed && <span
              className="text-[13px] font-bold truncate leading-none"
              style={{ color: 'var(--sidebar-foreground)' }}
            >
              {organization.name}
            </span>}
          </div>
          {!isCollapsed && <span
            className="text-[11px] font-semibold block mt-1.5 leading-none"
            style={{ color: 'var(--sidebar-foreground-muted)' }}
          >
            Single-Venue Instance
          </span>}
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className={cn('flex-1 py-3.5 space-y-6 overflow-y-auto', isCollapsed ? 'px-2' : 'px-3.5')}>
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            {!isCollapsed && <p
              className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 mb-2"
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
                      'flex items-center justify-between py-2.5 rounded-[10px] text-[13.5px] font-semibold opacity-50 cursor-not-allowed',
                      isCollapsed ? 'justify-center px-2' : 'px-3'
                    )}
                    style={{ color: 'var(--sidebar-foreground-muted)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-[5px]"
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
                    'flex items-center justify-between py-2.5 rounded-[10px] text-[14px] transition-all group',
                    isCollapsed ? 'justify-center px-2' : 'px-3',
                    isActive ? 'font-bold shadow-xs' : 'font-semibold hover:opacity-90'
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
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105"
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
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center"
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
      <div className={cn('pt-2 pb-1', isCollapsed ? 'px-2' : 'px-3.5')}>
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-full flex items-center rounded-[10px] py-2.5 text-[13px] font-bold transition-colors hover:bg-white/5 cursor-pointer',
            isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
          )}
          style={{ color: 'var(--sidebar-foreground-muted)' }}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!isCollapsed && <span>Collapse sidebar</span>}
        </button>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className={cn('p-3.5', isCollapsed && 'px-2')} style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div
          className={cn('rounded-[12px] p-3 space-y-2.5 transition-colors', isCollapsed && 'p-2')}
          style={{
            backgroundColor: 'var(--sidebar-surface)',
            border: '1px solid var(--sidebar-border)',
          }}
        >
          {/* User Display */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl text-white font-extrabold text-[13px] flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{
                  backgroundColor: isOwner ? '#d97706' : isManager ? '#4f46e5' : '#64748b',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && <div className="min-w-0 flex-1">
                <p
                  className="text-[13.5px] font-bold truncate leading-tight"
                  style={{ color: 'var(--sidebar-foreground)' }}
                >
                  {displayName}
                </p>
                <span
                  className="inline-block text-[10.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[5px] mt-1"
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
              className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/20 hover:text-rose-400"
              style={{
                color: 'var(--sidebar-foreground-muted)',
              }}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { profile, role, isOwner, isManager, signOut } = useAuth();
  const { organization, metrics, leads } = useData();

  if (!isOpen) return null;

  const activeLeadsCount = leads.filter((l) => !l.archived_at).length;
  const overdueCount = metrics.overdueFollowUpsCount;

  const roleKey = role || 'staff';
  const roleBadge = ROLE_BADGES[roleKey] || ROLE_BADGES.staff;
  const displayName = profile?.full_name || profile?.name || 'Staff User';

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

  return (
    <div
      className="md:hidden fixed inset-0 z-50 flex bg-black/65 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-drawer"
    >
      <div
        className="w-4/5 max-w-xs h-full flex flex-col shadow-2xl animate-slideInLeft"
        style={{
          backgroundColor: 'var(--sidebar)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Header with Brand & Close Button */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            >
              <Image
                src="/logo.png"
                alt="VenueOS Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain drop-shadow-md"
                priority
              />
            </div>
            <div>
              <span
                className="text-[15px] font-extrabold tracking-wide block leading-tight"
                style={{ color: 'var(--sidebar-foreground)' }}
              >
                VENUE OS
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: 'var(--sidebar-foreground-muted)' }}
              >
                Banquet Hall V1
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--sidebar-foreground-muted)' }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Venue Context Card */}
        <div className="p-3.5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div
            className="rounded-[10px] p-3 space-y-1"
            style={{
              backgroundColor: 'var(--sidebar-surface)',
              border: '1px solid var(--sidebar-border)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--success)' }}
              />
              <span
                className="text-[13.5px] font-bold truncate leading-none"
                style={{ color: 'var(--sidebar-foreground)' }}
              >
                {organization.name}
              </span>
            </div>
            <span
              className="text-[11px] font-semibold block leading-none pt-0.5"
              style={{ color: 'var(--sidebar-foreground-muted)' }}
            >
              Single-Venue Instance
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3.5 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <span
                className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 block"
                style={{ color: 'var(--sidebar-foreground-muted)' }}
              >
                {section.title}
              </span>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = !item.disabled && (
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                  );

                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold opacity-40 cursor-not-allowed"
                        style={{ color: 'var(--sidebar-foreground-muted)' }}
                      >
                        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                        <span>{item.name}</span>
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-black/10 dark:bg-white/10">
                          {item.badge}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] transition-colors',
                        isActive
                          ? 'font-bold shadow-xs'
                          : 'font-semibold hover:bg-white/5'
                      )}
                      style={{
                        backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                        color: isActive ? 'var(--sidebar-active-color)' : 'var(--sidebar-foreground-secondary)',
                      }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center',
                            item.badgeVariant === 'danger'
                              ? 'bg-rose-500 text-white'
                              : 'bg-indigo-500/20 text-indigo-400'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile and Sign Out Footer */}
        <div className="p-3.5" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <div
            className="rounded-[12px] p-3 flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--sidebar-surface)',
              border: '1px solid var(--sidebar-border)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl text-white font-extrabold text-[13px] flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{
                  backgroundColor: isOwner ? '#d97706' : isManager ? '#4f46e5' : '#64748b',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13.5px] font-bold truncate leading-tight"
                  style={{ color: 'var(--sidebar-foreground)' }}
                >
                  {displayName}
                </p>
                <span
                  className="inline-block text-[10.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[5px] mt-1"
                  style={{
                    backgroundColor: roleBadge.bg,
                    color: roleBadge.color,
                  }}
                >
                  {ROLE_LABELS[roleKey] || roleKey}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                signOut();
              }}
              title="Sign Out"
              className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/20 hover:text-rose-400"
              style={{ color: 'var(--sidebar-foreground-muted)' }}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Backdrop click area */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
