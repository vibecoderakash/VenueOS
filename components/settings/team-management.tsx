'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  X,
  Pencil,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lock,
  RefreshCw,
  Power,
  ShieldAlert,
  UserCheck,
  Building2,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createBrowserClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { StaffSelfProfile } from './staff-self-profile';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
  admin: 'Manager',
  sales: 'Staff',
  front_desk: 'Staff',
};

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  owner: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.55)' },
  manager: { bg: 'rgba(59, 130, 246, 0.2)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.55)' },
  staff: { bg: 'rgba(16, 185, 129, 0.2)', color: '#059669', border: 'rgba(16, 185, 129, 0.55)' },
  admin: { bg: 'rgba(59, 130, 246, 0.2)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.55)' },
  sales: { bg: 'rgba(16, 185, 129, 0.2)', color: '#059669', border: 'rgba(16, 185, 129, 0.55)' },
  front_desk: { bg: 'rgba(16, 185, 129, 0.2)', color: '#059669', border: 'rgba(16, 185, 129, 0.55)' },
};

export function TeamManagement() {
  const { profile: currentUser, isOwner, isManager, isStaff, isLoading: isAuthLoading } = useAuth();

  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add Staff Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<'invite' | 'password'>('invite');
  const [createdInviteLink, setCreatedInviteLink] = useState<{ email: string; link: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'manager' | 'staff'>('staff');
  const [newPassword, setNewPassword] = useState('');

  // Edit Staff Modal
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'manager' | 'staff'>('staff');

  // Delete Staff Modal
  const [memberToDelete, setMemberToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper for authenticated headers
  // Refresh before protected requests so a tab that has been open for a while
  // does not send an expired access token to the staff API.
  const getAuthHeaders = async (forceRefresh = true) => {
    const supabase = createBrowserClient();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (supabase) {
      let session = (await supabase.auth.getSession()).data.session;
      if (forceRefresh) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session || session;
      }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
    return headers;
  };

  const loadMembersFromBrowserSession = async (): Promise<boolean> => {
    const supabase = createBrowserClient();
    if (!supabase) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) return false;

    setMembers(
      (data || []).map((member) => ({
        id: member.id,
        name: member.name || member.full_name || 'Staff User',
        full_name: member.full_name || member.name || 'Staff User',
        email: member.email || '',
        phone: member.phone || null,
        role: member.role || 'staff',
        active: member.is_active !== undefined ? Boolean(member.is_active) : Boolean(member.active),
        is_active: member.is_active !== undefined ? Boolean(member.is_active) : Boolean(member.active),
        created_at: member.created_at || new Date().toISOString(),
        updated_at: member.updated_at || new Date().toISOString(),
      }))
    );
    return true;
  };

  // Fetch team members from server API
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let res = await fetch('/api/team/list', {
        headers: await getAuthHeaders(),
        credentials: 'include',
      });

      if (res.status === 401) {
        res = await fetch('/api/team/list', {
          headers: await getAuthHeaders(true),
          credentials: 'include',
        });

        if (res.status === 401 && (await loadMembersFromBrowserSession())) {
          return;
        }
      }

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to load team members.');
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Fetch members error:', err);
      setErrorMsg('Failed to load team list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || !currentUser?.id) return;
    fetchMembers();
  }, [fetchMembers, isAuthLoading, currentUser?.id]);

  // Handle Add Staff / Send Invite
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim() || !newEmail.trim()) {
      setAddError('Name and Email are required.');
      return;
    }

    setIsAdding(true);
    try {
      const headers = await getAuthHeaders();
      const endpoint = inviteMode === 'invite' ? '/api/team/invite' : '/api/team/create-staff';
      const payload = {
        full_name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim() || null,
        role: newRole,
        ...(inviteMode === 'password' ? { password: newPassword.trim() || undefined } : {}),
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAddError(data.error || 'Failed to process staff request.');
        setIsAdding(false);
        return;
      }

      if (data.inviteLink) {
        setCreatedInviteLink({ email: newEmail.trim(), link: data.inviteLink });
        setHasCopied(false);
      } else {
        showToast(data.message || 'Staff member added successfully!', 'success');
      }

      setIsAddOpen(false);
      setAddError(null);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewRole('staff');
      fetchMembers();
    } catch (err) {
      setAddError('Network error while adding staff member. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Edit Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editingMember) return;

    setIsUpdating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/team/update-staff', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          memberId: editingMember.id,
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          role: isOwner ? editRole : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setEditError(data.error || 'Failed to update member.');
        setIsUpdating(false);
        return;
      }

      showToast('Profile updated successfully.', 'success');
      setEditingMember(null);
      setEditError(null);
      fetchMembers();
    } catch {
      setEditError('Network error while updating member.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (member: Profile) => {
    if (member.role === 'owner') {
      showToast('The Owner account cannot be deactivated.', 'error');
      return;
    }

    if (isManager && member.role === 'manager') {
      showToast('Managers cannot deactivate other Managers.', 'error');
      return;
    }

    const nextStatus = !member.is_active;
    const confirmMsg = nextStatus
      ? `Activate account for ${member.full_name || member.name}?`
      : `Deactivate account for ${member.full_name || member.name}? They will not be able to log in until reactivated.`;

    if (!confirm(confirmMsg)) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/team/update-staff', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          memberId: member.id,
          is_active: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to change member status.', 'error');
        return;
      }

      showToast(`${member.full_name || member.name} ${nextStatus ? 'activated' : 'deactivated'}.`, 'success');
      fetchMembers();
    } catch {
      showToast('Failed to update status.', 'error');
    }
  };

  // Handle Delete Staff
  const confirmDeleteStaff = async () => {
    if (!memberToDelete) return;
    setDeleteError(null);

    if (memberToDelete.role === 'owner') {
      setDeleteError('The Owner account cannot be deleted.');
      return;
    }
    if (memberToDelete.id === currentUser?.id) {
      setDeleteError('You cannot delete your own account.');
      return;
    }

    setIsDeleting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/team/delete-staff', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          memberId: memberToDelete.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setDeleteError(data.error || 'Failed to delete member.');
        setIsDeleting(false);
        return;
      }

      showToast(data.message || `${memberToDelete.full_name || memberToDelete.name} has been deleted.`, 'success');
      setMemberToDelete(null);
      setDeleteError(null);
      fetchMembers();
    } catch {
      setDeleteError('Network error while deleting member.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Auth Loading Skeleton
  if (isAuthLoading) {
    return (
      <div className="p-12 text-center text-foreground-muted">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs">Verifying team permissions...</span>
      </div>
    );
  }

  // Staff permission guard (only block when user is confirmed NOT owner and NOT manager)
  if (currentUser && !isOwner && !isManager) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div
          className="rounded-2xl p-5 border flex items-start gap-4"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-foreground-secondary mt-1 leading-relaxed">
              Team management is reserved for Venue Owners and General Managers. You can still update your own profile below.
            </p>
          </div>
        </div>
        <StaffSelfProfile />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm shadow-2xl animate-slideUp border ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40'
              : 'bg-slate-900 border-slate-700/80 text-white shadow-black/40'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            <span>Team & Staff Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
            Add managers and staff, manage role permissions, and control account status for your venue.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMembers}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--foreground-muted)',
            }}
            title="Refresh team"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {(isOwner || isManager) && (
            <button
              onClick={() => {
                setNewRole('staff');
                setAddError(null);
                setIsAddOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white shadow-md transition-all cursor-pointer hover:opacity-95"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Team Table Card */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-wider font-semibold"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground-muted)',
                }}
              >
                <th className="py-3.5 px-4 sm:px-6">Member</th>
                <th className="py-3.5 px-4 sm:px-6">Role</th>
                <th className="py-3.5 px-4 sm:px-6">Phone</th>
                <th className="py-3.5 px-4 sm:px-6">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-foreground-muted">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading team members...</span>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-foreground-muted">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-foreground">No team members found</p>
                    <p className="text-xs mt-1">Click &quot;+ Add Staff&quot; to invite your first banquet team member.</p>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.staff;
                  const canEdit = isOwner || (isManager && member.role === 'staff');
                  const canDelete = isOwner && member.role !== 'owner';

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Member Name & Email */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                            style={{
                              backgroundColor: roleStyle.bg,
                              color: roleStyle.color,
                            }}
                          >
                            {(member.full_name || member.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate flex items-center gap-2">
                              <span>{member.full_name || member.name}</span>
                              {member.id === currentUser?.id && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-foreground-muted truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span>{member.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4 sm:px-6">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold border"
                          style={{
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            borderColor: roleStyle.border,
                          }}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{ROLE_LABELS[member.role] || member.role}</span>
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 sm:px-6 text-foreground-secondary">
                        {member.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-foreground-muted" />
                            <span>{member.phone}</span>
                          </div>
                        ) : (
                          <span className="text-foreground-muted italic text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 sm:px-6">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingMember(member);
                                setEditError(null);
                                setEditName(member.full_name || member.name || '');
                                setEditPhone(member.phone || '');
                                setEditRole((member.role as 'manager' | 'staff') || 'staff');
                              }}
                              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                              title="Edit member details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {canEdit && member.role !== 'owner' && (
                            <button
                              onClick={() => handleToggleActive(member)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                member.is_active
                                  ? 'hover:bg-rose-50 text-foreground-muted hover:text-rose-600 dark:hover:bg-rose-950/30'
                                  : 'hover:bg-emerald-50 text-foreground-muted hover:text-emerald-600 dark:hover:bg-emerald-950/30'
                              }`}
                              title={member.is_active ? 'Deactivate account' : 'Activate account'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => {
                                setMemberToDelete(member);
                                setDeleteError(null);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-foreground-muted hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title={`Delete ${member.full_name || member.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: Add Staff / Manager
          ========================================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 sm:p-7 space-y-5"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Add New Staff or Manager</h3>
                  <p className="text-xs text-foreground-muted">Grant authorized access to this venue</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setAddError(null);
                }}
                className="p-1 rounded-lg text-foreground-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner inside Modal */}
            {addError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{addError}</span>
              </div>
            )}

            {/* Mode Switcher: Email Invitation vs Direct Account Creation */}
            <div className="flex rounded-xl p-1 bg-surface-secondary border" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setInviteMode('invite')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inviteMode === 'invite'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Send Email Invite
              </button>
              <button
                type="button"
                onClick={() => setInviteMode('password')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inviteMode === 'password'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Direct Creation (Password)
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-foreground-secondary mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground-secondary mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  placeholder="staff@grandimperial.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none ${
                    addError && addError.toLowerCase().includes('email')
                      ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20'
                      : 'focus:border-primary'
                  }`}
                  style={!addError || !addError.toLowerCase().includes('email') ? { borderColor: 'var(--border)' } : undefined}
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground-secondary mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-foreground-secondary mb-1">
                  Assigned Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    setNewRole(e.target.value as 'manager' | 'staff');
                    if (addError) setAddError(null);
                  }}
                  disabled={!isOwner}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <option value="staff">Staff (Lead conversations, follow-ups)</option>
                  {isOwner && <option value="manager">Manager (Manage staff & team activity)</option>}
                </select>
                {!isOwner && (
                  <p className="text-[11px] text-foreground-muted mt-1">
                    Only the Venue Owner can assign the Manager role.
                  </p>
                )}
              </div>

              {/* Initial Password (shown only in direct creation mode) */}
              {inviteMode === 'password' && (
                <div>
                  <label className="block font-semibold text-foreground-secondary mb-1">
                    Initial Password <span className="text-foreground-muted font-normal">(Optional — auto-generated if left blank)</span>
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (addError) setAddError(null);
                    }}
                    placeholder="e.g. Staff@GrandImperial2026!"
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setAddError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-60"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {isAdding
                    ? inviteMode === 'invite' ? 'Sending Invite...' : 'Creating Account...'
                    : inviteMode === 'invite' ? 'Send Invitation' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Edit Member
          ========================================================================= */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 sm:p-7 space-y-5"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Team Member</h3>
                  <p className="text-xs text-foreground-muted">{editingMember.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingMember(null);
                  setEditError(null);
                }}
                className="p-1 rounded-lg text-foreground-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner inside Edit Modal */}
            {editError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-foreground-secondary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground-secondary mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              {isOwner && editingMember.role !== 'owner' && (
                <div>
                  <label className="block font-semibold text-foreground-secondary mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      setEditRole(e.target.value as 'manager' | 'staff');
                      if (editError) setEditError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary cursor-pointer"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    setEditError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-60"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Delete Team Member Confirmation
          ========================================================================= */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 sm:p-7 space-y-5"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Delete Team Member
                </h3>
                <p className="text-xs text-foreground-muted">
                  Permanent removal from Venue OS
                </p>
              </div>
            </div>

            {/* Error Banner inside Delete Modal */}
            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{deleteError}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 text-xs sm:text-sm text-foreground-secondary space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-foreground">{memberToDelete.full_name || memberToDelete.name}</strong>{' '}
                (<span className="font-mono text-xs">{memberToDelete.email}</span>)?
              </p>
              <p className="text-rose-600 dark:text-rose-400 text-xs font-medium leading-relaxed">
                • Their access to Venue OS will be immediately revoked.<br />
                • Their account credentials and profile will be permanently deleted.<br />
                • Any banquet leads assigned to them will be unassigned.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMemberToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStaff}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Invitation Created & Direct Link Ready
          ========================================================================= */}
      {createdInviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 sm:p-7 space-y-5"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Invitation Link Ready!
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Share this link directly or let Supabase deliver the email
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedInviteLink(null)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-surface-secondary border text-xs sm:text-sm text-foreground-secondary space-y-2" style={{ borderColor: 'var(--border)' }}>
              <p>
                An invite has been prepared for <strong className="text-foreground">{createdInviteLink.email}</strong>.
              </p>
              <p className="text-xs text-foreground-muted leading-relaxed">
                If the email is delayed or your SMTP is rate-limited, you can copy this one-time link and send it directly to the staff member via WhatsApp, Slack, or SMS:
              </p>
            </div>

            {/* Link Box with Copy Button */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-background" style={{ borderColor: 'var(--border)' }}>
                <input
                  type="text"
                  readOnly
                  value={createdInviteLink.link}
                  className="w-full bg-transparent text-xs font-mono text-foreground focus:outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteLink.link);
                    setHasCopied(true);
                    setTimeout(() => setHasCopied(false), 2500);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                    hasCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCreatedInviteLink(null)}
                className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
