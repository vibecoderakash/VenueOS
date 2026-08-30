'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Check, 
  CalendarPlus
} from 'lucide-react';
import { Lead } from '@/types/database';
import { getFollowUpStatus, formatDateTime, formatForDateTimeLocal } from '@/lib/utils';
import { useData } from '@/lib/data-context';
import { addDays, setHours, setMinutes, startOfTomorrow, nextMonday } from 'date-fns';

interface FollowupCardProps {
  lead: Lead;
}

export function FollowupCard({ lead }: FollowupCardProps) {
  const { updateFollowUp } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(
    formatForDateTimeLocal(lead.next_follow_up_at)
  );
  const [note, setNote] = useState(lead.follow_up_note || '');

  const followUp = getFollowUpStatus(lead.next_follow_up_at);
  const isOverdue = followUp.status === 'overdue';

  const handleSave = async (customDate?: string, customNote?: string) => {
    const targetDate = customDate !== undefined ? customDate : followUpDate;
    const targetNote = customNote !== undefined ? customNote : note;

    await updateFollowUp(
      lead.id,
      targetDate ? new Date(targetDate).toISOString() : null,
      targetNote || null
    );
    setIsEditing(false);
  };

  const applyPreset = async (presetType: 'today_eve' | 'tomorrow_morn' | 'in_2_days' | 'next_mon' | 'clear') => {
    if (presetType === 'clear') {
      setFollowUpDate('');
      setNote('');
      await updateFollowUp(lead.id, null, null);
      setIsEditing(false);
      return;
    }

    let d = new Date();
    let defaultNote = '';

    if (presetType === 'today_eve') {
      d = setMinutes(setHours(new Date(), 17), 30);
      defaultNote = 'Evening callback to confirm package pricing';
    } else if (presetType === 'tomorrow_morn') {
      d = setMinutes(setHours(startOfTomorrow(), 11), 0);
      defaultNote = 'Morning follow-up on date confirmation';
    } else if (presetType === 'in_2_days') {
      d = setMinutes(setHours(addDays(new Date(), 2), 15), 0);
      defaultNote = 'Follow-up regarding venue site visit';
    } else if (presetType === 'next_mon') {
      d = setMinutes(setHours(nextMonday(new Date()), 11), 30);
      defaultNote = 'Weekly check-in on booking decision';
    }

    const isoString = d.toISOString();
    setFollowUpDate(isoString.slice(0, 16));
    setNote(defaultNote);
    await updateFollowUp(lead.id, isoString, defaultNote);
    setIsEditing(false);
  };

  return (
    <div
      className="rounded-[12px] p-4 sm:p-5 border transition-all"
      style={{
        backgroundColor: isOverdue ? 'var(--danger-soft)' : 'var(--surface)',
        borderColor: isOverdue ? 'var(--danger-border)' : 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{
              backgroundColor: isOverdue ? 'var(--danger-soft)' : 'var(--surface-secondary)',
              color: isOverdue ? 'var(--danger)' : 'var(--foreground-secondary)',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
            Next Follow-up
          </h3>
        </div>

        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${followUp.badgeClass}`}>
          {followUp.label}
        </span>
      </div>

      {!isEditing ? (
        <div className="space-y-2.5">
          {lead.next_follow_up_at ? (
            <div
              className="p-3 rounded-[8px] space-y-1 transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[12px] font-bold flex items-center gap-1.5"
                  style={{ color: 'var(--foreground)' }}
                >
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                  <span>{formatDateTime(lead.next_follow_up_at)}</span>
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[12px] font-semibold hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Reschedule
                </button>
              </div>

              {lead.follow_up_note && (
                <p
                  className="text-[12px] italic pt-1"
                  style={{
                    color: 'var(--foreground-secondary)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  &ldquo;{lead.follow_up_note}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div
              className="p-3 rounded-[8px] text-center space-y-1.5 transition-colors"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
                No follow-up currently scheduled.
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 rounded-[6px] text-white font-semibold text-[12px] transition-colors inline-flex items-center gap-1"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Set Follow-up</span>
              </button>
            </div>
          )}

          {/* Quick Schedule Presets */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <p
              className="text-[10px] uppercase font-bold tracking-wider mb-1.5"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Quick Shortcuts
            </p>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Today 5:30 PM', preset: 'today_eve' as const },
                { label: 'Tomorrow 11 AM', preset: 'tomorrow_morn' as const },
                { label: 'In 2 Days', preset: 'in_2_days' as const },
                { label: 'Next Mon', preset: 'next_mon' as const },
              ].map(({ label, preset }) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
              {lead.next_follow_up_at && (
                <button
                  onClick={() => applyPreset('clear')}
                  className="px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--danger-soft)',
                    border: '1px solid var(--danger-border)',
                    color: 'var(--danger)',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Follow-up Form */
        <div className="space-y-2.5 pt-1">
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Follow-up Date & Time
            </label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full rounded-[6px] px-2 py-1 text-[12px] focus:outline-none"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Action Note
            </label>
            <input
              type="text"
              placeholder="e.g. Call customer back regarding menu options..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-[6px] px-2 py-1 text-[12px] focus:outline-none"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-[12px] font-medium"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave()}
              className="px-3 py-1 rounded-[6px] text-white font-semibold text-[12px] flex items-center gap-1 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
