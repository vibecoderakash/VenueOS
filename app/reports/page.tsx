'use client';

import React from 'react';
import { 
  Trophy, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  PieChart
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { LeadStatus, LeadSource } from '@/types/database';
import { getStatusBadgeConfig, getSourceBadge } from '@/lib/utils';

export default function ReportsPage() {
  const { leads, profiles, metrics } = useData();

  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) => !l.archived_at);
  const totalActive = activeLeads.length;

  const statuses: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'];
  const statusStats = statuses.map((status) => {
    const count = leads.filter((l) => l.status === status).length;
    const percent = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    const config = getStatusBadgeConfig(status);
    return { status, count, percent, config };
  });

  const sources: LeadSource[] = ['Meta', 'Google', 'Google Business Profile', 'WhatsApp', 'Phone Call', 'Walk-in', 'Referral', 'Website', 'Instagram', 'Facebook', 'Other', 'not_provided'];
  const sourceStats = sources
    .map((source) => {
      const matchingLeads = leads.filter((l) => l.source === source);
      const converted = matchingLeads.filter((l) => l.status === 'Converted').length;
      return {
        source,
        total: matchingLeads.length,
        converted,
        conversionRate: matchingLeads.length > 0 ? Math.round((converted / matchingLeads.length) * 100) : 0,
        badge: getSourceBadge(source),
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const ownerStats = profiles.map((p) => {
    const assignedLeads = leads.filter((l) => l.owner_id === p.id);
    const converted = assignedLeads.filter((l) => l.status === 'Converted').length;
    const withFollowUp = assignedLeads.filter((l) => l.next_follow_up_at && !l.archived_at).length;
    return {
      profile: p,
      total: assignedLeads.length,
      active: assignedLeads.filter((l) => !l.archived_at).length,
      converted,
      conversionRate: assignedLeads.length > 0 ? Math.round((converted / assignedLeads.length) * 100) : 0,
      adherenceRate: assignedLeads.length > 0 ? Math.round((withFollowUp / assignedLeads.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="pb-3 transition-colors"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
          Sales & Conversion Reports
        </h1>
        <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
          Conversion rates, pipeline health, and sales rep performance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          className="rounded-[12px] p-4 space-y-1 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between" style={{ color: 'var(--foreground-muted)' }}>
            <span className="text-[12px] font-medium">Conversion Win Rate</span>
            <Trophy className="w-4 h-4" style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--success)' }}>
            {metrics.conversionRate}%
          </p>
          <p className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
            {metrics.convertedCount} confirmed bookings
          </p>
        </div>

        <div
          className="rounded-[12px] p-4 space-y-1 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between" style={{ color: 'var(--foreground-muted)' }}>
            <span className="text-[12px] font-medium">Follow-up Adherence</span>
            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </div>
          <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--primary)' }}>
            {metrics.followUpAdherenceRate}%
          </p>
          <p className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
            Active leads with next action set
          </p>
        </div>

        <div
          className="rounded-[12px] p-4 space-y-1 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between" style={{ color: 'var(--foreground-muted)' }}>
            <span className="text-[12px] font-medium">Overdue Follow-ups</span>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          </div>
          <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--danger)' }}>
            {metrics.overdueFollowUpsCount}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
            Missed callbacks
          </p>
        </div>

        <div
          className="rounded-[12px] p-4 space-y-1 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between" style={{ color: 'var(--foreground-muted)' }}>
            <span className="text-[12px] font-medium">Active Pipeline</span>
            <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </div>
          <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>
            {totalActive}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
            {totalLeads} total historical leads
          </p>
        </div>
      </div>

      {/* Main Grid: Pipeline Funnel + Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pipeline Breakdown */}
        <div
          className="rounded-[12px] p-5 space-y-3.5 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--primary)',
                }}
              >
                <Flame className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
                Pipeline Status Breakdown
              </h3>
            </div>
            <span className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              {totalLeads} Leads
            </span>
          </div>

          <div className="space-y-2.5">
            {statusStats.map(({ status, count, percent, config }) => (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                    <span>{status}</span>
                  </span>
                  <span style={{ color: 'var(--foreground-muted)' }}>
                    {count} ({percent}%)
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--surface-secondary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(percent, 3)}%`,
                      backgroundColor:
                        status === 'Converted'
                          ? 'var(--success)'
                          : status === 'Lost'
                          ? 'var(--foreground-muted)'
                          : 'var(--primary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Source Effectiveness */}
        <div
          className="rounded-[12px] p-5 space-y-3.5 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--primary)',
                }}
              >
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
                Marketing Channel Performance
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {sourceStats.map(({ source, total, converted, conversionRate, badge }) => (
              <div
                key={source}
                className="p-2.5 rounded-[8px] flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
                    {source}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--foreground)' }}>
                    {total} Inquiries
                  </span>
                </div>

                <div className="text-right text-[12px]">
                  <span className="font-bold" style={{ color: 'var(--success)' }}>
                    {converted} Booked
                  </span>
                  <span className="ml-1" style={{ color: 'var(--foreground-muted)' }}>
                    ({conversionRate}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Member Performance */}
      <div
        className="rounded-[12px] p-5 space-y-3.5 transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              color: 'var(--primary)',
            }}
          >
            <Users className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
            Sales Rep Performance
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {ownerStats.map(({ profile, active, converted, adherenceRate }) => (
            <div
              key={profile.id}
              className="p-3.5 rounded-[8px] space-y-1.5 transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {profile.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
                    {profile.name}
                  </p>
                  <p className="text-[10px] capitalize" style={{ color: 'var(--foreground-muted)' }}>
                    {profile.role}
                  </p>
                </div>
              </div>

              <div
                className="pt-1.5 space-y-0.5 text-[12px]"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div className="flex justify-between" style={{ color: 'var(--foreground-secondary)' }}>
                  <span>Active Leads:</span>
                  <span className="font-bold" style={{ color: 'var(--foreground)' }}>{active}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--foreground-secondary)' }}>
                  <span>Confirmed Bookings:</span>
                  <span className="font-bold" style={{ color: 'var(--success)' }}>{converted}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--foreground-secondary)' }}>
                  <span>Follow-up Rate:</span>
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>{adherenceRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
