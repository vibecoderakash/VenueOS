'use client';

import React from 'react';
import Link from 'next/link';
import { Users2, ArrowRight, Flame } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { UrgentFollowups } from '@/components/dashboard/urgent-followups';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { getStatusBadgeConfig } from '@/lib/utils';
import { LeadStatus } from '@/types/database';

export default function DashboardPage() {
  const { organization, currentProfile, leads } = useData();

  const statuses: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'];
  const statusCounts = statuses.map((status) => ({
    status,
    count: leads.filter(
      (l) =>
        l.status === status &&
        (status === 'Converted' || status === 'Lost' || !l.archived_at)
    ).length,
    config: getStatusBadgeConfig(status),
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px]"
              style={{
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--primary)',
                border: '1px solid var(--border)',
              }}
            >
              Banquet Operations
            </span>
            <span className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              Logged in as{' '}
              <strong style={{ color: 'var(--foreground-secondary)' }}>
                {currentProfile.name}
              </strong>{' '}
              · {currentProfile.role.toUpperCase()}
            </span>
          </div>
          <h1 className="text-[18px] font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
            Sales Dashboard
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
            {organization.name}
          </p>
        </div>

        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-colors self-start sm:self-auto"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--foreground-secondary)',
          }}
        >
          <Users2 className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
          <span>Open Leads</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <MetricCards />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          <UrgentFollowups />

          {/* Pipeline Distribution */}
          <div
            className="rounded-[12px] p-5 space-y-4 transition-colors"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                  style={{ backgroundColor: 'var(--primary-soft)' }}
                >
                  <Flame className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                </div>
                <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
                  Pipeline Distribution
                </h2>
              </div>
              <Link
                href="/leads"
                className="text-[12px] font-medium flex items-center gap-1 transition-colors"
                style={{ color: 'var(--primary)' }}
              >
                <span>View Leads</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {statusCounts.map(({ status, count, config }) => (
                <Link
                  key={status}
                  href={`/leads?status=${status}`}
                  className="rounded-[8px] p-3 text-center transition-colors group"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--foreground-secondary)' }}
                    >
                      {status}
                    </span>
                  </div>
                  <p
                    className="text-[18px] font-bold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {count}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  );
}
