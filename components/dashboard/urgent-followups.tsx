'use client';

import React from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { getFollowUpStatus, formatCurrency, formatDate, getEventTypeBadge } from '@/lib/utils';

export function UrgentFollowups() {
  const { leads, profiles, organization } = useData();

  const followUpLeads = leads
    .filter((l) => !l.archived_at && l.next_follow_up_at)
    .map((l) => {
      const followUp = getFollowUpStatus(l.next_follow_up_at);
      const owner = profiles.find((p) => p.id === l.owner_id);
      return { ...l, followUp, owner };
    })
    .filter((l) => l.followUp.status === 'overdue' || l.followUp.status === 'today')
    .sort((a, b) => {
      if (a.followUp.status === 'overdue' && b.followUp.status !== 'overdue') return -1;
      if (b.followUp.status === 'overdue' && a.followUp.status !== 'overdue') return 1;
      return new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime();
    });

  if (followUpLeads.length === 0) {
    return (
      <div
        className="rounded-[12px] p-5 flex items-center justify-between transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'var(--success-soft)',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
              All Follow-ups Up to Date
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              No overdue follow-ups. Your banquet sales pipeline is on track.
            </p>
          </div>
        </div>
        <Link
          href="/leads"
          className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold flex items-center gap-1 transition-colors"
          style={{
            backgroundColor: 'var(--surface-secondary)',
            color: 'var(--foreground-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
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
              backgroundColor: 'var(--danger-soft)',
              color: 'var(--danger)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <span>Follow-ups Queue</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger-border)',
                }}
              >
                {followUpLeads.length} Due
              </span>
            </h3>
          </div>
        </div>

        <Link
          href="/leads?followUp=Overdue"
          className="text-[12px] font-medium flex items-center gap-1 transition-colors"
          style={{ color: 'var(--primary)' }}
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {followUpLeads.slice(0, 4).map((lead) => {
          const eventBadge = getEventTypeBadge(lead.event_type);
          const isOverdue = lead.followUp.status === 'overdue';

          return (
            <div
              key={lead.id}
              className="p-3 rounded-[8px] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              style={{
                backgroundColor: isOverdue ? 'var(--danger-soft)' : 'var(--warning-soft)',
                border: isOverdue
                  ? '1px solid var(--danger-border)'
                  : '1px solid var(--warning-border)',
              }}
            >
              {/* Lead info */}
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 text-sm"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {eventBadge.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-[13px] font-bold transition-colors truncate"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {lead.customer_name}
                    </Link>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lead.followUp.badgeClass}`}>
                      {lead.followUp.label}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                      • {lead.owner ? lead.owner.name : 'Unassigned'}
                    </span>
                  </div>

                  <p
                    className="text-[12px] line-clamp-1 mt-0.5"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {lead.follow_up_note || lead.requirement || 'Scheduled callback'}
                  </p>

                  <div
                    className="flex items-center gap-2 text-[11px] mt-0.5"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    <span>Event: {lead.event_date_status === 'not_fixed' || !lead.event_date ? 'Not Fixed' : formatDate(lead.event_date)}</span>
                    <span>• {lead.guest_count_status === 'not_fixed' || !lead.guest_count ? 'Not Fixed' : `${lead.guest_count} Pax`}</span>
                    {lead.budget && <span>• {formatCurrency(lead.budget)}</span>}
                  </div>
                </div>
              </div>

              {/* Quick Contact & Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                {/* Call Button */}
                <a
                  href={`tel:${lead.phone}`}
                  className="px-2.5 py-1 rounded-[6px] text-[12px] font-medium flex items-center gap-1 transition-colors"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground-secondary)',
                  }}
                  title="Call Customer"
                >
                  <Phone className="w-3 h-3" style={{ color: 'var(--success)' }} />
                  <span>Call</span>
                </a>

                {/* WhatsApp Button */}
                <a
                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hello ${lead.customer_name}, greetings from ${organization?.name || 'our venue'}! We are following up regarding your ${lead.event_type} inquiry.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-[6px] text-[12px] font-medium flex items-center gap-1 transition-colors"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--success)',
                  }}
                  title="WhatsApp Customer"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>

                {/* Open Detail */}
                <Link
                  href={`/leads/${lead.id}`}
                  className="px-3 py-1 rounded-[6px] text-[12px] font-semibold flex items-center gap-1 transition-colors"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-fg)',
                  }}
                >
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
