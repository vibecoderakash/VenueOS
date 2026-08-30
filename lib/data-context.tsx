'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Lead, 
  Profile, 
  Organization, 
  LeadDiscussion, 
  LeadActivity, 
  LeadStatus, 
  LeadPriority,
  DashboardMetrics 
} from '@/types/database';
import { CreateLeadInput, AddDiscussionInput, normalizePhone, createLeadSchema } from './validations/lead';
import { isPast, isToday } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { createBrowserClient } from '@/lib/supabase/client';

const EMPTY_ORGANIZATION: Organization = {
  id: '', name: '', currency: 'INR', created_at: '', updated_at: '',
};

interface DataContextType {
  organization: Organization;
  currentProfile: Profile;
  profiles: Profile[];
  leads: Lead[];
  metrics: DashboardMetrics;
  isAuthenticated: boolean;
  login: (profileId: string) => void;
  logout: () => void;
  setCurrentProfileId: (id: string) => void;
  updateOrganization: (updates: Partial<Organization>) => Promise<Organization>;
  updateProfiles: (newProfiles: Profile[]) => void;
  getLeadById: (id: string) => Lead | undefined;
  getDiscussionsByLeadId: (leadId: string) => LeadDiscussion[];
  getActivityByLeadId: (leadId: string) => LeadActivity[];
  getAllRecentActivity: () => LeadActivity[];
  createLead: (input: CreateLeadInput) => Promise<Lead>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<Lead>;
  addDiscussion: (leadId: string, input: AddDiscussionInput) => Promise<LeadDiscussion>;
  deleteDiscussion: (leadId: string, discussionId: string) => Promise<void>;
  editDiscussion: (leadId: string, discussionId: string, newBody: string) => Promise<void>;
  updateFollowUp: (leadId: string, nextFollowUpAt: string | null, note?: string | null) => Promise<void>;
  updateStatus: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  updatePriority: (leadId: string, newPriority: LeadPriority) => Promise<void>;
  assignLead: (leadId: string, ownerId: string | null) => Promise<void>;
  archiveLead: (leadId: string) => Promise<void>;
  restoreLead: (leadId: string) => Promise<void>;
  checkDuplicatePhone: (phone: string, excludeLeadId?: string) => Lead | null;
  resetToDemoData: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization>(EMPTY_ORGANIZATION);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileIdState] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [discussions, setDiscussions] = useState<Record<string, LeadDiscussion[]>>({});
  const [activity, setActivity] = useState<Record<string, LeadActivity[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { profile: authProfile, isAuthenticated: authIsAuthenticated } = useAuth();

  // Business data is loaded from Supabase only. Browser storage is intentionally not used here.
  useEffect(() => {
    let cancelled = false;
    const loadFromSupabase = async () => {
      if (!authProfile?.organization_id) {
        setOrganization(EMPTY_ORGANIZATION);
        setProfiles(authProfile ? [authProfile] : []);
        setLeads([]);
        setDiscussions({});
        setActivity({});
        setIsAuthenticated(authIsAuthenticated);
        setIsLoading(false);
        return;
      }
      const supabase = createBrowserClient();
      if (!supabase) { setIsLoading(false); return; }
      setIsLoading(true);
      const [orgResult, profilesResult, leadsResult, discussionsResult, activityResult] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', authProfile.organization_id).maybeSingle(),
        supabase.from('profiles').select('*').eq('organization_id', authProfile.organization_id).order('created_at', { ascending: true }),
        supabase.from('leads').select('*').eq('organization_id', authProfile.organization_id).order('created_at', { ascending: false }),
        supabase.from('lead_discussions').select('*').eq('organization_id', authProfile.organization_id).order('created_at', { ascending: true }),
        supabase.from('lead_activity').select('*').eq('organization_id', authProfile.organization_id).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (orgResult.data) setOrganization(orgResult.data as Organization);
      if (profilesResult.data) setProfiles(profilesResult.data as Profile[]);
      if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
      if (discussionsResult.data) setDiscussions((discussionsResult.data as LeadDiscussion[]).reduce((all, item) => ({ ...all, [item.lead_id]: [...(all[item.lead_id] || []), item] }), {} as Record<string, LeadDiscussion[]>));
      if (activityResult.data) setActivity((activityResult.data as LeadActivity[]).reduce((all, item) => ({ ...all, [item.lead_id]: [...(all[item.lead_id] || []), item] }), {} as Record<string, LeadActivity[]>));
      setIsAuthenticated(authIsAuthenticated);
      setIsLoading(false);
    };
    void loadFromSupabase().catch((error) => { console.error('Supabase data load failed:', error); setIsLoading(false); });
    return () => { cancelled = true; };
  }, [authProfile, authIsAuthenticated]);

  /*
  useEffect(() => {
    try {
      const storedLeads = localStorage.getItem(STORAGE_KEYS.LEADS);
      const storedDiscussions = localStorage.getItem(STORAGE_KEYS.DISCUSSIONS);
      const storedActivity = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
      const storedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const storedOrg = localStorage.getItem(STORAGE_KEYS.ORGANIZATION);
      const storedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);

      if (storedOrg) {
        try {
          const parsedOrg = JSON.parse(storedOrg);
          if (parsedOrg && parsedOrg.name) {
            setOrganization(parsedOrg);
          }
        } catch {}
      }

      if (storedProfiles) {
        try {
          const parsedProfiles = JSON.parse(storedProfiles);
          if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
            setProfiles(parsedProfiles);
          }
        } catch {}
      }

      // 1. Leads: Load only real user leads and remove all dummy/demo records
      const mockLeadIds = new Set([
        'lead-1', 'lead-2', 'lead-3', 'lead-4', 'lead-5', 'lead-6',
        'lead-7', 'lead-8', 'lead-9', 'lead-10', 'lead-11', 'lead-12'
      ]);

      if (storedLeads) {
        try {
          const parsed = JSON.parse(storedLeads);
          if (Array.isArray(parsed)) {
            const realLeads = parsed.filter((l) => l && l.id && !mockLeadIds.has(l.id));
            setLeads(realLeads);
            localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(realLeads));
          } else {
            setLeads([]);
            localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
          }
        } catch {
          setLeads([]);
          localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
        }
      } else {
        setLeads([]);
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
      }

      // 2. Discussions: Clean empty object (no demo discussions)
      if (storedDiscussions) {
        try {
          const parsed = JSON.parse(storedDiscussions);
          if (parsed && typeof parsed === 'object') {
            const cleanedDiscussions: Record<string, LeadDiscussion[]> = {};
            for (const [key, list] of Object.entries(parsed)) {
              if (!mockLeadIds.has(key) && Array.isArray(list)) {
                cleanedDiscussions[key] = (list as LeadDiscussion[]).filter(
                  (d) => d && d.id && !d.id.startsWith('disc-')
                );
              }
            }
            setDiscussions(cleanedDiscussions);
            localStorage.setItem(STORAGE_KEYS.DISCUSSIONS, JSON.stringify(cleanedDiscussions));
          } else {
            setDiscussions({});
            localStorage.setItem(STORAGE_KEYS.DISCUSSIONS, JSON.stringify({}));
          }
        } catch {
          setDiscussions({});
          localStorage.setItem(STORAGE_KEYS.DISCUSSIONS, JSON.stringify({}));
        }
      } else {
        setDiscussions({});
        localStorage.setItem(STORAGE_KEYS.DISCUSSIONS, JSON.stringify({}));
      }

      // 3. Activity: Clean empty object (no demo activity trails)
      if (storedActivity) {
        try {
          const parsed = JSON.parse(storedActivity);
          if (parsed && typeof parsed === 'object') {
            const cleanedActivity: Record<string, LeadActivity[]> = {};
            for (const [key, list] of Object.entries(parsed)) {
              if (!mockLeadIds.has(key) && Array.isArray(list)) {
                cleanedActivity[key] = (list as LeadActivity[]).filter(
                  (a) => a && a.id && !a.id.startsWith('act-')
                );
              }
            }
            setActivity(cleanedActivity);
            localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(cleanedActivity));
          } else {
            setActivity({});
            localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify({}));
          }
        } catch {
          setActivity({});
          localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify({}));
        }
      } else {
        setActivity({});
        localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify({}));
      }

      const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        if (storedUserId && mockProfiles.some((p) => p.id === storedUserId)) {
          setCurrentProfileIdState(storedUserId);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setLeads([]);
      setDiscussions({});
      setActivity({});
    } finally {
      setIsLoading(false);
    }
  }, []);
  */

  // Sync state helpers to localStorage
  const saveOrganization = (newOrg: Organization) => {
    setOrganization(newOrg);
  };

  const saveProfiles = (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
  };

  const updateOrganization = async (updates: Partial<Organization>): Promise<Organization> => {
    const updated: Organization = {
      ...organization,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveOrganization(updated);
    return updated;
  };

  const updateProfiles = (newProfiles: Profile[]) => {
    saveProfiles(newProfiles);
  };

  const saveLeads = (newLeads: Lead[]) => {
    setLeads(newLeads);
  };

  const saveDiscussions = (newDiscussions: Record<string, LeadDiscussion[]>) => {
    setDiscussions(newDiscussions);
  };

  const saveActivity = (newActivity: Record<string, LeadActivity[]>) => {
    setActivity(newActivity);
  };

  const currentProfile = useMemo(() => {
    if (authProfile) {
      return authProfile;
    }
    return profiles.find((p) => p.id === currentProfileId) || profiles[0];
  }, [authProfile, profiles, currentProfileId]);

  const setCurrentProfileId = (id: string) => {
    setCurrentProfileIdState(id);
  };

  const login = (profileId: string) => {
    setIsAuthenticated(true);
    setCurrentProfileIdState(profileId);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const checkDuplicatePhone = useCallback(
    (phone: string, excludeLeadId?: string): Lead | null => {
      const normalized = normalizePhone(phone);
      if (!normalized || normalized.length < 7) return null;

      const found = leads.find((l) => {
        if (excludeLeadId && l.id === excludeLeadId) return false;
        if (l.archived_at) return false; // duplicate warning is prioritized for active leads
        const lNorm = normalizePhone(l.phone);
        return lNorm.includes(normalized) || normalized.includes(lNorm);
      });

      return found || null;
    },
    [leads]
  );

  const getLeadById = useCallback(
    (id: string): Lead | undefined => {
      const found = leads.find((l) => l.id === id);
      if (!found) return undefined;
      const leadDiscussions = discussions[id] || [];
      const leadActivity = activity[id] || [];
      const owner = profiles.find((p) => p.id === found.owner_id) || null;
      return {
        ...found,
        owner,
        discussions: leadDiscussions,
        activity: leadActivity,
      };
    },
    [leads, discussions, activity, profiles]
  );

  const getDiscussionsByLeadId = useCallback(
    (leadId: string): LeadDiscussion[] => {
      const list = discussions[leadId] || [];
      return list.map((d) => ({
        ...d,
        author: profiles.find((p) => p.id === d.author_id) || null,
      }));
    },
    [discussions, profiles]
  );

  const getActivityByLeadId = useCallback(
    (leadId: string): LeadActivity[] => {
      const list = activity[leadId] || [];
      return list.map((a) => ({
        ...a,
        actor: profiles.find((p) => p.id === a.actor_id) || null,
      }));
    },
    [activity, profiles]
  );

  const getAllRecentActivity = useCallback((): LeadActivity[] => {
    const all = Object.values(activity).flat();
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all.slice(0, 20).map((a) => ({
      ...a,
      actor: profiles.find((p) => p.id === a.actor_id) || null,
    }));
  }, [activity, profiles]);

  const logActivity = (
    leadId: string,
    actionType: LeadActivity['action_type'],
    metadata: LeadActivity['metadata']
  ) => {
    const newLog: LeadActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      organization_id: organization.id,
      lead_id: leadId,
      actor_id: currentProfile.id,
      action_type: actionType,
      metadata,
      created_at: new Date().toISOString(),
    };

    const currentLeadLogs = activity[leadId] || [];
    saveActivity({
      ...activity,
      [leadId]: [newLog, ...currentLeadLogs],
    });
  };

  const createLead = async (input: CreateLeadInput): Promise<Lead> => {
    // Validate with strict schema
    const validated = createLeadSchema.parse(input);
    const nowIso = new Date().toISOString();
    const newLeadId = `lead-${Date.now()}`;

    const newLead: Lead = {
      id: newLeadId,
      organization_id: organization.id,
      customer_name: validated.customer_name.trim(),
      phone: validated.phone.trim(),
      email: validated.email ? validated.email.trim() : null,
      source: validated.source,
      event_type: validated.event_type,
      event_date_status: validated.event_date_status,
      event_date: validated.event_date_status === 'fixed' ? (validated.event_date || null) : null,
      guest_count_status: validated.guest_count_status,
      guest_count: validated.guest_count_status === 'fixed' ? (validated.guest_count ?? null) : null,
      budget: validated.budget ?? null,
      requirement: validated.requirement ? validated.requirement.trim() : null,
      owner_id: validated.owner_id || null,
      status: validated.status || 'New',
      priority: validated.priority || 'Medium',
      next_follow_up_at: validated.next_follow_up_at || null,
      follow_up_note: validated.follow_up_note || null,
      archived_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const updatedLeads = [newLead, ...leads];
    saveLeads(updatedLeads);

    // Initial activity
    const newLogs: LeadActivity[] = [
      {
        id: `act-${Date.now()}-1`,
        organization_id: organization.id,
        lead_id: newLeadId,
        actor_id: currentProfile.id,
        action_type: 'lead_created',
        metadata: {
          details: `Inquiry created for ${newLead.customer_name} (${newLead.event_type}) via ${newLead.source}`,
        },
        created_at: nowIso,
      },
    ];

    // If initial discussion provided
    if (validated.initial_discussion && validated.initial_discussion.trim()) {
      const initialDisc: LeadDiscussion = {
        id: `disc-${Date.now()}`,
        organization_id: organization.id,
        lead_id: newLeadId,
        author_id: currentProfile.id,
        body: validated.initial_discussion.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      };

      saveDiscussions({
        ...discussions,
        [newLeadId]: [initialDisc],
      });

      newLogs.unshift({
        id: `act-${Date.now()}-2`,
        organization_id: organization.id,
        lead_id: newLeadId,
        actor_id: currentProfile.id,
        action_type: 'discussion_added',
        metadata: {
          details: validated.initial_discussion.trim().slice(0, 80) + '...',
        },
        created_at: nowIso,
      });
    }

    saveActivity({
      ...activity,
      [newLeadId]: newLogs,
    });

    return newLead;
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<Lead> => {
    const current = leads.find((l) => l.id === leadId);
    if (!current) throw new Error('Lead not found');

    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.event_date_status === 'not_fixed') {
      sanitizedUpdates.event_date = null;
    }
    if (sanitizedUpdates.guest_count_status === 'not_fixed') {
      sanitizedUpdates.guest_count = null;
    }

    const updated: Lead = {
      ...current,
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    };

    const updatedList = leads.map((l) => (l.id === leadId ? updated : l));
    saveLeads(updatedList);

    logActivity(leadId, 'details_updated', { details: 'Lead banquet inquiry details updated' });
    return updated;
  };

  const addDiscussion = async (leadId: string, input: AddDiscussionInput): Promise<LeadDiscussion> => {
    const nowIso = new Date().toISOString();
    const currentLead = leads.find((l) => l.id === leadId);
    if (!currentLead) throw new Error('Lead not found');

    const newDisc: LeadDiscussion = {
      id: `disc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organization_id: organization.id,
      lead_id: leadId,
      author_id: currentProfile.id,
      body: input.body.trim(),
      created_at: nowIso,
      updated_at: nowIso,
    };

    const currentLeadDiscussions = discussions[leadId] || [];
    saveDiscussions({
      ...discussions,
      [leadId]: [newDisc, ...currentLeadDiscussions],
    });

    // Optionally update follow-up & status in one action
    const updates: Partial<Lead> = { updated_at: nowIso };
    if (input.next_follow_up_at !== undefined) {
      updates.next_follow_up_at = input.next_follow_up_at;
    }
    if (input.follow_up_note !== undefined) {
      updates.follow_up_note = input.follow_up_note;
    }
    if (input.new_status && input.new_status !== currentLead.status) {
      updates.status = input.new_status;
    }

    const updatedList = leads.map((l) => (l.id === leadId ? { ...l, ...updates } : l));
    saveLeads(updatedList);

    logActivity(leadId, 'discussion_added', {
      details: input.body.trim().slice(0, 100) + (input.body.length > 100 ? '...' : ''),
    });

    if (input.new_status && input.new_status !== currentLead.status) {
      logActivity(leadId, 'status_changed', {
        old_value: currentLead.status,
        new_value: input.new_status,
        details: `Status changed from ${currentLead.status} to ${input.new_status}`,
      });
    }

    if (input.next_follow_up_at) {
      logActivity(leadId, 'follow_up_updated', {
        details: `Follow-up set for ${new Date(input.next_follow_up_at).toLocaleString()}`,
      });
    }

    return newDisc;
  };

  const deleteDiscussion = async (leadId: string, discussionId: string): Promise<void> => {
    const list = discussions[leadId] || [];
    const updated = list.filter((d) => d.id !== discussionId);
    saveDiscussions({
      ...discussions,
      [leadId]: updated,
    });
  };

  const editDiscussion = async (leadId: string, discussionId: string, newBody: string): Promise<void> => {
    const list = discussions[leadId] || [];
    const updated = list.map((d) =>
      d.id === discussionId ? { ...d, body: newBody.trim(), updated_at: new Date().toISOString() } : d
    );
    saveDiscussions({
      ...discussions,
      [leadId]: updated,
    });
  };

  const updateFollowUp = async (
    leadId: string,
    nextFollowUpAt: string | null,
    note?: string | null
  ): Promise<void> => {
    const current = leads.find((l) => l.id === leadId);
    if (!current) return;

    const updatedList = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            next_follow_up_at: nextFollowUpAt,
            follow_up_note: note !== undefined ? note : l.follow_up_note,
            updated_at: new Date().toISOString(),
          }
        : l
    );
    saveLeads(updatedList);

    logActivity(leadId, 'follow_up_updated', {
      details: nextFollowUpAt
        ? `Next follow-up scheduled for ${new Date(nextFollowUpAt).toLocaleString()}`
        : 'Follow-up cleared',
    });
  };

  const updateStatus = async (leadId: string, newStatus: LeadStatus): Promise<void> => {
    const current = leads.find((l) => l.id === leadId);
    if (!current || current.status === newStatus) return;

    const oldStatus = current.status;
    const updatedList = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            status: newStatus,
            updated_at: new Date().toISOString(),
          }
        : l
    );
    saveLeads(updatedList);

    logActivity(leadId, 'status_changed', {
      old_value: oldStatus,
      new_value: newStatus,
      details: `Status updated to ${newStatus}`,
    });
  };

  const updatePriority = async (leadId: string, newPriority: LeadPriority): Promise<void> => {
    const current = leads.find((l) => l.id === leadId);
    if (!current || current.priority === newPriority) return;

    const oldPriority = current.priority;
    const updatedList = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            priority: newPriority,
            updated_at: new Date().toISOString(),
          }
        : l
    );
    saveLeads(updatedList);

    logActivity(leadId, 'priority_changed', {
      old_value: oldPriority,
      new_value: newPriority,
      details: `Priority adjusted from ${oldPriority} to ${newPriority}`,
    });
  };

  const assignLead = async (leadId: string, ownerId: string | null): Promise<void> => {
    const current = leads.find((l) => l.id === leadId);
    if (!current || current.owner_id === ownerId || !ownerId) return;

    // Call backend API to enforce security and update DB atomically
    const res = await fetch(`/api/leads/${leadId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: ownerId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to assign lead');
    }

    const ownerName = profiles.find((p) => p.id === ownerId)?.name || 'Unassigned';
    const updatedList = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            owner_id: ownerId,
            updated_at: new Date().toISOString(),
          }
        : l
    );
    saveLeads(updatedList);

    // Note: We also log it here for local optimisic UI, though the backend also logged it
    logActivity(leadId, 'lead_reassigned', {
      assigned_from: current.owner_id,
      assigned_to: ownerId,
      details: `Lead assigned to ${ownerName}`,
    });
  };

  const archiveLead = async (leadId: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updatedList = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            archived_at: nowIso,
            updated_at: nowIso,
          }
        : l
    );
    saveLeads(updatedList);

    logActivity(leadId, 'archived', { details: 'Lead archived' });
  };

  const restoreLead = async (leadId: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updatedList = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            archived_at: null,
            updated_at: nowIso,
          }
        : l
    );
    saveLeads(updatedList);

    logActivity(leadId, 'restored', { details: 'Lead restored from archive' });
  };

  const resetToDemoData = () => {
    setLeads([]);
    setDiscussions({});
    setActivity({});
  };

  // Calculate high-precision dashboard metrics
  const metrics = useMemo<DashboardMetrics>(() => {
    const activeLeads = leads.filter((l) => !l.archived_at);
    const newLeads = activeLeads.filter((l) => l.status === 'New').length;
    const activeInterested = activeLeads.filter((l) => l.status === 'Interested' || l.status === 'Contacted').length;
    const converted = leads.filter((l) => l.status === 'Converted').length;
    const totalActive = activeLeads.length;

    let dueToday = 0;
    let overdue = 0;
    let leadsWithFollowUp = 0;

    activeLeads.forEach((l) => {
      if (l.next_follow_up_at) {
        leadsWithFollowUp++;
        const targetDate = new Date(l.next_follow_up_at);
        if (isToday(targetDate)) {
          dueToday++;
        } else if (isPast(targetDate)) {
          overdue++;
        }
      }
    });

    const totalHistorical = leads.length;
    const conversionRate = totalHistorical > 0 ? Math.round((converted / totalHistorical) * 100) : 0;
    const followUpAdherenceRate = totalActive > 0 ? Math.round((leadsWithFollowUp / totalActive) * 100) : 0;

    return {
      newLeadsCount: newLeads,
      dueTodayFollowUpsCount: dueToday,
      overdueFollowUpsCount: overdue,
      activeInterestedCount: activeInterested,
      convertedCount: converted,
      totalActiveCount: totalActive,
      conversionRate,
      followUpAdherenceRate,
    };
  }, [leads]);

  const contextValue = useMemo(() => ({
    organization,
    currentProfile,
    profiles,
    leads,
    metrics,
    isAuthenticated,
    login,
    logout,
    setCurrentProfileId,
    updateOrganization,
    updateProfiles,
    getLeadById,
    getDiscussionsByLeadId,
    getActivityByLeadId,
    getAllRecentActivity,
    createLead,
    updateLead,
    addDiscussion,
    deleteDiscussion,
    editDiscussion,
    updateFollowUp,
    updateStatus,
    updatePriority,
    assignLead,
    archiveLead,
    restoreLead,
    checkDuplicatePhone,
    resetToDemoData,
    isLoading,
  }), [
    organization,
    currentProfile,
    profiles,
    leads,
    metrics,
    isAuthenticated,
    login,
    logout,
    setCurrentProfileId,
    updateOrganization,
    updateProfiles,
    getLeadById,
    getDiscussionsByLeadId,
    getActivityByLeadId,
    getAllRecentActivity,
    createLead,
    updateLead,
    addDiscussion,
    deleteDiscussion,
    editDiscussion,
    updateFollowUp,
    updateStatus,
    updatePriority,
    assignLead,
    archiveLead,
    restoreLead,
    checkDuplicatePhone,
    resetToDemoData,
    isLoading,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
