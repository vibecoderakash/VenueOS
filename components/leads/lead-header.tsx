'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  User,
  Flame,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Lead, LeadStatus, LeadPriority } from '@/types/database';
import {
  getStatusBadgeConfig,
  getEventTypeBadge,
  getSourceBadge,
  formatDisplayPhone,
} from '@/lib/utils';
import { useData } from '@/lib/data-context';
import confetti from 'canvas-confetti';
import { WhatsAppCommunicationModal } from './whatsapp-communication-modal';

interface LeadHeaderProps {
  lead: Lead;
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--foreground)',
  outline: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
};

export function LeadHeader({ lead }: LeadHeaderProps) {
  const router = useRouter();
  const { currentProfile, profiles, updateStatus, updatePriority, assignLead, archiveLead, restoreLead, deleteLead, organization } = useData();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  const [deleteError, setDeleteError] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = React.useState(false);

  if (!currentProfile) return null;

  const statusConfig = getStatusBadgeConfig(lead.status);
  const eventBadge = getEventTypeBadge(lead.event_type);
  const sourceBadge = getSourceBadge(lead.source);
  const isArchived = !!lead.archived_at;
  const canDelete = ['owner', 'manager', 'admin'].includes(currentProfile.role);

  const handleDelete = async () => {
    if (deleteConfirmation.trim() !== lead.customer_name.trim()) {
      setDeleteError('Type the lead customer name exactly to continue.');
      return;
    }
    setIsDeleting(true); setDeleteError('');
    try { await deleteLead(lead.id); router.push('/leads'); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : 'Unable to delete lead.'); setIsDeleting(false); }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (newStatus === 'Converted') {
      confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
    }
    await updateStatus(lead.id, newStatus);
  };

  const handleArchiveToggle = async () => {
    if (isArchived) {
      if (confirm('Restore this lead to the active pipeline?')) await restoreLead(lead.id);
    } else {
      if (confirm('Archive this lead?')) await archiveLead(lead.id);
    }
  };

  const controlStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--surface-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '4px 8px',
  };

  return (
    <div
      className="rounded-[12px] p-4 sm:p-5 space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Breadcrumb + Controls */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
          style={{ color: 'var(--foreground-muted)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Leads</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <div style={controlStyle}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              style={selectStyle}
            >
              {(['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'] as LeadStatus[]).map((s) => (
                <option key={s} value={s} style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div style={controlStyle}>
            <Flame className="w-3 h-3" style={{ color: 'var(--foreground-muted)' }} />
            <select
              value={lead.priority}
              onChange={(e) => updatePriority(lead.id, e.target.value as LeadPriority)}
              style={selectStyle}
            >
              {(['High', 'Medium', 'Low'] as LeadPriority[]).map((p) => (
                <option key={p} value={p} style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
                  {p} Priority
                </option>
              ))}
            </select>
          </div>

          {/* Owner */}
          <div style={controlStyle}>
            <User className="w-3 h-3" style={{ color: 'var(--foreground-muted)' }} />
            {currentProfile.role === 'sales' ? (
              <span className="text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>
                {profiles.find(p => p.id === lead.owner_id)?.name || 'Unassigned'}
              </span>
            ) : (
              <select
                value={lead.owner_id || ''}
                onChange={async (e) => {
                  try {
                    await assignLead(lead.id, e.target.value || null);
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'Failed to reassign lead');
                  }
                }}
                style={selectStyle}
              >
                <option value="" style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>Unassigned</option>
                {profiles
                  .filter(p => p.active !== false && p.is_active !== false) // Only active users
                  .filter(p => currentProfile.role === 'owner' ? true : p.role !== 'owner') // Managers can't assign to owners
                  .map((p) => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
                      {p.name} ({p.role})
                    </option>
                  ))
                }
              </select>
            )}
          </div>

          {/* Archive / Restore */}
          <button
            onClick={handleArchiveToggle}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[6px] transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--foreground-muted)',
              backgroundColor: 'var(--surface-secondary)',
            }}
            title={isArchived ? 'Restore lead' : 'Archive lead'}
          >
            {isArchived ? (
              <><RotateCcw className="w-3 h-3" /><span>Restore</span></>
            ) : (
              <><Archive className="w-3 h-3" /><span>Archive</span></>
            )}
          </button>
          {canDelete && (
            <button type="button" onClick={() => { setDeleteConfirmation(''); setDeleteError(''); setDeleteOpen(true); }} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-[6px] transition-colors" style={{ border: '1px solid var(--danger)', color: 'var(--danger)', backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)' }} title="Delete lead">
              <Trash2 className="w-3 h-3" /><span>Delete</span>
            </button>
          )}
        </div>
      </div>
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="delete-lead-title">
          <div className="w-full max-w-md rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--danger)' }}>
            <div><h2 id="delete-lead-title" className="text-base font-bold" style={{ color: 'var(--danger)' }}>Delete Lead Permanently</h2><p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>This action cannot be undone. All discussions and activity for this lead will also be removed.</p></div>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>Type <strong>{lead.customer_name}</strong> to confirm.</p>
            <input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Type lead customer name" className="w-full rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            {deleteError && <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{deleteError}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteOpen(false)} className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--foreground-secondary)' }}>Cancel</button><button type="button" disabled={isDeleting} onClick={handleDelete} className="px-3 py-2 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--danger)' }}>{isDeleting ? 'Deleting...' : 'Confirm Permanent Delete'}</button></div>
          </div>
        </div>
      )}

      {/* Customer Info + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5">
          {/* Name + Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[18px] font-bold leading-snug" style={{ color: 'var(--foreground)' }}>
              {lead.customer_name}
            </h1>

            {/* Event type badge */}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${eventBadge.color}`}
            >
              <span>{eventBadge.icon}</span>
              <span>{eventBadge.label}</span>
            </span>

            {/* Source badge */}
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sourceBadge.color}`}>
              {sourceBadge.label}
            </span>

            {isArchived && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--foreground-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Archived
              </span>
            )}
          </div>

          {/* Phone / Email */}
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {formatDisplayPhone(lead.phone)}
            </span>
            {lead.email && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ color: 'var(--foreground-secondary)' }}>{lead.email}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Contact Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Direct Mobile Call */}
          <a
            href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--foreground-secondary)',
            }}
            title={`Call ${lead.customer_name} (${lead.phone})`}
          >
            <Phone className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
            <span>Call</span>
          </a>

          {/* WhatsApp Hub */}
          <button
            type="button"
            onClick={() => setWhatsappModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-all cursor-pointer shadow-sm hover:opacity-95"
            style={{
              backgroundColor: 'var(--success-soft)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
            }}
            title="Open WhatsApp Communication Hub"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Communication Hub Modal */}
      <WhatsAppCommunicationModal
        lead={lead}
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
      />
    </div>
  );
}
