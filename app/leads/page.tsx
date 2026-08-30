'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { LeadFilterCriteria, LeadStatus } from '@/types/database';
import { LeadFilters } from '@/components/leads/lead-filters';
import { LeadList } from '@/components/leads/lead-list';
import { CreateLeadModal } from '@/components/leads/create-lead-modal';
import { getFollowUpStatus } from '@/lib/utils';

function LeadsContent() {
  const searchParams = useSearchParams();
  const { leads, getDiscussionsByLeadId } = useData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const initialStatus = (searchParams.get('status') as LeadStatus) || 'All';
  const initialFollowUp = (searchParams.get('followUp') as LeadFilterCriteria['followUpState']) || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [filters, setFilters] = useState<LeadFilterCriteria>({
    searchQuery: initialSearch,
    status: initialStatus,
    priority: 'All',
    ownerId: 'All',
    source: 'All',
    eventType: 'All',
    followUpState: initialFollowUp,
    showArchived: false,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const handleFilterChange = (updates: Partial<LeadFilterCriteria>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setFilters({
      searchQuery: '',
      status: 'All',
      priority: 'All',
      ownerId: 'All',
      source: 'All',
      eventType: 'All',
      followUpState: 'All',
      showArchived: false,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!filters.showArchived && lead.archived_at) return false;
      if (filters.showArchived && !lead.archived_at) return false;

      if (filters.status !== 'All' && lead.status !== filters.status) return false;
      if (filters.priority !== 'All' && lead.priority !== filters.priority) return false;
      if (filters.ownerId !== 'All' && lead.owner_id !== filters.ownerId) return false;
      if (filters.source !== 'All' && lead.source !== filters.source) return false;
      if (filters.eventType !== 'All' && lead.event_type !== filters.eventType) return false;

      if (filters.followUpState !== 'All') {
        const followUp = getFollowUpStatus(lead.next_follow_up_at);
        if (filters.followUpState === 'Overdue' && followUp.status !== 'overdue') return false;
        if (filters.followUpState === 'Today' && followUp.status !== 'today') return false;
        if (filters.followUpState === 'Upcoming' && followUp.status !== 'upcoming' && followUp.status !== 'tomorrow') return false;
        if (filters.followUpState === 'None' && followUp.status !== 'none') return false;
      }

      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const nameMatch = lead.customer_name.toLowerCase().includes(q);
        const phoneMatch = lead.phone.includes(q);
        const reqMatch = lead.requirement ? lead.requirement.toLowerCase().includes(q) : false;
        
        const discussions = getDiscussionsByLeadId(lead.id);
        const discMatch = discussions.some((d) => d.body.toLowerCase().includes(q));

        if (!nameMatch && !phoneMatch && !reqMatch && !discMatch) {
          return false;
        }
      }

      return true;
    });
  }, [leads, filters, getDiscussionsByLeadId]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 transition-colors"
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
              Leads
            </span>
            <span className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              • {filteredLeads.length} inquiries found
            </span>
          </div>
          <h1 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Banquet Lead Inbox
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
            Maintain conversation continuity and follow up with banquet customers on time.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-colors self-start sm:self-auto"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-fg)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <LeadFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Lead List */}
      <LeadList leads={filteredLeads} onResetFilters={handleReset} />

      {/* Create Lead Modal */}
      <CreateLeadModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[12px]" style={{ color: 'var(--foreground-muted)' }}>Loading leads...</div>}>
      <LeadsContent />
    </Suspense>
  );
}
