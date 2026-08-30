'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Activity, 
  MessageSquare, 
  Tag, 
  Clock, 
  UserCheck, 
  Archive, 
  Sparkles
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { formatRelativeTime } from '@/lib/utils';
import { LeadActivity } from '@/types/database';

export function ActivityFeed() {
  const { getAllRecentActivity, leads } = useData();
  const activities = getAllRecentActivity();

  const getActionIcon = (actionType: LeadActivity['action_type']) => {
    switch (actionType) {
      case 'discussion_added':
        return { icon: MessageSquare, color: 'var(--warning)', bg: 'var(--warning-soft)' };
      case 'lead_created':
        return { icon: Sparkles, color: 'var(--primary)', bg: 'var(--primary-soft)' };
      case 'status_changed':
        return { icon: Tag, color: 'var(--primary)', bg: 'var(--primary-soft)' };
      case 'follow_up_updated':
        return { icon: Clock, color: 'var(--danger)', bg: 'var(--danger-soft)' };
      case 'assigned':
        return { icon: UserCheck, color: 'var(--success)', bg: 'var(--success-soft)' };
      case 'archived':
      case 'restored':
        return { icon: Archive, color: 'var(--foreground-muted)', bg: 'var(--surface-secondary)' };
      default:
        return { icon: Activity, color: 'var(--foreground-muted)', bg: 'var(--surface-secondary)' };
    }
  };

  if (activities.length === 0) {
    return (
      <div
        className="rounded-[12px] p-5 text-center transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <Activity className="w-6 h-6 mx-auto mb-1.5" style={{ color: 'var(--foreground-muted)' }} />
        <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
          No recent team activity logged yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[12px] p-4 sm:p-5 space-y-3.5 transition-colors"
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
            <Activity className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
            Recent Team Activity
          </h3>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
          Live log
        </span>
      </div>

      <div className="space-y-2">
        {activities.slice(0, 7).map((act) => {
          const config = getActionIcon(act.action_type);
          const Icon = config.icon;
          const targetLead = leads.find((l) => l.id === act.lead_id);

          return (
            <div
              key={act.id}
              className="flex items-start gap-2.5 p-2.5 rounded-[8px] transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: config.bg,
                  color: config.color,
                }}
              >
                <Icon className="w-3 h-3" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center gap-1 text-[12px]">
                    <span
                      className="font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {act.actor?.name || 'Team Member'}
                    </span>
                    <span style={{ color: 'var(--foreground-muted)' }}>•</span>
                    {targetLead ? (
                      <Link
                        href={`/leads/${targetLead.id}`}
                        className="font-medium hover:underline truncate max-w-[120px] transition-colors"
                        style={{ color: 'var(--primary)' }}
                      >
                        {targetLead.customer_name}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--foreground-muted)' }}>Lead inquiry</span>
                    )}
                  </div>
                  <span
                    className="text-[11px] whitespace-nowrap"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    {formatRelativeTime(act.created_at)}
                  </span>
                </div>

                <p
                  className="text-[12px] mt-0.5"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {act.metadata?.details || act.action_type.replace('_', ' ')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
