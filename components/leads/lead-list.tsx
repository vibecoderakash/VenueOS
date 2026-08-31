'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Phone, 
  MessageCircle, 
  ArrowRight, 
  Calendar, 
  Users, 
  IndianRupee, 
  Clock, 
  User, 
  MessageSquare,
  FolderOpen
} from 'lucide-react';
import { Lead } from '@/types/database';
import { 
  getStatusBadgeConfig, 
  getPriorityBadgeConfig, 
  getEventTypeBadge, 
  getSourceBadge,
  getFollowUpStatus, 
  formatDate, 
  formatCurrency,
  formatDisplayPhone
} from '@/lib/utils';
import { useData } from '@/lib/data-context';

interface LeadListProps {
  leads: Lead[];
  isLoading?: boolean;
  onResetFilters?: () => void;
}

export function LeadList({ leads, isLoading = false, onResetFilters }: LeadListProps) {
  const { profiles, getDiscussionsByLeadId, organization } = useData();

  if (isLoading && leads.length === 0) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="rounded-[12px] p-4 sm:p-4.5 border animate-pulse"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 rounded" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                  <div className="h-4 w-16 rounded-full" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                  <div className="h-4 w-14 rounded-full" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                  <div className="h-3 w-28 rounded" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                  <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 rounded-[6px]" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                <div className="h-7 w-20 rounded-[6px]" style={{ backgroundColor: 'var(--surface-secondary)' }} />
                <div className="h-7 w-16 rounded-[6px]" style={{ backgroundColor: 'var(--surface-secondary)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div
        className="rounded-[12px] p-10 text-center space-y-2.5 transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center mx-auto"
          style={{
            backgroundColor: 'var(--surface-secondary)',
            color: 'var(--foreground-muted)',
          }}
        >
          <FolderOpen className="w-5 h-5" />
        </div>
        <h3 className="text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
          No Leads Found
        </h3>
        <p
          className="text-[12px] max-w-sm mx-auto"
          style={{ color: 'var(--foreground-muted)' }}
        >
          No inquiries matched your search or filters.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              color: 'var(--foreground-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {leads.map((lead) => {
        const owner = profiles.find((p) => p.id === lead.owner_id);
        const statusConfig = getStatusBadgeConfig(lead.status);
        const priorityConfig = getPriorityBadgeConfig(lead.priority);
        const eventBadge = getEventTypeBadge(lead.event_type);
        const sourceBadge = getSourceBadge(lead.source);
        const followUp = getFollowUpStatus(lead.next_follow_up_at);
        const discussions = getDiscussionsByLeadId(lead.id);
        const latestDiscussion = discussions.length > 0 ? discussions[0] : null;

        const isOverdue = followUp.status === 'overdue';

        return (
          <div
            key={lead.id}
            className="rounded-[12px] p-4 sm:p-4.5 border transition-all duration-150"
            style={{
              backgroundColor: isOverdue ? 'var(--danger-soft)' : 'var(--surface)',
              borderColor: isOverdue ? 'var(--danger-border)' : 'var(--border)',
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Details Block */}
              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Header line */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-[14px] sm:text-[15px] font-bold hover:underline transition-colors truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {lead.customer_name}
                  </Link>

                  {/* Status Badge */}
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusConfig.colorClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                    <span>{statusConfig.label}</span>
                  </span>

                  {/* Priority Badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${priorityConfig.colorClass}`}
                  >
                    {priorityConfig.label}
                  </span>

                  {/* Event Type Badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${eventBadge.color}`}
                  >
                    <span>{eventBadge.icon}</span>
                    <span>{eventBadge.label}</span>
                  </span>

                  {/* Lead Source Badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${sourceBadge.color}`}
                  >
                    {sourceBadge.label}
                  </span>

                  {/* Loss reason badge */}
                  {lead.status === 'Lost' && lead.lost_reason && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold flex items-center gap-1"
                      title={lead.lost_reason_details || undefined}
                    >
                      <span>❌ {lead.lost_reason}</span>
                    </span>
                  )}

                  {/* Custom Tags */}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {lead.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded-md border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                      {lead.tags.length > 3 && (
                        <span className="text-[9px] text-foreground-muted font-bold">
                          +{lead.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Context row */}
                <div
                  className="flex items-center gap-3 text-[12px] flex-wrap"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  <div className="flex items-center gap-1 font-semibold" style={{ color: 'var(--foreground)' }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--foreground-muted)' }} />
                    <span>{formatDisplayPhone(lead.phone)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--foreground-muted)' }} />
                    <span>Event Date: <strong style={{ color: 'var(--foreground)' }}>{lead.event_date_status === 'not_fixed' || !lead.event_date ? 'Not Fixed' : formatDate(lead.event_date)}</strong></span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" style={{ color: 'var(--foreground-muted)' }} />
                    <span>Guests: <strong style={{ color: 'var(--foreground)' }}>{lead.guest_count_status === 'not_fixed' || !lead.guest_count ? 'Not Fixed' : `${lead.guest_count} Pax`}</strong></span>
                  </div>

                  {lead.budget && (
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" style={{ color: 'var(--foreground-muted)' }} />
                      <span>Budget: <strong style={{ color: 'var(--foreground)' }}>{formatCurrency(lead.budget)}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center gap-1" style={{ color: 'var(--foreground-muted)' }}>
                    <User className="w-3.5 h-3.5" />
                    <span>Owner: <strong>{owner ? owner.name : 'Unassigned'}</strong></span>
                  </div>
                </div>

                {/* Latest Discussion Preview */}
                {latestDiscussion ? (
                  <div
                    className="p-2 rounded-[8px] text-[12px] flex items-start gap-1.5 mt-0.5 transition-colors"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-secondary)',
                    }}
                  >
                    <MessageSquare
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--primary)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1">
                        <strong className="font-semibold mr-1" style={{ color: 'var(--foreground)' }}>
                          {latestDiscussion.author?.name || 'Team'}:
                        </strong>
                        {latestDiscussion.body}
                      </p>
                    </div>
                  </div>
                ) : lead.requirement ? (
                  <div
                    className="text-[12px] line-clamp-1 italic mt-0.5"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    &ldquo;{lead.requirement}&rdquo;
                  </div>
                ) : null}
              </div>

              {/* Right Action & Follow-up Block */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2.5 flex-shrink-0 pt-2 lg:pt-0 border-t sm:border-t-0 border-border/60">
                {/* Follow-up Status Badge */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 font-medium ${followUp.badgeClass}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{followUp.label}</span>
                  </span>
                  <span className="sm:hidden text-[11px] text-foreground-muted">
                    {formatDisplayPhone(lead.phone)}
                  </span>
                </div>

                {/* Quick Contact & Navigation Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1 rounded-lg text-[13px] sm:text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-secondary)',
                    }}
                    title={`Direct Call ${lead.customer_name} (${lead.phone})`}
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                    <span>Call</span>
                  </a>

                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${lead.customer_name}, greetings from ${organization?.name || 'our venue'}! We are following up regarding your ${lead.event_type} inquiry.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1 rounded-lg text-[13px] sm:text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--success)',
                    }}
                    title="Open WhatsApp Chat"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <Link
                    href={`/leads/${lead.id}`}
                    className="px-3.5 py-2 sm:py-1 rounded-lg text-[13px] sm:text-[12px] font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-fg)',
                    }}
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
