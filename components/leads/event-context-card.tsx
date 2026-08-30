'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Users, 
  IndianRupee, 
  FileText, 
  Edit3, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { Lead, BanquetEventType, EventDateStatus, GuestCountStatus } from '@/types/database';
import { formatDate, formatCurrency, getEventTypeBadge } from '@/lib/utils';
import { useData } from '@/lib/data-context';
import { banquetEventTypes } from '@/lib/validations/lead';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';

interface EventContextCardProps {
  lead: Lead;
}

export function EventContextCard({ lead }: EventContextCardProps) {
  const { updateLead } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [eventType, setEventType] = useState<BanquetEventType>(lead.event_type);
  const [eventDateStatus, setEventDateStatus] = useState<EventDateStatus>(
    lead.event_date_status || (lead.event_date ? 'fixed' : 'not_fixed')
  );
  const [eventDate, setEventDate] = useState(lead.event_date || '');
  const [guestCountStatus, setGuestCountStatus] = useState<GuestCountStatus>(
    lead.guest_count_status || (lead.guest_count ? 'fixed' : 'not_fixed')
  );
  const [guestCount, setGuestCount] = useState(lead.guest_count?.toString() || '');
  const [budget, setBudget] = useState(lead.budget?.toString() || '');
  const [requirement, setRequirement] = useState(lead.requirement || '');
  const [editError, setEditError] = useState<string | null>(null);

  const eventBadge = getEventTypeBadge(lead.event_type);

  const getCountdown = (dateStr?: string | null) => {
    if (!dateStr || lead.event_date_status === 'not_fixed') return null;
    try {
      const d = parseISO(dateStr);
      if (isPast(d)) return 'Past event';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return null;
    }
  };

  const countdown = getCountdown(lead.event_date);

  const handleSave = async () => {
    setEditError(null);

    if (!eventType || !banquetEventTypes.includes(eventType)) {
      setEditError('Please select an event type.');
      return;
    }

    if (eventDateStatus === 'fixed' && (!eventDate || !eventDate.trim())) {
      setEditError('Please select a valid event date or mark as Not Fixed.');
      return;
    }

    let parsedGuestCount: number | null = null;
    if (guestCountStatus === 'fixed') {
      if (!guestCount || !guestCount.trim()) {
        setEditError('Please enter a valid guest count or mark as Not Fixed.');
        return;
      }
      const num = parseInt(guestCount, 10);
      if (isNaN(num) || num <= 0) {
        setEditError('Guest count must be a positive number greater than 0.');
        return;
      }
      if (num > 50000) {
        setEditError('Guest count cannot exceed 50,000.');
        return;
      }
      parsedGuestCount = num;
    }

    try {
      await updateLead(lead.id, {
        event_type: eventType,
        event_date_status: eventDateStatus,
        event_date: eventDateStatus === 'fixed' ? eventDate : null,
        guest_count_status: guestCountStatus,
        guest_count: parsedGuestCount,
        budget: budget ? parseFloat(budget) : null,
        requirement: requirement || null,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError('Failed to update lead details.');
      }
    }
  };

  const handleCancel = () => {
    setEventType(lead.event_type);
    setEventDateStatus(lead.event_date_status || (lead.event_date ? 'fixed' : 'not_fixed'));
    setEventDate(lead.event_date || '');
    setGuestCountStatus(lead.guest_count_status || (lead.guest_count ? 'fixed' : 'not_fixed'));
    setGuestCount(lead.guest_count?.toString() || '');
    setBudget(lead.budget?.toString() || '');
    setRequirement(lead.requirement || '');
    setEditError(null);
    setIsEditing(false);
  };

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
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
            Event Context
          </h3>
        </div>

        {!isEditing ? (
          <button
            onClick={() => {
              setEventType(lead.event_type);
              setEventDateStatus(lead.event_date_status || (lead.event_date ? 'fixed' : 'not_fixed'));
              setEventDate(lead.event_date || '');
              setGuestCountStatus(lead.guest_count_status || (lead.guest_count ? 'fixed' : 'not_fixed'));
              setGuestCount(lead.guest_count?.toString() || '');
              setBudget(lead.budget?.toString() || '');
              setRequirement(lead.requirement || '');
              setEditError(null);
              setIsEditing(true);
            }}
            className="text-[12px] flex items-center gap-1 font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              className="px-2.5 py-1 rounded-[6px] text-white font-semibold text-[12px] flex items-center gap-1 transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Check className="w-3 h-3" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="p-1 rounded-[6px] hover:opacity-80 transition-colors"
              style={{ color: 'var(--foreground-muted)' }}
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {editError && (
        <div
          className="p-2.5 rounded-[8px] text-[12px] font-medium flex items-center gap-2"
          style={{
            backgroundColor: 'var(--danger-soft)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{editError}</span>
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Event Type */}
            <div
              className="p-2.5 rounded-[8px] transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>
                Event Type
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[12px]">{eventBadge.icon}</span>
                <span className="text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
                  {lead.event_type}
                </span>
              </div>
            </div>

            {/* Event Date */}
            <div
              className="p-2.5 rounded-[8px] transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>
                Event Date
              </p>
              {lead.event_date_status === 'not_fixed' || !lead.event_date ? (
                <div className="mt-0.5">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-muted)',
                    }}
                  >
                    Not Fixed
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-bold mt-0.5 truncate" style={{ color: 'var(--foreground)' }}>
                    {formatDate(lead.event_date)}
                  </p>
                  {countdown && (
                    <span className="text-[10px] block mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                      {countdown}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Guest Count */}
            <div
              className="p-2.5 rounded-[8px] transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>
                Guest Count
              </p>
              {lead.guest_count_status === 'not_fixed' || !lead.guest_count ? (
                <div className="mt-0.5">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-muted)',
                    }}
                  >
                    Not Fixed
                  </span>
                </div>
              ) : (
                <p className="text-[12px] font-bold mt-0.5" style={{ color: 'var(--foreground)' }}>
                  {lead.guest_count} Pax
                </p>
              )}
            </div>

            {/* Budget */}
            <div
              className="p-2.5 rounded-[8px] transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>
                Estimated Budget
              </p>
              <p className="text-[12px] font-bold mt-0.5" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(lead.budget)}
              </p>
            </div>
          </div>

          {/* Budget per Pax Indicator */}
          {lead.budget && lead.guest_count && lead.guest_count > 0 && lead.guest_count_status !== 'not_fixed' ? (
            <div
              className="p-2.5 rounded-[8px] flex items-center justify-between transition-colors"
              style={{
                backgroundColor: 'var(--primary-soft)',
                border: '1px solid var(--border)',
              }}
            >
              <span className="text-[11px] font-medium" style={{ color: 'var(--primary)' }}>
                Avg. Budget / Guest:
              </span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(Math.round(lead.budget / lead.guest_count))} / pax
              </span>
            </div>
          ) : null}

          {/* Customer Requirement Notes */}
          <div
            className="p-3 rounded-[8px] space-y-1 transition-colors"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1"
              style={{ color: 'var(--foreground-muted)' }}
            >
              <FileText className="w-3 h-3" />
              <span>Customer Requirements</span>
            </p>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              {lead.requirement || 'No specific requirements recorded.'}
            </p>
          </div>
        </div>
      ) : (
        /* Edit Form */
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Edit Event Type */}
            <div>
              <label
                className="block text-[12px] font-medium mb-1"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Event Type <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as BanquetEventType)}
                className="w-full rounded-[6px] px-2.5 py-1.5 text-[12px] focus:outline-none"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
                required
              >
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

            {/* Edit Event Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Event Date <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div
                  className="flex items-center p-0.5 rounded-[5px] text-[10px]"
                  style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEventDateStatus('fixed');
                      setEventDate('');
                    }}
                    className={`px-1.5 py-0.5 rounded-[3px] font-medium transition-all ${
                      eventDateStatus === 'fixed'
                        ? 'bg-[var(--primary)] text-white shadow-xs font-semibold'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Select Date
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventDateStatus('not_fixed');
                      setEventDate('');
                    }}
                    className={`px-1.5 py-0.5 rounded-[3px] font-medium transition-all ${
                      eventDateStatus === 'not_fixed'
                        ? 'bg-[var(--primary)] text-white shadow-xs font-semibold'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Not Fixed
                  </button>
                </div>
              </div>

              {eventDateStatus === 'fixed' ? (
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-[6px] px-2.5 py-1.5 text-[12px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              ) : (
                <div
                  className="w-full rounded-[6px] px-2.5 py-1.5 text-[11px] italic flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px dashed var(--border)',
                    color: 'var(--foreground-muted)',
                  }}
                >
                  <span>To be decided</span>
                  <span
                    className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[4px]"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-muted)',
                    }}
                  >
                    Not Fixed
                  </span>
                </div>
              )}
            </div>

            {/* Edit Guests Pax */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Guests (Pax) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div
                  className="flex items-center p-0.5 rounded-[5px] text-[10px]"
                  style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setGuestCountStatus('fixed');
                      setGuestCount('');
                    }}
                    className={`px-1.5 py-0.5 rounded-[3px] font-medium transition-all ${
                      guestCountStatus === 'fixed'
                        ? 'bg-[var(--primary)] text-white shadow-xs font-semibold'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Number
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestCountStatus('not_fixed');
                      setGuestCount('');
                    }}
                    className={`px-1.5 py-0.5 rounded-[3px] font-medium transition-all ${
                      guestCountStatus === 'not_fixed'
                        ? 'bg-[var(--primary)] text-white shadow-xs font-semibold'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Not Fixed
                  </button>
                </div>
              </div>

              {guestCountStatus === 'fixed' ? (
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 350"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full rounded-[6px] px-2.5 py-1.5 text-[12px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              ) : (
                <div
                  className="w-full rounded-[6px] px-2.5 py-1.5 text-[11px] italic flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px dashed var(--border)',
                    color: 'var(--foreground-muted)',
                  }}
                >
                  <span>Not finalized</span>
                  <span
                    className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[4px]"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-muted)',
                    }}
                  >
                    Not Fixed
                  </span>
                </div>
              )}
            </div>

            {/* Edit Budget */}
            <div>
              <label
                className="block text-[12px] font-medium mb-1"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Budget (INR)
              </label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-[6px] px-2.5 py-1.5 text-[12px] focus:outline-none"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>

          {/* Edit Requirements */}
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Requirement Notes
            </label>
            <textarea
              rows={2}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              className="w-full rounded-[6px] px-2.5 py-1.5 text-[12px] focus:outline-none resize-none"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
