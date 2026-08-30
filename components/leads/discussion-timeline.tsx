'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Calendar,
  Tag
} from 'lucide-react';
import { Lead, LeadDiscussion, LeadStatus } from '@/types/database';
import { useData } from '@/lib/data-context';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

interface DiscussionTimelineProps {
  lead: Lead;
}

export function DiscussionTimeline({ lead }: DiscussionTimelineProps) {
  const { currentProfile, getDiscussionsByLeadId, addDiscussion, deleteDiscussion, editDiscussion } = useData();

  const discussions = getDiscussionsByLeadId(lead.id);

  // New Note Form State
  const [body, setBody] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [newStatus, setNewStatus] = useState<LeadStatus | ''>('');
  const [showFollowUpField, setShowFollowUpField] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing Note State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsSubmitting(true);
    try {
      await addDiscussion(lead.id, {
        body: body.trim(),
        next_follow_up_at: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
        follow_up_note: followUpNote || undefined,
        new_status: newStatus ? (newStatus as LeadStatus) : undefined,
      });

      setBody('');
      setNextFollowUpAt('');
      setFollowUpNote('');
      setNewStatus('');
      setShowFollowUpField(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (d: LeadDiscussion) => {
    setEditingId(d.id);
    setEditBody(d.body);
  };

  const handleSaveEdit = async (discussionId: string) => {
    if (!editBody.trim()) return;
    await editDiscussion(lead.id, discussionId, editBody.trim());
    setEditingId(null);
  };

  const handleDelete = async (discussionId: string) => {
    if (confirm('Delete this discussion entry?')) {
      await deleteDiscussion(lead.id, discussionId);
    }
  };

  return (
    <div
      className="rounded-[12px] p-4 sm:p-5 space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center font-bold"
            style={{
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
              Discussion History
            </h2>
            <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              Preserve conversation context across sales reps
            </p>
          </div>
        </div>

        <span className="text-[12px] font-medium" style={{ color: 'var(--foreground-muted)' }}>
          {discussions.length} Note{discussions.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Inline Quick Discussion Logger Form */}
      <form
        onSubmit={handleAddNote}
        className="p-3.5 rounded-[8px] space-y-2.5 transition-colors"
        style={{
          backgroundColor: 'var(--surface-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between text-[12px]">
          <span style={{ color: 'var(--foreground-secondary)' }}>
            Log Discussion Note as <strong style={{ color: 'var(--foreground)' }}>{currentProfile.name}</strong>
          </span>
          <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
            Plain text
          </span>
        </div>

        <textarea
          rows={2}
          required
          placeholder="e.g. Spoke with customer. Looking for 350 pax reception. Shared pricing catalog. Requested callback tomorrow..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-2 rounded-[6px] text-[12px] focus:outline-none transition-all resize-none leading-relaxed"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />

        {/* Optional Follow-up & Status Setter Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {!showFollowUpField ? (
              <button
                type="button"
                onClick={() => setShowFollowUpField(true)}
                className="text-[12px] flex items-center gap-1 font-medium transition-colors"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                <span>+ Next Follow-up</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-[6px]"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <Clock className="w-3 h-3" style={{ color: 'var(--foreground-muted)' }} />
                <input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                  className="bg-transparent text-[12px] focus:outline-none"
                  style={{ color: 'var(--foreground)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setNextFollowUpAt('');
                    setShowFollowUpField(false);
                  }}
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Quick Status Setter */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-[6px]"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <Tag className="w-3 h-3" style={{ color: 'var(--foreground-muted)' }} />
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                className="bg-transparent text-[12px] focus:outline-none cursor-pointer"
                style={{ color: 'var(--foreground)' }}
              >
                <option value="" style={{ backgroundColor: 'var(--surface)' }}>Keep Status ({lead.status})</option>
                <option value="New" style={{ backgroundColor: 'var(--surface)' }}>Set New</option>
                <option value="Contacted" style={{ backgroundColor: 'var(--surface)' }}>Set Contacted</option>
                <option value="Interested" style={{ backgroundColor: 'var(--surface)' }}>Set Interested</option>
                <option value="Follow-up" style={{ backgroundColor: 'var(--surface)' }}>Set Follow-up</option>
                <option value="Converted" style={{ backgroundColor: 'var(--surface)' }}>Set Converted</option>
                <option value="Lost" style={{ backgroundColor: 'var(--surface)' }}>Set Lost</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !body.trim()}
            className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
          >
            <Send className="w-3 h-3" />
            <span>{isSubmitting ? 'Saving...' : 'Add Note'}</span>
          </button>
        </div>
      </form>

      {/* Reverse Chronological Timeline Stream */}
      <div className="space-y-2.5">
        {discussions.length === 0 ? (
          <div
            className="p-6 text-center rounded-[8px] space-y-1 transition-colors"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <MessageSquare className="w-6 h-6 mx-auto" style={{ color: 'var(--foreground-muted)' }} />
            <h3 className="text-[12px] font-semibold" style={{ color: 'var(--foreground)' }}>
              No Discussion Notes Yet
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              Call or WhatsApp the customer, then log a quick summary note above.
            </p>
          </div>
        ) : (
          discussions.map((disc, index) => {
            const isEditing = editingId === disc.id;
            const isAuthor = currentProfile.id === disc.author_id;
            const canManage = isAuthor || currentProfile.role === 'owner' || currentProfile.role === 'admin';
            const isLatest = index === 0;

            return (
              <div
                key={disc.id}
                className="p-3.5 rounded-[8px] border transition-all"
                style={{
                  backgroundColor: isLatest ? 'var(--primary-soft)' : 'var(--surface-secondary)',
                  borderColor: isLatest ? 'var(--border)' : 'var(--border)',
                }}
              >
                {/* Author + Timestamp Row */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {disc.author?.name ? disc.author.name.slice(0, 1) : 'U'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
                        {disc.author?.name || 'Team Member'}
                      </span>
                      <span className="text-[10px] capitalize" style={{ color: 'var(--foreground-muted)' }}>
                        ({({ owner: 'Owner', admin: 'Admin', manager: 'Manager', sales: 'Sales', front_desk: 'Front Desk' } as Record<string, string>)[disc.author?.role || 'sales'] || disc.author?.role || 'Sales'})
                      </span>
                      {isLatest && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold border"
                          style={{
                            backgroundColor: 'var(--surface)',
                            color: 'var(--primary)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          Latest
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--foreground-muted)' }}
                      title={formatDateTime(disc.created_at)}
                    >
                      {formatDateTime(disc.created_at)} ({formatRelativeTime(disc.created_at)})
                    </span>

                    {canManage && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(disc)}
                          className="p-0.5"
                          style={{ color: 'var(--foreground-muted)' }}
                          title="Edit"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(disc.id)}
                          className="p-0.5"
                          style={{ color: 'var(--danger)' }}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body / Edit Body */}
                {!isEditing ? (
                  <p
                    className="text-[12px] leading-relaxed whitespace-pre-wrap pl-7"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {disc.body}
                  </p>
                ) : (
                  <div className="pl-7 space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-[6px] text-[12px] focus:outline-none resize-none"
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-0.5 text-[12px]"
                        style={{ color: 'var(--foreground-muted)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(disc.id)}
                        className="px-2.5 py-0.5 rounded-[6px] text-white font-semibold text-[12px] flex items-center gap-1"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        <Check className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
