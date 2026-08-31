'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { LeadFilterCriteria, LeadStatus } from '@/types/database';
import { LeadFilters } from '@/components/leads/lead-filters';
import { LeadList } from '@/components/leads/lead-list';
import { CreateLeadModal } from '@/components/leads/create-lead-modal';
import { Lead } from '@/types/database';

function LeadsContent() {
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loadedLeads, setLoadedLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

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

  const fetchLeads = useCallback(async (offset: number, replace: boolean) => {
    setIsLoadingMore(true);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: '5',
      search: filters.searchQuery,
      status: filters.status,
      priority: filters.priority,
      ownerId: filters.ownerId,
      source: filters.source,
      eventType: filters.eventType,
      followUp: filters.followUpState,
      archived: String(filters.showArchived),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
    try {
      const response = await fetch(`/api/leads?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to load leads.');
      const nextLeads = (payload.leads || []) as Lead[];
      setLoadedLeads((current) => replace ? nextLeads : [...current, ...nextLeads]);
      setTotalLeads(payload.total || 0);
      setHasMore(Boolean(payload.hasMore));
    } catch (error) {
      console.error('Paginated lead loading failed:', error);
      if (replace) setLoadedLeads([]);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchLeads(0, true);
  }, [fetchLeads, refreshNonce]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isLoadingMore) {
        void fetchLeads(loadedLeads.length, false);
      }
    }, { rootMargin: '240px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchLeads, hasMore, isLoadingMore, loadedLeads.length]);

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
              • {totalLeads} inquiries found
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
      <LeadList leads={loadedLeads} onResetFilters={handleReset} />
      <div ref={loadMoreRef} className="min-h-8 flex items-center justify-center">
        {isLoadingMore && <span className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>Loading more leads...</span>}
        {!isLoadingMore && loadedLeads.length > 0 && !hasMore && <span className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>No more leads</span>}
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setRefreshNonce((value) => value + 1); }} />
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
