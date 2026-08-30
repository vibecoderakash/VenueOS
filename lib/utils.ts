import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isPast, formatDistanceToNow, parseISO, isTomorrow } from 'date-fns';
import { LeadStatus, LeadPriority, BanquetEventType, LeadSource } from '@/types/database';
import { formatDisplayPhone, normalizePhone } from '@/lib/validations/lead';

export { formatDisplayPhone, normalizePhone };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  if (amount == null || isNaN(amount)) return '—';
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return format(d, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return format(d, 'dd MMM yyyy, h:mm a');
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '';
  }
}

export function formatForDateTimeLocal(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export type FollowUpStatusType = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'none';

export function getFollowUpStatus(dateStr: string | null | undefined): {
  status: FollowUpStatusType;
  label: string;
  badgeClass: string;
} {
  if (!dateStr) {
    return {
      status: 'none',
      label: 'No follow-up',
      badgeClass: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#7A8494] dark:text-[#94A3B8] border-[#DDE1E6] dark:border-[#334155]',
    };
  }

  try {
    const targetDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);

    if (isPast(targetDate) && !isToday(targetDate)) {
      return {
        status: 'overdue',
        label: `Overdue (${format(targetDate, 'dd MMM')})`,
        badgeClass: 'bg-[#FEF2F2] dark:bg-[rgba(248,113,113,0.12)] text-[#DC2626] dark:text-[#F87171] border-[#FECACA] dark:border-[rgba(248,113,113,0.30)] font-semibold',
      };
    }

    if (isToday(targetDate)) {
      return {
        status: 'today',
        label: `Due Today (${format(targetDate, 'h:mm a')})`,
        badgeClass: 'bg-[#FFFBEB] dark:bg-[rgba(251,191,36,0.12)] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[rgba(251,191,36,0.30)] font-semibold',
      };
    }

    if (isTomorrow(targetDate)) {
      return {
        status: 'tomorrow',
        label: `Tomorrow (${format(targetDate, 'h:mm a')})`,
        badgeClass: 'bg-[#EEF2FF] dark:bg-[rgba(129,140,248,0.12)] text-[#4F46E5] dark:text-[#818CF8] border-[#C7D2FE] dark:border-[rgba(129,140,248,0.30)] font-medium',
      };
    }

    return {
      status: 'upcoming',
      label: format(targetDate, 'dd MMM, h:mm a'),
      badgeClass: 'bg-[#F0FDF4] dark:bg-[rgba(74,222,128,0.12)] text-[#16A34A] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[rgba(74,222,128,0.30)] font-medium',
    };
  } catch {
    return {
      status: 'none',
      label: 'Invalid date',
      badgeClass: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#7A8494] dark:text-[#94A3B8] border-[#DDE1E6] dark:border-[#334155]',
    };
  }
}

export function getStatusBadgeConfig(status: LeadStatus) {
  switch (status) {
    case 'New':
      return {
        label: 'New Lead',
        colorClass: 'bg-[#EEF2FF] dark:bg-[rgba(129,140,248,0.12)] text-[#4F46E5] dark:text-[#818CF8] border-[#C7D2FE] dark:border-[rgba(129,140,248,0.25)]',
        dotClass: 'bg-[#4F46E5] dark:bg-[#818CF8]',
      };
    case 'Contacted':
      return {
        label: 'Contacted',
        colorClass: 'bg-[#EFF6FF] dark:bg-[rgba(96,165,250,0.12)] text-[#2563EB] dark:text-[#60A5FA] border-[#BFDBFE] dark:border-[rgba(96,165,250,0.25)]',
        dotClass: 'bg-[#2563EB] dark:bg-[#60A5FA]',
      };
    case 'Interested':
      return {
        label: 'Interested',
        colorClass: 'bg-[#EEF2FF] dark:bg-[rgba(129,140,248,0.15)] text-[#4F46E5] dark:text-[#A5B4FC] border-[#C7D2FE] dark:border-[rgba(129,140,248,0.30)] font-medium',
        dotClass: 'bg-[#4F46E5] dark:bg-[#818CF8]',
      };
    case 'Follow-up':
      return {
        label: 'Follow-up',
        colorClass: 'bg-[#FFFBEB] dark:bg-[rgba(251,191,36,0.12)] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[rgba(251,191,36,0.25)] font-medium',
        dotClass: 'bg-[#D97706] dark:bg-[#FBBF24]',
      };
    case 'Converted':
      return {
        label: 'Converted',
        colorClass: 'bg-[#F0FDF4] dark:bg-[rgba(74,222,128,0.12)] text-[#16A34A] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[rgba(74,222,128,0.30)] font-semibold',
        dotClass: 'bg-[#16A34A] dark:bg-[#4ADE80]',
      };
    case 'Lost':
      return {
        label: 'Lost',
        colorClass: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#7A8494] dark:text-[#94A3B8] border-[#DDE1E6] dark:border-[#334155]',
        dotClass: 'bg-[#7A8494] dark:bg-[#94A3B8]',
      };
    default:
      return {
        label: status,
        colorClass: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#596579] dark:text-[#CBD5E1] border-[#DDE1E6] dark:border-[#334155]',
        dotClass: 'bg-[#596579]',
      };
  }
}

