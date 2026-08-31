'use client';

import React from 'react';
import { 
  Activity, 
  Clock, 
  UserCheck, 
  Tag, 
  Sparkles, 
  Archive, 
  MessageSquare
} from 'lucide-react';
import { LeadActivity } from '@/types/database';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { useData } from '@/lib/data-context';

interface LeadActivityLogProps {
  leadId: string;
}

export function LeadActivityLog({ leadId }: LeadActivityLogProps) {
  const { getActivityByLeadId } = useData();
  const activities = getActivityByLeadId(leadId);

  const getIcon = (type: LeadActivity['action_type']) => {
    switch (type) {
      case 'lead_created':
        return { icon: Sparkles, color: 'var(--primary)', bg: 'var(--primary-soft)' };
      case 'discussion_added':
      case 'discussion_edited':
      case 'discussion_deleted':
        return { icon: MessageSquare, color: 'var(--warning)', bg: 'var(--warning-soft)' };
      case 'status_changed':
        return { icon: Tag, color: 'var(--primary)', bg: 'var(--primary-soft)' };
      case 'follow_up_updated':
        return { icon: Clock, color: 'var(--danger)', bg: 'var(--danger-soft)' };
      case 'assigned':
        return { icon: UserCheck, color: 'var(--success)', bg: 'var(--success-soft)' };
      case 'archived':
      case 'restored':
      case 'lead_deleted':
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
        <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
          No activity logged for this lead yet.
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
          Lead Audit Trail
        </h3>
      </div>

      <div className="space-y-2">
        {activities.map((act) => {
          const config = getIcon(act.action_type);
          const Icon = config.icon;

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
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {act.actor?.name || 'User'}
                  </span>
                  <span className="text-[11px] text-right" style={{ color: 'var(--foreground-muted)' }}>
                    <span className="block">{formatDateTime(act.created_at)}</span>
                    <span className="block">{formatRelativeTime(act.created_at)}</span>
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                  {act.metadata?.details || act.action_type.replace('_', ' ')}
                </p>
                {Array.isArray(act.metadata?.changes) && act.metadata.changes.length > 0 && (
                  <div className="mt-1 space-y-0.5 text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                    {act.metadata.changes.map((change, index) => {
                      if (!change || typeof change !== 'object') return null;
                      const item = change as { label?: string; from?: unknown; to?: unknown };
                      return (
                        <div key={`${act.id}-change-${index}`}>
                          <span className="font-semibold">{item.label || 'Field'}:</span>{' '}
                          {String(item.from ?? 'Empty')} → {String(item.to ?? 'Empty')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
