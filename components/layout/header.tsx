'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Calendar,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  Menu,
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { CreateLeadModal } from '@/components/leads/create-lead-modal';
import { MobileSidebarDrawer } from '@/components/layout/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================
// Header Component
// ============================================================

export function Header() {
  const router = useRouter();
  const { metrics } = useData();
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const overdueCount = metrics.overdueFollowUpsCount;
  const dueTodayCount = metrics.dueTodayFollowUpsCount;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/leads?search=${encodeURIComponent(globalSearch.trim())}`);
      setGlobalSearch('');
    }
  };

  const themeOptions: {
    value: 'light' | 'dark' | 'system';
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ];

  const ActiveThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const isReadOnly = profile?.is_active === false || profile?.active === false;

  return (
    <>
      <header
        className="h-[52px] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-150 gap-2"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Left: Mobile Menu Toggle & Global Search */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-sm">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            style={{
              color: 'var(--foreground-muted)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-secondary)',
            }}
            aria-label="Open menu drawer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--foreground-muted)' }}
            />
            <input
              type="text"
              placeholder="Search leads, customers, notes..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full text-[13px] rounded-[6px] pl-8 pr-3 py-1.5 transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </form>
        </div>

        {/* Right: Alerts + Actions */}
        <div className="flex items-center gap-2">
          {/* Overdue alert */}
          {overdueCount > 0 && (
            <Link
              href="/leads?followUp=Overdue"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors"
              style={{
                backgroundColor: 'var(--danger-soft)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
              }}
              title="View overdue follow-ups"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{overdueCount} Overdue</span>
            </Link>
          )}

          {/* Due today */}
          {dueTodayCount > 0 && (
            <Link
              href="/leads?followUp=Today"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors"
              style={{
                backgroundColor: 'var(--warning-soft)',
                color: 'var(--warning)',
                border: '1px solid var(--warning-border)',
              }}
              title="View today's follow-ups"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dueTodayCount} Today</span>
            </Link>
          )}

          {/* Divider */}
          <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border)' }} />

          {/* Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors"
              style={{
                backgroundColor: showThemeMenu ? 'var(--surface-secondary)' : 'transparent',
                color: 'var(--foreground-muted)',
                border: '1px solid var(--border)',
              }}
              title="Change theme"
              aria-label="Theme settings"
            >
              <ActiveThemeIcon className="w-4 h-4" />
            </button>

            {/* Theme dropdown */}
            {showThemeMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowThemeMenu(false)}
                />
                <div
                  className="absolute right-0 mt-1.5 w-36 rounded-[8px] py-1 z-50 shadow-md"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {themeOptions.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setTheme(value);
                        setShowThemeMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors',
                        theme === value
                          ? 'font-semibold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                      style={{
                        color: theme === value ? 'var(--primary)' : 'var(--foreground-secondary)',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                      {theme === value && (
                        <span
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--primary)' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* New Lead — Primary CTA */}
          <button
            onClick={() => setIsCreateOpen(true)}
            disabled={isReadOnly}
            title={isReadOnly ? 'Your account is inactive and cannot make changes.' : 'Create a new lead'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>New Lead</span>
          </button>
        </div>
      </header>

      <CreateLeadModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <MobileSidebarDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />
    </>
  );
}
