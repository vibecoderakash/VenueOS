// ============================================================================
// VENUE OS V1 - TypeScript Data Models & Types
// ============================================================================

export type UserRole = 'owner' | 'manager' | 'staff' | 'admin' | 'sales' | 'front_desk';
export type AppRole = 'owner' | 'manager' | 'staff';

export type LeadStatus = 
  | 'New' 
  | 'Contacted' 
  | 'Interested' 
  | 'Follow-up' 
  | 'Converted' 
  | 'Lost';

export type LeadPriority = 'High' | 'Medium' | 'Low';

export type LeadSource = 
  | 'Meta' 
  | 'WhatsApp' 
  | 'Instagram' 
  | 'Facebook' 
  | 'Website' 
  | 'Google' 
  | 'Referral' 
  | 'Walk-in' 
  | 'Phone Call'
  | 'Google Business Profile'
  | 'Other'
  | 'not_provided';

export type BanquetEventType = 
  | 'Wedding' 
  | 'Reception' 
  | 'Birthday' 
  | 'Ring Ceremony' 
  | 'Anniversary' 
  | 'Corporate' 
  | 'Party' 
  | 'Kitty Party'
  | 'Annaprashan'
  | 'Other'
  | 'not_provided';

export type EventDateStatus = 'fixed' | 'not_fixed';
export type GuestCountStatus = 'fixed' | 'not_fixed';

export type BanquetLossReason =
  | 'Budget Issue'
  | 'Date Unavailable'
  | 'Booked Competitor'
  | 'Cancelled Plan'
  | 'Unresponsive / Cold'
  | 'Other';

export const BANQUET_POPULAR_TAGS = [
  'VIP Client',
  'High Budget',
  'Lawn Preference',
  'Pure Veg',
  'Grand Ballroom',
  'AC Hall Required',
  'DJ & Stage Setup',
  'Rooms Required',
] as const;

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  logo_url?: string;
  currency: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active?: boolean;
  active?: boolean;
  avatar_url?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  source: LeadSource;
  event_type: BanquetEventType;
  event_date_status: EventDateStatus;
  event_date?: string | null;
  guest_count_status: GuestCountStatus;
  guest_count?: number | null;
  budget?: number | null;
  requirement?: string | null;
  owner_id?: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  tags?: string[];
  lost_reason?: BanquetLossReason | string | null;
  lost_reason_details?: string | null;
  next_follow_up_at?: string | null;
  follow_up_note?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  owner?: Profile | null;
  discussions?: LeadDiscussion[];
  activity?: LeadActivity[];
}

export interface LeadDiscussion {
  id: string;
  organization_id: string;
  lead_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  author?: Profile | null;
}

export type LeadActionType = 
  | 'lead_created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'lead_reassigned'
  | 'follow_up_updated'
  | 'discussion_added'
  | 'archived'
  | 'restored'
  | 'details_updated'
  | 'discussion_edited'
  | 'discussion_deleted'
  | 'lead_deleted';

export interface LeadActivity {
  id: string;
  organization_id: string;
  lead_id: string;
  actor_id?: string | null;
  action_type: LeadActionType;
  metadata?: {
    old_value?: string | number | null;
    new_value?: string | number | null;
    details?: string;
    [key: string]: unknown;
  };
  created_at: string;

  // Joined relations
  actor?: Profile | null;
}

export interface LeadAssignmentHistory {
  id: string;
  organization_id: string;
  lead_id: string;
  assigned_from?: string | null;
  assigned_to?: string | null;
  assigned_by?: string | null;
  reason?: string | null;
  created_at: string;

  // Joined relations
  assigned_from_profile?: Profile | null;
  assigned_to_profile?: Profile | null;
  assigned_by_profile?: Profile | null;
}

export interface LeadFilterCriteria {
  searchQuery: string;
  status: LeadStatus | 'All';
  priority: LeadPriority | 'All';
  ownerId: string | 'All';
  source: LeadSource | 'All';
  eventType: BanquetEventType | 'All';
  tag?: string | 'All';
  lossReason?: string | 'All';
  followUpState: 'All' | 'Overdue' | 'Today' | 'Upcoming' | 'None';
  showArchived: boolean;
  sortBy: 'created_at' | 'event_date' | 'next_follow_up_at' | 'customer_name' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export interface DashboardMetrics {
  newLeadsCount: number;
  dueTodayFollowUpsCount: number;
  overdueFollowUpsCount: number;
  activeInterestedCount: number;
  convertedCount: number;
  totalActiveCount: number;
  conversionRate: number;
  followUpAdherenceRate: number;
}
