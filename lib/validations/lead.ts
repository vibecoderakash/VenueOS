import { z } from 'zod';
import type { BanquetEventType, EventDateStatus, GuestCountStatus, LeadPriority, LeadSource, LeadStatus } from '@/types/database';

// Utility to normalize phone numbers before applying the strict 10-digit rule.
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const cleaned = rawPhone.replace(/\D/g, '');
  return cleaned;
}

export function formatDisplayPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const cleaned = normalizePhone(rawPhone);
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }
  return rawPhone;
}

export const banquetEventTypes: [BanquetEventType, ...BanquetEventType[]] = [
  'Wedding',
  'Reception',
  'Birthday',
  'Ring Ceremony',
  'Anniversary',
  'Corporate',
  'Party',
  'Kitty Party',
  'Annaprashan',
  'Other',
  'not_provided',
];

export const leadSources: [LeadSource, ...LeadSource[]] = [
  'Meta',
  'WhatsApp',
  'Instagram',
  'Facebook',
  'Website',
  'Google',
  'Referral',
  'Walk-in',
  'Phone Call',
  'Google Business Profile',
  'Other',
  'not_provided',
];

export const leadStatuses: [LeadStatus, ...LeadStatus[]] = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up',
  'Converted',
  'Lost',
];

export const leadPriorities: [LeadPriority, ...LeadPriority[]] = ['High', 'Medium', 'Low'];

export const eventDateStatuses: [EventDateStatus, ...EventDateStatus[]] = ['fixed', 'not_fixed'];
export const guestCountStatuses: [GuestCountStatus, ...GuestCountStatus[]] = ['fixed', 'not_fixed'];

// Base lead validation object before refinement
const rawCreateLeadSchema = z.object({
  customer_name: z
    .string({ required_error: 'Customer name is required.' })
    .trim()
    .min(2, 'Customer name must be at least 2 characters.')
    .max(100, 'Customer name cannot exceed 100 characters.'),
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits.'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .optional()
    .nullable()
    .or(z.literal('')),
  source: z.enum(leadSources, {
    required_error: 'Please select a lead source.',
    invalid_type_error: 'Please select a valid lead source.',
  }),
  event_type: z.enum(banquetEventTypes, {
    required_error: 'Please select an event type.',
    invalid_type_error: 'Please select a valid event type.',
  }),
  event_date_status: z.enum(eventDateStatuses, {
    required_error: 'Please specify whether the event date is fixed or not fixed.',
    invalid_type_error: 'Invalid event date status.',
  }),
  event_date: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal('')),
  guest_count_status: z.enum(guestCountStatuses, {
    required_error: 'Please specify whether the guest count is fixed or not fixed.',
    invalid_type_error: 'Invalid guest count status.',
  }),
  guest_count: z
    .number()
    .int('Guest count must be a whole number.')
    .optional()
    .nullable(),
  budget: z
    .number()
    .min(0, 'Budget cannot be negative.')
    .optional()
    .nullable(),
  requirement: z.string().max(1000, 'Requirement notes cannot exceed 1000 characters.').optional().nullable().or(z.literal('')),
  owner_id: z.string().optional().nullable(),
  priority: z.enum(leadPriorities).default('Medium'),
  status: z.enum(leadStatuses).default('New'),
  next_follow_up_at: z.string().optional().nullable().or(z.literal('')),
  follow_up_note: z.string().max(500, 'Follow-up note cannot exceed 500 characters.').optional().nullable().or(z.literal('')),
  initial_discussion: z.string().max(1000, 'Initial discussion cannot exceed 1000 characters.').optional().nullable().or(z.literal('')),
});

const isDisallowedFakeDate = (dateStr: string): boolean => {
  const fakeDates = ['1970-01-01', '0000-00-00', '1900-01-01', '01/01/1900', '01/01/1970'];
  return fakeDates.includes(dateStr.trim());
};

export const createLeadSchema = rawCreateLeadSchema.superRefine((data, ctx) => {
  // 1. EVENT DATE CONSISTENCY
  if (data.event_date_status === 'fixed') {
    if (!data.event_date || !data.event_date.trim() || isDisallowedFakeDate(data.event_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['event_date'],
        message: 'Please select a valid event date when event date is fixed.',
      });
    }
  } else if (data.event_date_status === 'not_fixed') {
    if (data.event_date && data.event_date.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['event_date'],
        message: 'Event date must be null when event date status is not fixed.',
      });
    }
  }

  // 2. GUEST COUNT CONSISTENCY
  if (data.guest_count_status === 'fixed') {
    if (data.guest_count === undefined || data.guest_count === null || isNaN(data.guest_count)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Please enter a valid guest count when guest count is fixed.',
      });
    } else if (data.guest_count <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Guest count must be a positive number greater than 0.',
      });
    } else if (data.guest_count > 50000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Guest count exceeds maximum allowed limit (50,000).',
      });
    }
  } else if (data.guest_count_status === 'not_fixed') {
    if (data.guest_count !== undefined && data.guest_count !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Guest count must be null when guest count status is not fixed.',
      });
    }
  }
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadDetailsSchema = z.object({
  event_type: z.enum(banquetEventTypes, {
    required_error: 'Please select an event type.',
    invalid_type_error: 'Please select a valid event type.',
  }),
  event_date_status: z.enum(eventDateStatuses),
  event_date: z.string().trim().optional().nullable().or(z.literal('')),
  guest_count_status: z.enum(guestCountStatuses),
  guest_count: z.number().int().optional().nullable(),
  budget: z.number().min(0, 'Budget cannot be negative.').optional().nullable(),
  requirement: z.string().max(1000).optional().nullable().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.event_date_status === 'fixed') {
    if (!data.event_date || !data.event_date.trim() || isDisallowedFakeDate(data.event_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['event_date'],
        message: 'Please select a valid event date when event date is fixed.',
      });
    }
  } else if (data.event_date_status === 'not_fixed') {
    if (data.event_date && data.event_date.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['event_date'],
        message: 'Event date must be null when event date status is not fixed.',
      });
    }
  }

  if (data.guest_count_status === 'fixed') {
    if (data.guest_count === undefined || data.guest_count === null || isNaN(data.guest_count)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Please enter a valid guest count when guest count is fixed.',
      });
    } else if (data.guest_count <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Guest count must be a positive number greater than 0.',
      });
    } else if (data.guest_count > 50000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Guest count exceeds maximum limit (50,000).',
      });
    }
  } else if (data.guest_count_status === 'not_fixed') {
    if (data.guest_count !== undefined && data.guest_count !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_count'],
        message: 'Guest count must be null when guest count status is not fixed.',
      });
    }
  }
});

export type UpdateLeadDetailsInput = z.infer<typeof updateLeadDetailsSchema>;

export const addDiscussionSchema = z.object({
  body: z.string().min(2, 'Discussion note cannot be empty').max(2000),
  next_follow_up_at: z.string().optional().nullable(),
  follow_up_note: z.string().max(500).optional().nullable(),
  new_status: z.enum(['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']).optional(),
});

export type AddDiscussionInput = z.infer<typeof addDiscussionSchema>;
