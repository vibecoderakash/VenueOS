'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  Plus,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { CreateLeadModal } from '@/components/leads/create-lead-modal';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { leads, metrics } = useData();
  const { profile } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeLeadsCount = leads.filter((l) => !l.archived_at).length;
  const overdueCount = metrics.overdueFollowUpsCount;
  const isReadOnly = profile?.is_active === false || profile?.active === false;

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      name: 'Leads',
      href: '/leads',
      icon: Users2,
      isActive: pathname.startsWith('/leads'),
      badge: overdueCount > 0 ? `${overdueCount}` : activeLeadsCount > 0 ? `${activeLeadsCount}` : null,
      badgeColor: overdueCount > 0 ? 'bg-red-500 text-white' : 'bg-primary text-white',
    },
    {
      name: 'Add',
      isAction: true,
      onClick: () => setIsCreateOpen(true),
      icon: Plus,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      isActive: pathname.startsWith('/reports'),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      isActive: pathname.startsWith('/settings'),
    },
  ];

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 backdrop-blur-lg transition-colors border-t shadow-lg select-none"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            if (item.isAction) {
              return (
                <button
                  key="add-lead-btn"
                  type="button"
                  onClick={item.onClick}
                  disabled={isReadOnly}
                  className="flex flex-col items-center justify-center -mt-5 cursor-pointer disabled:opacity-50"
                  aria-label="Add new lead"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
                    style={{
                      backgroundColor: 'var(--primary)',
                      boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)',
                    }}
                  >
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    New Lead
                  </span>
                </button>
              );
            }

            const Icon = item.icon;
            const active = item.isActive;

            return (
              <Link
                key={item.name}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative min-w-[56px] min-h-[44px]',
                  active
                    ? 'font-bold'
                    : 'hover:opacity-80'
                )}
                style={{
                  color: active ? 'var(--primary)' : 'var(--foreground-muted)',
                }}
              >
                <div className="relative">
                  <Icon className={cn('w-5 h-5', active ? 'stroke-[2.5]' : 'stroke-2')} />
                  {item.badge && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight min-w-[16px] text-center',
                        item.badgeColor
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 leading-tight tracking-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Create Lead Modal triggered from mobile bottom bar */}
      <CreateLeadModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
  );
}
