'use client';

import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Phone,
  Copy,
  Check,
  Send,
  Sparkles,
  Building2,
  Calendar,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Lead } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { useData } from '@/lib/data-context';

interface WhatsAppCommunicationModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppCommunicationModal({
  lead,
  isOpen,
  onClose,
}: WhatsAppCommunicationModalProps) {
  const { organization, currentProfile, addDiscussion } = useData();
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [logToDiscussion, setLogToDiscussion] = useState(true);

  if (!isOpen) return null;

  const venueName = organization?.name || 'Grand Palace Banquet';
  const customerName = lead.customer_name || 'Valued Guest';
  const eventType = lead.event_type || 'Event';
  const staffName = currentProfile?.name || 'Event Coordinator';
  
  const eventDateFormatted = lead.event_date_status === 'not_fixed' || !lead.event_date
    ? 'Date (TBD)'
    : formatDate(lead.event_date);

  const guestCountFormatted = lead.guest_count_status === 'not_fixed' || !lead.guest_count
    ? 'Guests (TBD)'
    : `${lead.guest_count} guests`;

  // Pre-defined Banquet WhatsApp Templates
  const templates = [
    {
      id: 'greeting_inquiry',
      title: '🎉 Initial Inquiry & Greeting',
      badge: 'Most Popular',
      getText: () =>
        `Hello ${customerName}! 👋\n\nGreetings from *${venueName}*.\n\nThank you for your interest in hosting your *${eventType}* with us on *${eventDateFormatted}* for approximately *${guestCountFormatted}*.\n\nWe would love to show you our banquet halls, catering menus, and special package options. When would be a convenient time for a quick call or venue visit? 🏛️✨\n\nWarm regards,\n*${staffName}* | ${venueName}`,
    },
    {
      id: 'packages_menu',
      title: '📋 Packages & Menu Details',
      badge: 'Brochure',
      getText: () =>
        `Hello ${customerName},\n\nThis is *${staffName}* from *${venueName}*.\n\nRegarding your upcoming *${eventType}* on *${eventDateFormatted}*, I would be delighted to share our customized banquet packages, live food station menus, and decor themes.\n\nPlease let me know if you would like me to share our latest package brochure here on WhatsApp, or if you'd prefer scheduling a visit to experience the venue in person! 🎊\n\nBest wishes,\n${venueName}`,
    },
    {
      id: 'date_followup',
      title: '⏰ Date Availability & Follow-up',
      badge: 'Urgent',
      getText: () =>
        `Hello ${customerName},\n\nHope you are having a wonderful day!\n\nJust checking in from *${venueName}* regarding your *${eventType}* inquiry for *${eventDateFormatted}*.\n\nWe are currently receiving multiple inquiries for this date and wanted to check if you would like us to tentatively reserve the slot for you before it gets booked.\n\nLooking forward to hearing from you!\n*${staffName}* | ${venueName}`,
    },
    {
      id: 'custom_msg',
      title: '✍️ Custom Personalized Message',
      badge: 'Custom',
      getText: () => customMessage || `Hello ${customerName}, greetings from ${venueName}! Following up on your ${eventType} inquiry.`,
    },
  ];

  const activeMessage =
    selectedTemplateIndex === 3
      ? customMessage || templates[3].getText()
      : templates[selectedTemplateIndex].getText();

  // Clean phone number for WhatsApp link
  const rawDigits = lead.phone.replace(/[^0-9]/g, '');
  // If Indian 10-digit number without country code, prepend 91
  const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;

  const handleSendWhatsApp = async () => {
    // Optionally log to discussion history
    if (logToDiscussion) {
      try {
        await addDiscussion(lead.id, {
          body: `📱 [Sent WhatsApp Message]\n\n${activeMessage}`,
        });
      } catch (err) {
        console.error('Failed to log WhatsApp to discussions:', err);
      }
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(activeMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="whatsapp-modal-title" className="text-base font-bold text-foreground">
                WhatsApp Communication Hub
              </h2>
              <p className="text-xs text-foreground-muted">
                Send 1-click tailored message to <strong className="text-foreground">{customerName}</strong> ({lead.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Quick Details Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-foreground-secondary">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary border" style={{ borderColor: 'var(--border)' }}>
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>{eventType}</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary border" style={{ borderColor: 'var(--border)' }}>
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>{eventDateFormatted}</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary border" style={{ borderColor: 'var(--border)' }}>
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>{guestCountFormatted}</span>
            </span>
          </div>

          {/* Template Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">
              Select Message Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map((tpl, index) => {
                const isSelected = selectedTemplateIndex === index;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateIndex(index)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                        : 'border-border bg-surface-secondary hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-foreground">{tpl.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-black/5 dark:bg-white/5 text-foreground-muted'
                        }`}
                      >
                        {tpl.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Editor (if Template 4 selected) */}
          {selectedTemplateIndex === 3 && (
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1">
                Edit Custom Message
              </label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your customized message here..."
                className="w-full p-3 rounded-xl border bg-background text-foreground text-xs font-mono focus:outline-none focus:border-emerald-500"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          )}

          {/* Live WhatsApp Message Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Live WhatsApp Message Preview</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-foreground-muted hover:text-foreground cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp Chat Bubble Mockup */}
            <div className="p-4 rounded-xl bg-[#0b141a]/95 text-white shadow-inner font-sans relative overflow-hidden">
              <div className="bg-[#005c4b] text-emerald-50 p-3 rounded-2xl rounded-tr-none text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                {activeMessage}
                <div className="text-[10px] text-emerald-200/60 text-right mt-1.5">
                  Just now · ✓✓
                </div>
              </div>
            </div>
          </div>

          {/* Log to Discussions Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="log-discussion-cb"
              checked={logToDiscussion}
              onChange={(e) => setLogToDiscussion(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label
              htmlFor="log-discussion-cb"
              className="text-xs text-foreground-secondary cursor-pointer select-none flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Automatically record this WhatsApp message in lead discussion history</span>
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t bg-surface-secondary"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Click to Call link */}
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Direct Call ({lead.phone})</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
