'use client';

import React from 'react';
import { 
  Search, 
  X, 
  RotateCcw, 
  Calendar, 
  Tag
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { LeadFilterCriteria, LeadStatus, LeadPriority, BanquetEventType, LeadSource } from '@/types/database';
import { cn } from '@/lib/utils';

interface LeadFiltersProps {
  filters: LeadFilterCriteria;
  onFilterChange: (filters: Partial<LeadFilterCriteria>) => void;
  onReset: () => void;
}

export function LeadFilters({ filters, onFilterChange, onReset }: LeadFiltersProps) {
  const { profiles } = useData();

  const statuses: (LeadStatus | 'All')[] = ['All', 'New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'];
  const followUpStates: LeadFilterCriteria['followUpState'][] = ['All', 'Overdue', 'Today', 'Upcoming', 'None'];

  const hasActiveFilters = 
    filters.searchQuery !== '' ||
    filters.status !== 'All' ||
    filters.priority !== 'All' ||
    filters.ownerId !== 'All' ||
    filters.source !== 'All' ||
    filters.eventType !== 'All' ||
    filters.followUpState !== 'All' ||
    filters.showArchived;

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    fontSize: '12px',
  };

  return (
    <div
      className="rounded-[12px] p-4 space-y-3 transition-colors"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Top row: Search input & Follow-up State Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Live Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search customer, phone, requirement, or notes..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            className="w-full rounded-[6px] px-3 py-1.5 pl-8 text-[12px] placeholder-opacity-60 focus:outline-none transition-all"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <Search
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--foreground-muted)' }}
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--foreground-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Follow-up State Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span
            className="text-[11px] font-semibold mr-1 flex items-center gap-1 flex-shrink-0"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <Calendar className="w-3 h-3" />
            <span>Follow-up:</span>
          </span>
          {followUpStates.map((state) => {
            const isSelected = filters.followUpState === state;
            let activeStyle: React.CSSProperties = {
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-fg)',
              borderColor: 'var(--primary)',
            };
            if (isSelected) {
              if (state === 'Overdue') {
                activeStyle = {
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  borderColor: 'var(--danger-border)',
                };
              } else if (state === 'Today') {
                activeStyle = {
                  backgroundColor: 'var(--warning-soft)',
                  color: 'var(--warning)',
                  borderColor: 'var(--warning-border)',
                };
              }
            }

            return (
              <button
                key={state}
                onClick={() => onFilterChange({ followUpState: state })}
                className="px-2.5 py-1 rounded-[6px] text-[12px] font-semibold whitespace-nowrap transition-colors border"
                style={
                  isSelected
                    ? activeStyle
                    : {
                        backgroundColor: 'var(--surface-secondary)',
                        color: 'var(--foreground-secondary)',
                        borderColor: 'var(--border)',
                      }
                }
              >
                {state === 'Overdue' && '🚨 '}
                {state === 'Today' && '⏰ '}
                {state}
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle row: Status Quick Filter Chips */}
      <div
        className="flex items-center gap-1 overflow-x-auto pb-1 pt-2.5"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span
          className="text-[11px] font-semibold mr-1 flex items-center gap-1 flex-shrink-0"
          style={{ color: 'var(--foreground-muted)' }}
        >
          <Tag className="w-3 h-3" />
          <span>Status:</span>
        </span>
        {statuses.map((st) => {
          const isSelected = filters.status === st;
          return (
            <button
              key={st}
              onClick={() => onFilterChange({ status: st })}
              className="px-2.5 py-1 rounded-[6px] text-[12px] whitespace-nowrap transition-colors border font-medium"
              style={
                isSelected
                  ? {
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-fg)',
                      borderColor: 'var(--primary)',
                      fontWeight: 600,
                    }
                  : {
                      backgroundColor: 'var(--surface-secondary)',
                      color: 'var(--foreground-secondary)',
                      borderColor: 'var(--border)',
                    }
              }
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* Bottom row: Selectors */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2.5"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Owner filter */}
        <div>
          <select
            value={filters.ownerId}
            onChange={(e) => onFilterChange({ ownerId: e.target.value })}
            className="w-full rounded-[6px] px-2 py-1.5 focus:outline-none cursor-pointer"
            style={selectStyle}
          >
            <option value="All">All Owners</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--surface)' }}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority filter */}
        <div>
          <select
            value={filters.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value as LeadPriority | 'All' })}
            className="w-full rounded-[6px] px-2 py-1.5 focus:outline-none cursor-pointer"
            style={selectStyle}
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        {/* Event Type filter */}
        <div>
          <select
            value={filters.eventType}
            onChange={(e) => onFilterChange({ eventType: e.target.value as BanquetEventType | 'All' })}
            className="w-full rounded-[6px] px-2 py-1.5 focus:outline-none cursor-pointer"
            style={selectStyle}
          >
            <option value="All">All Events</option>
            <option value="Wedding">Wedding</option>
            <option value="Reception">Reception</option>
            <option value="Ring Ceremony">Engagement / Ring Ceremony</option>
            <option value="Birthday">Birthday</option>
            <option value="Anniversary">Anniversary</option>
            <option value="Kitty Party">Kitty Party</option>
            <option value="Corporate">Corporate Event</option>
            <option value="Annaprashan">Annaprashan</option>
            <option value="Other">Other</option>
            <option value="not_provided">Not Provided</option>
          </select>
        </div>

        {/* Lead Source filter */}
        <div>
          <select
            value={filters.source}
            onChange={(e) => onFilterChange({ source: e.target.value as LeadSource | 'All' })}
            className="w-full rounded-[6px] px-2 py-1.5 focus:outline-none cursor-pointer"
            style={selectStyle}
          >
            <option value="All">All Sources</option>
            <option value="Meta">Meta Ads</option>
            <option value="Google">Google Ads</option>
            <option value="Google Business Profile">Google Business Profile</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone Call">Phone Call</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Referral">Referral</option>
            <option value="Website">Website</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="Other">Other</option>
            <option value="not_provided">Not Provided</option>
          </select>
        </div>

        {/* Archived Toggle & Reset */}
        <div className="flex items-center gap-2 col-span-2 sm:col-span-4 md:col-span-1 justify-between md:justify-end">
          <label
            className="flex items-center gap-1.5 text-[12px] cursor-pointer select-none"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            <input
              type="checkbox"
              checked={filters.showArchived}
              onChange={(e) => onFilterChange({ showArchived: e.target.checked })}
              className="rounded-[4px] cursor-pointer"
              style={{ accentColor: 'var(--primary)' }}
            />
            <span>Archived</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="p-1 text-[12px] flex items-center gap-1 font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
              title="Reset Filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
