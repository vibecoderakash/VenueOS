'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  Users, 
  IndianRupee, 
  FileText, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { LeadPriority, BanquetEventType, LeadSource, EventDateStatus, GuestCountStatus } from '@/types/database';
import { normalizePhone, banquetEventTypes } from '@/lib/validations/lead';
import Link from 'next/link';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  const router = useRouter();
  const { createLead, checkDuplicatePhone, profiles, currentProfile } = useData();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState<BanquetEventType | ''>('');
  
  // Event Date state
  const [eventDateStatus, setEventDateStatus] = useState<EventDateStatus>('fixed');
  const [eventDate, setEventDate] = useState('');

  // Guest Count state
  const [guestCountStatus, setGuestCountStatus] = useState<GuestCountStatus>('fixed');
  const [guestCount, setGuestCount] = useState('');

  const [budget, setBudget] = useState('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [priority, setPriority] = useState<LeadPriority>('Medium');
  const [ownerId, setOwnerId] = useState<string>(currentProfile.id);
  const [requirement, setRequirement] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setOwnerId(currentProfile.id);
    }
  }, [isOpen, currentProfile.id]);

  if (!isOpen) return null;

  const normalizedPhone = normalizePhone(phone);
  const duplicateLead = normalizedPhone ? checkDuplicatePhone(normalizedPhone) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Customer Name Validation
    if (!customerName.trim()) {
      setValidationError('Customer name is required.');
      return;
    }

    // 2. Phone Number Validation
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setValidationError('Phone number must be exactly 10 digits.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    // 3. Event Type Validation
    if (!eventType || !banquetEventTypes.includes(eventType as BanquetEventType)) {
      setValidationError('Please select an event type.');
      return;
    }

    // 4. Lead Source Validation
    if (!source) {
      setValidationError('Please select a lead source.');
      return;
    }

    // 4. Event Date Validation
    if (eventDateStatus === 'fixed') {
      if (!eventDate || !eventDate.trim()) {
        setValidationError('Please select a valid event date or mark as Not Fixed.');
        return;
      }
    }

    // 5. Guest Count Validation
    let parsedGuestCount: number | undefined = undefined;
    if (guestCountStatus === 'fixed') {
      if (!guestCount || !guestCount.trim()) {
        setValidationError('Please enter a valid guest count or mark as Not Fixed.');
        return;
      }
      const num = parseInt(guestCount, 10);
      if (isNaN(num) || num <= 0) {
        setValidationError('Guest count must be a positive number greater than 0.');
        return;
      }
      if (num > 50000) {
        setValidationError('Guest count cannot exceed 50,000.');
        return;
      }
      parsedGuestCount = num;
    }

    setIsSubmitting(true);
    try {
      const newLead = await createLead({
        customer_name: customerName.trim(),
        phone: normalizedPhone,
        email: email.trim() || undefined,
        status: 'New',
        event_type: eventType as BanquetEventType,
        event_date_status: eventDateStatus,
        event_date: eventDateStatus === 'fixed' ? eventDate : null,
        guest_count_status: guestCountStatus,
        guest_count: parsedGuestCount,
        budget: budget ? parseFloat(budget) : undefined,
        source: source as LeadSource,
        priority: priority,
        owner_id: ownerId || undefined,
        requirement: requirement.trim() || undefined,
        next_follow_up_at: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
        follow_up_note: followUpNote.trim() || undefined,
      });

      onClose();
      router.push(`/leads/${newLead.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setValidationError(err.message);
      } else {
        setValidationError('Failed to create lead.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-[6px] px-2.5 py-1.5 text-[12px] focus:outline-none transition-all";
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div
        className="rounded-[12px] max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-xl my-8 transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center font-bold"
              style={{
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--primary)',
              }}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--foreground)' }}>
                Create New Banquet Inquiry
              </h2>
              <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
                Add phone, event context, and initial follow-up.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[6px] transition-colors hover:opacity-80"
            style={{ color: 'var(--foreground-muted)' }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Phone Warning */}
        {duplicateLead && (
          <div
            className="p-3 rounded-[8px] flex items-start gap-2.5"
            style={{
              backgroundColor: 'var(--warning-soft)',
              border: '1px solid var(--warning-border)',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div className="text-[12px]">
              <p className="font-bold" style={{ color: 'var(--warning)' }}>Duplicate Phone Number Detected</p>
              <p className="mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                A lead already exists for <strong style={{ color: 'var(--foreground)' }}>{duplicateLead.customer_name}</strong> ({duplicateLead.phone}) for {duplicateLead.event_type}.
              </p>
              <Link
                href={`/leads/${duplicateLead.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 font-bold underline mt-1"
                style={{ color: 'var(--primary)' }}
              >
                <span>Open Existing Lead</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {validationError && (
          <div
            className="p-2.5 rounded-[8px] text-[12px] font-medium"
            style={{
              backgroundColor: 'var(--danger-soft)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
            }}
          >
            {validationError}
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Customer Contact Info */}
          <div className="space-y-2">
            <h3
              className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ color: 'var(--foreground-muted)' }}
            >
              <User className="w-3 h-3" />
              <span>Customer Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label
                  className="block text-[12px] font-medium mb-1"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Customer Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amit Kapur"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                   className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-[12px] font-medium mb-1"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-[12px] font-medium mb-1"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Email Address
                </label>
                <input
                  type="text"
                  inputMode="email"
                  placeholder="e.g. amit@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Event Details */}
          <div className="space-y-2">
            <h3
              className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ color: 'var(--foreground-muted)' }}
            >
              <Building2 className="w-3 h-3" />
              <span>Banquet Event Context</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Event Type (Mandatory) */}
              <div>
                <label
                  className="block text-[12px] font-medium mb-1"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Event Type <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as BanquetEventType | '')}
                  className={`${inputClass} ${!eventType ? 'text-[var(--foreground-muted)]' : ''}`}
                  style={inputStyle}
                >
                  <option value="" disabled>Select Event Type</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Reception">Reception</option>
                  <option value="Ring Ceremony">Engagement / Ring Ceremony</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Kitty Party">Kitty Party</option>
                  <option value="Corporate">Corporate Event</option>
                  <option value="Party">Party</option>
                  <option value="Annaprashan">Annaprashan</option>
                  <option value="Other">Other</option>
                  <option value="not_provided">Not Provided</option>
                </select>
              </div>

              {/* Event Date (Mandatory State: Fixed / Not Fixed) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label
                    className="text-[12px] font-medium whitespace-nowrap"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Event Date <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div
                    className="inline-flex items-center gap-0.5 p-0.5 rounded-[7px] text-[10px] shrink-0"
                    style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
                  >
                    <button
                      type="button"
                      title="Use a fixed event date"
                      onClick={() => {
                        setEventDateStatus('fixed');
                        setEventDate('');
                      }}
                      className={`px-2 h-6 rounded-[5px] font-semibold whitespace-nowrap transition-all ${
                        eventDateStatus === 'fixed'
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      title="Event date is not fixed yet"
                      onClick={() => {
                        setEventDateStatus('not_fixed');
                        setEventDate('');
                      }}
                      className={`px-2 h-6 rounded-[5px] font-semibold whitespace-nowrap transition-all ${
                        eventDateStatus === 'not_fixed'
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      TBD
                    </button>
                  </div>
                </div>

                {eventDateStatus === 'fixed' ? (
                  <div className="relative mt-1">
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      onInput={(e) => setEventDate(e.currentTarget.value)}
                      className={`${inputClass} pr-10`}
                      style={{ ...inputStyle, color: eventDate ? 'var(--foreground)' : 'transparent' }}
                      lang="en-GB"
                    />
                    {!eventDate && (
                      <span
                        className="absolute inset-y-0 left-2.5 flex items-center text-[12px] pointer-events-none"
                        style={{ color: 'var(--foreground-muted)' }}
                      >
                        DD / MM / YYYY
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className="w-full h-9 rounded-[6px] px-2.5 text-[11px] flex items-center"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-muted)',
                    }}
                  >
                    Date will be confirmed later
                  </div>
                )}
              </div>

              {/* Guests Pax (Mandatory State: Number / Not Fixed) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label
                    className="text-[12px] font-medium whitespace-nowrap"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Guests (Pax) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div
                    className="inline-flex items-center gap-0.5 p-0.5 rounded-[7px] text-[10px] shrink-0"
                    style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
                  >
                    <button
                      type="button"
                      title="Set the guest count"
                      onClick={() => {
                        setGuestCountStatus('fixed');
                        setGuestCount('');
                      }}
                      className={`px-2 h-6 rounded-[5px] font-semibold whitespace-nowrap transition-all ${
                        guestCountStatus === 'fixed'
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      Number
                    </button>
                    <button
                      type="button"
                      title="Guest count is not fixed yet"
                      onClick={() => {
                        setGuestCountStatus('not_fixed');
                        setGuestCount('');
                      }}
                      className={`px-2 h-6 rounded-[5px] font-semibold whitespace-nowrap transition-all ${
                        guestCountStatus === 'not_fixed'
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      TBD
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
                    className={`${inputClass} mt-1 appearance-none`}
                    style={inputStyle}
                  />
                ) : (
                  <div
                    className="w-full h-9 rounded-[6px] px-2.5 text-[11px] flex items-center"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground-muted)',
                    }}
                  >
                    Guest count will be confirmed later
                  </div>
                )}
              </div>

              {/* Budget (Optional) */}
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
                  className={`${inputClass} appearance-none`}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Source, Owner, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label
                className="block text-[12px] font-medium mb-1"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource | '')}
                className={`${inputClass} ${!source ? 'text-[var(--foreground-muted)]' : ''}`}
                style={inputStyle}
              >
                <option value="" disabled>Select Lead Source</option>
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

            <div>
              <label
                className="block text-[12px] font-medium mb-1"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Sales Owner
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-[12px] font-medium mb-1"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as LeadPriority)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Section 4: Requirement Notes */}
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Requirement Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Veg menu requested, requires lawn area + AC banquet hall..."
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              className={inputClass}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {/* Section 5: Initial Follow-up (Optional) */}
          <div
            className="p-3 rounded-[8px] space-y-2 transition-colors"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <h4 className="text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
              Schedule Initial Follow-up (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label
                  className="block text-[11px] mb-0.5"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  Date & Time
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                    onInput={(e) => setNextFollowUpAt(e.currentTarget.value)}
                    className={`${inputClass} pr-10`}
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: nextFollowUpAt ? 'var(--foreground)' : 'transparent',
                    }}
                  />
                  {!nextFollowUpAt && (
                    <span
                      className="absolute inset-y-0 left-2.5 flex items-center text-[12px] pointer-events-none"
                      style={{ color: 'var(--foreground-muted)' }}
                    >
                      DD / MM / YYYY  ·  HH : MM
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label
                  className="block text-[11px] mb-0.5"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  Action Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call to discuss package"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  className={inputClass}
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="flex items-center justify-end gap-2 pt-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--foreground-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-[8px] text-white font-semibold text-[13px] transition-colors disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isSubmitting ? 'Creating Lead...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