export function getPriorityBadgeConfig(priority: LeadPriority) {
  switch (priority) {
    case 'High':
      return {
        label: 'High Priority',
        colorClass: 'bg-[#FEF2F2] dark:bg-[rgba(248,113,113,0.12)] text-[#DC2626] dark:text-[#F87171] border-[#FECACA] dark:border-[rgba(248,113,113,0.30)] font-medium',
        badge: 'text-[#DC2626] dark:text-[#F87171]',
      };
    case 'Medium':
      return {
        label: 'Medium Priority',
        colorClass: 'bg-[#FFFBEB] dark:bg-[rgba(251,191,36,0.12)] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[rgba(251,191,36,0.30)] font-medium',
        badge: 'text-[#D97706] dark:text-[#FBBF24]',
      };
    case 'Low':
      return {
        label: 'Low Priority',
        colorClass: 'bg-[#F0FDF4] dark:bg-[rgba(74,222,128,0.12)] text-[#16A34A] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[rgba(74,222,128,0.30)]',
        badge: 'text-[#16A34A] dark:text-[#4ADE80]',
      };
    default:
      return {
        label: priority,
        colorClass: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#596579] dark:text-[#CBD5E1] border-[#DDE1E6] dark:border-[#334155]',
        badge: 'text-[#596579]',
      };
  }
}

