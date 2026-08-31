'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  DollarSign,
  CalendarX,
  Building,
  Ban,
  PhoneOff,
  HelpCircle,
  Check,
} from 'lucide-react';
import { BanquetLossReason, Lead } from '@/types/database';

interface LossReasonModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: BanquetLossReason, details?: string) => Promise<void>;
}

const LOSS_REASONS: {
  reason: BanquetLossReason;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    reason: 'Budget Issue',
    title: '💸 Budget Mismatch',
    description: 'Our plate or hall package exceeded the client\'s budget.',
    icon: DollarSign,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  },
  {
    reason: 'Date Unavailable',
    title: '📅 Date / Slot Unavailable',
    description: 'Hall or lawn was already booked for the requested date/slot.',
    icon: CalendarX,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  },
  {
    reason: 'Booked Competitor',
    title: '🏨 Booked Competitor',
    description: 'Client chose another banquet hall or hotel venue.',
    icon: Building,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    reason: 'Cancelled Plan',
    title: '❌ Event Cancelled / Postponed',
    description: 'Event plan was cancelled or delayed indefinitely by the host.',
    icon: Ban,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  },
  {
    reason: 'Unresponsive / Cold',
    title: '📴 Unresponsive / Cold Lead',
    description: 'Client stopped responding after multiple follow-up attempts.',
    icon: PhoneOff,
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
  },
  {
    reason: 'Other',
    title: '✍️ Other Reason',
    description: 'Specific unique reason (provide notes below).',
    icon: HelpCircle,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  },
];

export function LossReasonModal({
  lead,
  isOpen,
  onClose,
  onConfirm,
}: LossReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<BanquetLossReason>('Budget Issue');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(selectedReason, details.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update loss reason.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loss-reason-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] my-0 sm:my-8 animate-slideInUp sm:animate-fadeIn"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="loss-reason-modal-title" className="text-base font-bold text-foreground">
                Mark Inquiry as Lost
              </h2>
              <p className="text-xs text-foreground-muted">
                Capture reason for <strong className="text-foreground">{lead.customer_name}</strong> ({lead.event_type})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">
              Primary Loss Reason <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {LOSS_REASONS.map((item) => {
                const isSelected = selectedReason === item.reason;
                return (
                  <button
                    key={item.reason}
                    type="button"
                    onClick={() => setSelectedReason(item.reason)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/5 ring-2 ring-rose-500/20'
                        : 'border-border bg-surface-secondary hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-foreground-muted truncate">{item.description}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-border bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1">
              Optional Context / Notes
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Client budget was ₹1,200/plate, or booked Royal Palms Banquet instead..."
              className="w-full p-3 rounded-xl border bg-background text-foreground text-xs focus:outline-none focus:border-rose-500 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          {/* Footer Actions */}
          <div
            className="flex items-center justify-end gap-2 pt-3 border-t sticky bottom-0 bg-surface z-10"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold border text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Confirm Mark as Lost'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
