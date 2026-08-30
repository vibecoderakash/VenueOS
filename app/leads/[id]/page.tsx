'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MessageSquare, 
  Activity, 
  FolderOpen
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { LeadHeader } from '@/components/leads/lead-header';
import { EventContextCard } from '@/components/leads/event-context-card';
import { FollowupCard } from '@/components/leads/followup-card';
import { DiscussionTimeline } from '@/components/leads/discussion-timeline';
import { LeadActivityLog } from '@/components/leads/lead-activity-log';

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;

  const { getLeadById } = useData();
  const lead = getLeadById(leadId);

  const [activeTab, setActiveTab] = useState<'discussions' | 'activity'>('discussions');

  if (!lead) {
    return (
      <div
        className="rounded-[12px] p-10 text-center space-y-3 max-w-md mx-auto mt-10 transition-colors"
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
        <h2 className="text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
          Lead Not Found
        </h2>
        <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
          The requested inquiry record may have been removed or does not exist.
        </p>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-fg)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Leads</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header with Quick Contact & Status Dropdown */}
      <LeadHeader lead={lead} />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Discussions Timeline (Core V1) & Activity Tab */}
        <div className="lg:col-span-2 space-y-3.5">
          {/* Tab Selector */}
          <div
            className="flex items-center gap-1.5 pb-1.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setActiveTab('discussions')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors"
              style={
                activeTab === 'discussions'
                  ? {
                      backgroundColor: 'var(--primary-soft)',
                      color: 'var(--primary)',
                      border: '1px solid var(--border)',
                    }
                  : {
                      color: 'var(--foreground-muted)',
                    }
              }
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Discussion History ({lead.discussions?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors"
              style={
                activeTab === 'activity'
                  ? {
                      backgroundColor: 'var(--primary-soft)',
                      color: 'var(--primary)',
                      border: '1px solid var(--border)',
                    }
                  : {
                      color: 'var(--foreground-muted)',
                    }
              }
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Log ({lead.activity?.length || 0})</span>
            </button>
          </div>

          {activeTab === 'discussions' ? (
            <DiscussionTimeline lead={lead} />
          ) : (
            <LeadActivityLog leadId={lead.id} />
          )}
        </div>

        {/* Right 1 Col: Follow-up Card + Event Context */}
        <div className="space-y-4">
          <FollowupCard lead={lead} />
          <EventContextCard lead={lead} />
        </div>
      </div>
    </div>
  );
}