export function getEventTypeBadge(eventType: BanquetEventType) {
  const map: Record<BanquetEventType, { label: string; icon: string; color: string }> = {
    Wedding: { label: 'Wedding', icon: '💍', color: 'bg-[#FEF2F2] dark:bg-[rgba(248,113,113,0.10)] text-[#DC2626] dark:text-[#F87171] border-[#FECACA] dark:border-[rgba(248,113,113,0.25)]' },
    Reception: { label: 'Reception', icon: '🥂', color: 'bg-[#FFFBEB] dark:bg-[rgba(251,191,36,0.10)] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[rgba(251,191,36,0.25)]' },
    Birthday: { label: 'Birthday', icon: '🎂', color: 'bg-[#FDF4FF] dark:bg-[rgba(232,121,249,0.10)] text-[#C026D3] dark:text-[#E879F9] border-[#F5D0FE] dark:border-[rgba(232,121,249,0.25)]' },
    'Ring Ceremony': { label: 'Engagement / Ring Ceremony', icon: '✨', color: 'bg-[#FEFCE8] dark:bg-[rgba(250,204,21,0.10)] text-[#CA8A04] dark:text-[#FACC15] border-[#FEF08A] dark:border-[rgba(250,204,21,0.25)]' },
    Anniversary: { label: 'Anniversary', icon: '🎉', color: 'bg-[#FDF2F8] dark:bg-[rgba(244,114,182,0.10)] text-[#DB2777] dark:text-[#F472B6] border-[#FBCFE8] dark:border-[rgba(244,114,182,0.25)]' },
    Corporate: { label: 'Corporate Event', icon: '💼', color: 'bg-[#EFF6FF] dark:bg-[rgba(96,165,250,0.10)] text-[#2563EB] dark:text-[#60A5FA] border-[#BFDBFE] dark:border-[rgba(96,165,250,0.25)]' },
    Party: { label: 'Party', icon: '🎈', color: 'bg-[#F5F3FF] dark:bg-[rgba(167,139,250,0.10)] text-[#7C3AED] dark:text-[#A78BFA] border-[#DDD6FE] dark:border-[rgba(167,139,250,0.25)]' },
    'Kitty Party': { label: 'Kitty Party', icon: '👯‍♀️', color: 'bg-[#FDF4FF] dark:bg-[rgba(232,121,249,0.10)] text-[#C026D3] dark:text-[#E879F9] border-[#F5D0FE] dark:border-[rgba(232,121,249,0.25)]' },
    Annaprashan: { label: 'Annaprashan', icon: '👶', color: 'bg-[#FFFBEB] dark:bg-[rgba(251,191,36,0.10)] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[rgba(251,191,36,0.25)]' },
    not_provided: { label: 'Not Provided', icon: '❓', color: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#596579] dark:text-[#CBD5E1] border-[#DDE1E6] dark:border-[#334155]' },
    Other: { label: 'Other', icon: '🎪', color: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#596579] dark:text-[#CBD5E1] border-[#DDE1E6] dark:border-[#334155]' },
  };
  return map[eventType] || map.Other;
}

export function getSourceBadge(source: LeadSource) {
  const map: Record<LeadSource, { label: string; color: string }> = {
    Meta: { label: 'Meta Ads', color: 'bg-[#EFF6FF] dark:bg-[rgba(96,165,250,0.10)] text-[#2563EB] dark:text-[#60A5FA] border-[#BFDBFE] dark:border-[rgba(96,165,250,0.25)]' },
    Google: { label: 'Google Ads', color: 'bg-[#F0F9FF] dark:bg-[rgba(56,189,248,0.10)] text-[#0284C7] dark:text-[#38BDF8] border-[#BAE6FD] dark:border-[rgba(56,189,248,0.25)]' },
    'Google Business Profile': { label: 'Google Business Profile', color: 'bg-[#ECFEFF] dark:bg-[rgba(34,211,238,0.10)] text-[#0891B2] dark:text-[#22D3EE] border-[#A5F3FC] dark:border-[rgba(34,211,238,0.25)]' },
    WhatsApp: { label: 'WhatsApp', color: 'bg-[#F0FDF4] dark:bg-[rgba(74,222,128,0.10)] text-[#16A34A] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[rgba(74,222,128,0.25)]' },
    'Phone Call': { label: 'Phone Call', color: 'bg-[#F5F3FF] dark:bg-[rgba(167,139,250,0.10)] text-[#7C3AED] dark:text-[#A78BFA] border-[#DDD6FE] dark:border-[rgba(167,139,250,0.25)]' },
    'Walk-in': { label: 'Walk-in', color: 'bg-[#F0FDFA] dark:bg-[rgba(45,212,191,0.10)] text-[#0D9488] dark:text-[#2DD4BF] border-[#99F6E4] dark:border-[rgba(45,212,191,0.25)]' },
    Referral: { label: 'Referral', color: 'bg-[#FFFBEB] dark:bg-[rgba(251,191,36,0.10)] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[rgba(251,191,36,0.25)]' },
    Website: { label: 'Website', color: 'bg-[#ECFEFF] dark:bg-[rgba(34,211,238,0.10)] text-[#0891B2] dark:text-[#22D3EE] border-[#A5F3FC] dark:border-[rgba(34,211,238,0.25)]' },
    Instagram: { label: 'Instagram', color: 'bg-[#FDF4FF] dark:bg-[rgba(232,121,249,0.10)] text-[#C026D3] dark:text-[#E879F9] border-[#F5D0FE] dark:border-[rgba(232,121,249,0.25)]' },
    Facebook: { label: 'Facebook', color: 'bg-[#EEF2FF] dark:bg-[rgba(129,140,248,0.10)] text-[#4F46E5] dark:text-[#818CF8] border-[#C7D2FE] dark:border-[rgba(129,140,248,0.25)]' },
    Other: { label: 'Other', color: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#596579] dark:text-[#CBD5E1] border-[#DDE1E6] dark:border-[#334155]' },
    not_provided: { label: 'Not Provided', color: 'bg-[#F1F3F5] dark:bg-[#1E293B] text-[#596579] dark:text-[#CBD5E1] border-[#DDE1E6] dark:border-[#334155]' },
  };
  return map[source] || map.Other;
}
