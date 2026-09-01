'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Building2,
  Database,
  Check,
  Save,
  Sun,
  Moon,
  Monitor,
  Palette,
  CheckCircle2,
  Pencil,
  X,
  ArrowRight,
  AlertTriangle,
  Shield,
  LogOut,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { useTheme, ThemeMode } from '@/lib/theme-context';
import { TeamManagement } from '@/components/settings/team-management';
import { HealthDiagnostics } from '@/components/settings/health-diagnostics';

// ============================================================
// Reusable form field style
// ============================================================

const inputClass = 'w-full px-3 py-2 rounded-[6px] text-[13px] transition-colors focus:outline-none';

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
};

const readOnlyInputStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  color: 'var(--foreground)',
  cursor: 'default',
};

// ============================================================
// Types for the change confirmation
// ============================================================

interface FieldChange {
  label: string;
  oldValue: string;
  newValue: string;
}

// ============================================================
// Business Profile Component (extracted)
// ============================================================

function compressImageFile(file: File, maxSize: number = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.88);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function BusinessProfile() {
  const { organization, updateOrganization } = useData();
  const { profile: currentAuthProfile, isOwner } = useAuth();

  // Current saved values (source of truth from DataContext & Owner details)
  const savedValues = React.useMemo(() => ({
    name: organization.name || 'No venue connected',
    phone: organization.phone || currentAuthProfile?.phone || '',
    email: organization.email || currentAuthProfile?.email || '',
    address: organization.address || '',
    city: organization.city || '',
    currency: organization.currency || '—',
    logo_url: organization.logo_url || '',
  }), [organization, currentAuthProfile]);

  // Draft values (while editing)
  const [draft, setDraft] = useState({ ...savedValues });

  useEffect(() => {
    setDraft({ ...savedValues });
  }, [savedValues]);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fieldLabels: Record<string, string> = {
    name: 'Business Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Venue Address',
    city: 'City / Region',
    currency: 'Currency',
    logo_url: 'Organization Logo',
  };

  const currencyLabels: Record<string, string> = {
    INR: 'INR — Indian Rupee (₹)',
    USD: 'USD — US Dollar ($)',
    AED: 'AED — UAE Dirham (د.إ)',
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image size must be less than 2MB.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Please upload a valid image (PNG, JPG, WebP, or SVG).');
      return;
    }

    try {
      setLogoUploading(true);
      const dataUrl = await compressImageFile(file);
      updateDraft('logo_url', dataUrl);
      if (!isEditing && isOwner) {
        await updateOrganization({ logo_url: dataUrl });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch {
      setLogoError('Failed to process image. Please try another file.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    updateDraft('logo_url', '');
    if (!isEditing && isOwner) {
      await updateOrganization({ logo_url: '' });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleEdit = () => {
    setDraft({ ...savedValues });
    setIsEditing(true);
    setIsSaved(false);
  };

  const handleCancel = () => {
    setDraft({ ...savedValues });
    setIsEditing(false);
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();

    // Compute changes
    const changes: FieldChange[] = [];
    for (const key of Object.keys(savedValues) as (keyof typeof savedValues)[]) {
      if (draft[key] !== savedValues[key]) {
        const oldDisplay = key === 'currency' ? (currencyLabels[savedValues[key]] || savedValues[key]) : (savedValues[key] || '—');
        const newDisplay = key === 'currency' ? (currencyLabels[draft[key]] || draft[key]) : (draft[key] || '—');
        changes.push({
          label: fieldLabels[key] || key,
          oldValue: oldDisplay,
          newValue: newDisplay,
        });
      }
    }

    if (changes.length === 0) {
      // No changes, just exit edit mode
      setIsEditing(false);
      return;
    }

    setPendingChanges(changes);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!isOwner) return;
    // Apply changes into persistent DataContext and LocalStorage
    await updateOrganization({
      name: draft.name,
      phone: draft.phone,
      email: draft.email,
      address: draft.address,
      city: draft.city,
      currency: draft.currency,
      logo_url: draft.logo_url,
    });
    setShowConfirmation(false);
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const updateDraft = (field: keyof typeof draft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const fields = [
    { key: 'name' as const, label: 'Business Name', type: 'text', required: true },
    { key: 'phone' as const, label: 'Phone', type: 'tel' },
    { key: 'email' as const, label: 'Email', type: 'email' },
    { key: 'city' as const, label: 'City / Region', type: 'text' },
    { key: 'address' as const, label: 'Venue Address', type: 'text' },
  ];

  return (
    <>
      <div
        className="rounded-[12px] p-5 space-y-4 transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                color: 'var(--primary)',
              }}
            >
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
                Business Profile
              </h2>
              <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
                {isEditing ? 'Edit your venue details below' : 'Your registered business information'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSaved && (
              <span
                className="text-[12px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ 
                  color: 'var(--success)', 
                  backgroundColor: 'var(--success-soft)',
                  border: '1px solid var(--success-border)',
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Updated
              </span>
            )}
            {!isEditing && isOwner && (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-soft)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--foreground)';
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {!isEditing && !isOwner && (
              <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
                View only
              </span>
            )}
          </div>
        </div>

        {/* Venue Profile Picture / Logo Section */}
        <div
          className="p-4 rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
          style={{
            backgroundColor: 'var(--surface-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs border-2 border-indigo-500/30 bg-surface">
              {draft.logo_url ? (
                <img
                  src={draft.logo_url}
                  alt={draft.name || 'Venue Logo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-white font-extrabold text-lg shadow-inner"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {(draft.name || 'V').charAt(0).toUpperCase()}
                </div>
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>
                  Organization Profile Picture
                </h3>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--primary)',
                  }}
                >
                  Venue Brand
                </span>
              </div>
              <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                Displayed on your sidebar, mobile headers, and client records. (PNG, JPG, WebP, Max 2MB)
              </p>
              {logoError && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1">
                  {logoError}
                </p>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleLogoFileChange}
                className="hidden"
                id="venue-logo-upload"
              />
              <label
                htmlFor="venue-logo-upload"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all cursor-pointer shadow-xs hover:opacity-90"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <Camera className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                <span>{draft.logo_url ? 'Change Photo' : 'Upload Photo'}</span>
              </label>

              {draft.logo_url && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  title="Remove Logo"
                  className="p-1.5 rounded-[8px] transition-colors cursor-pointer text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSaveClick} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map(({ key, label, type, required }) => (
              <div key={key}>
                <label
                  className="block text-[12px] font-medium mb-1"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {label}
                </label>
                {isEditing ? (
                  <input
                    type={type}
                    required={required}
                    value={draft[key]}
                    onChange={(e) => updateDraft(key, e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                ) : (
                  <div
                    className="px-3 py-2 rounded-[6px] text-[13px]"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      color: savedValues[key] ? 'var(--foreground)' : 'var(--foreground-muted)',
                      minHeight: '37px',
                    }}
                  >
                    {savedValues[key] || '—'}
                  </div>
                )}
              </div>
            ))}

            <div>
              <label
                className="block text-[12px] font-medium mb-1"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Currency
              </label>
              {isEditing ? (
                <select
                  value={draft.currency}
                  onChange={(e) => updateDraft('currency', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="AED">AED — UAE Dirham (د.إ)</option>
                </select>
              ) : (
                <div
                  className="px-3 py-2 rounded-[6px] text-[13px]"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    minHeight: '37px',
                  }}
                >
                  {currencyLabels[savedValues.currency] || savedValues.currency}
                </div>
              )}
            </div>
          </div>

          {/* Edit mode action buttons */}
          {isEditing && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--danger-soft)';
                  e.currentTarget.style.borderColor = 'var(--danger-border)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--foreground-secondary)';
                }}
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-fg)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelConfirmation();
          }}
        >
          <div
            className="w-full max-w-[480px] rounded-[12px] overflow-hidden shadow-xl"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              animation: 'confirmSlideIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--warning-soft)',
                  color: 'var(--warning)',
                }}
              >
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
                  Confirm Changes
                </h3>
                <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
                  Review the following updates before saving
                </p>
              </div>
            </div>

            {/* Changes List */}
            <div className="px-5 py-4 space-y-2.5 max-h-[50vh] overflow-y-auto">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--foreground-muted)' }}
              >
                {pendingChanges.length} field{pendingChanges.length > 1 ? 's' : ''} will be updated
              </p>
              {pendingChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="rounded-[8px] p-3 space-y-1.5"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--primary)' }}
                  >
                    {change.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--foreground-muted)' }}>
                        Current
                      </p>
                      <p
                        className="text-[13px] font-medium truncate px-2 py-1 rounded-[4px]"
                        style={{
                          color: 'var(--danger)',
                          backgroundColor: 'var(--danger-soft)',
                          border: '1px solid var(--danger-border)',
                          textDecoration: 'line-through',
                        }}
                      >
                        {change.oldValue}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 flex-shrink-0 mt-4"
                      style={{ color: 'var(--foreground-muted)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--foreground-muted)' }}>
                        New
                      </p>
                      <p
                        className="text-[13px] font-semibold truncate px-2 py-1 rounded-[4px]"
                        style={{
                          color: 'var(--success)',
                          backgroundColor: 'var(--success-soft)',
                          border: '1px solid var(--success-border)',
                        }}
                      >
                        {change.newValue}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div
              className="px-5 py-3.5 flex items-center justify-end gap-2"
              style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-secondary)' }}
            >
              <button
                type="button"
                onClick={handleCancelConfirmation}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--danger-soft)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--foreground-secondary)';
                }}
              >
                <X className="w-3.5 h-3.5" />
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-5 py-2 rounded-[8px] text-[13px] font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-fg)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal animation keyframes */}
      <style jsx>{`
        @keyframes confirmSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

// ============================================================
// Settings Page
// ============================================================

export default function SettingsPage() {
  const { organization } = useData();
  const { theme, setTheme } = useTheme();

  // Theme options with accurate color swatches
  const themeOptions: {
    value: ThemeMode;
    label: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
    preview: React.ReactNode;
  }[] = [
    {
      value: 'light',
      label: 'Light Mode',
      description: 'Soft off-white workspace (#F5F6F8)',
      Icon: Sun,
      preview: (
        <div
          className="h-14 w-full rounded-[6px] border overflow-hidden flex gap-1.5 p-1.5"
          style={{ backgroundColor: '#F5F6F8', borderColor: '#DDE1E6' }}
        >
          <div className="w-1/4 h-full rounded" style={{ backgroundColor: '#EEF0F3', border: '1px solid #DDE1E6' }}>
            <div className="w-full h-1 rounded-sm m-1" style={{ backgroundColor: '#4F46E5', width: '60%' }} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="w-full h-2.5 rounded" style={{ backgroundColor: '#FAFAF9', border: '1px solid #DDE1E6' }} />
            <div className="grid grid-cols-2 gap-1 flex-1">
              <div className="rounded" style={{ backgroundColor: '#FAFAF9', border: '1px solid #DDE1E6' }} />
              <div className="rounded" style={{ backgroundColor: '#FAFAF9', border: '1px solid #DDE1E6' }} />
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'dark',
      label: 'Dark Mode',
      description: 'Deep navy surface (#0B1120)',
      Icon: Moon,
      preview: (
        <div
          className="h-14 w-full rounded-[6px] border overflow-hidden flex gap-1.5 p-1.5"
          style={{ backgroundColor: '#0B1120', borderColor: '#334155' }}
        >
          <div className="w-1/4 h-full rounded" style={{ backgroundColor: '#111827', border: '1px solid #334155' }}>
            <div className="w-full h-1 rounded-sm m-1" style={{ backgroundColor: '#818CF8', width: '60%' }} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="w-full h-2.5 rounded" style={{ backgroundColor: '#111827', border: '1px solid #334155' }} />
            <div className="grid grid-cols-2 gap-1 flex-1">
              <div className="rounded" style={{ backgroundColor: '#111827', border: '1px solid #334155' }} />
              <div className="rounded" style={{ backgroundColor: '#111827', border: '1px solid #334155' }} />
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'system',
      label: 'System Default',
      description: 'Follows operating system',
      Icon: Monitor,
      preview: (
        <div className="h-14 w-full rounded-[6px] border overflow-hidden flex" style={{ borderColor: 'var(--border)' }}>
          {/* Left half = light */}
          <div className="flex-1 flex gap-1 p-1.5" style={{ backgroundColor: '#F5F6F8' }}>
            <div className="w-1/3 h-full rounded-sm" style={{ backgroundColor: '#EEF0F3' }} />
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-2 rounded-sm" style={{ backgroundColor: '#FAFAF9', border: '1px solid #DDE1E6' }} />
              <div className="flex-1 rounded-sm" style={{ backgroundColor: '#FAFAF9', border: '1px solid #DDE1E6' }} />
            </div>
          </div>
          {/* Divider */}
          <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
          {/* Right half = dark */}
          <div className="flex-1 flex gap-1 p-1.5" style={{ backgroundColor: '#0B1120' }}>
            <div className="w-1/3 h-full rounded-sm" style={{ backgroundColor: '#111827' }} />
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-2 rounded-sm" style={{ backgroundColor: '#111827', border: '1px solid #334155' }} />
              <div className="flex-1 rounded-sm" style={{ backgroundColor: '#111827', border: '1px solid #334155' }} />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-[18px] font-bold" style={{ color: 'var(--foreground)' }}>
          Settings
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
          Appearance, business profile, and team management.
        </p>
      </div>

      {/* 1. Theme & Appearance */}
      <div
        className="rounded-[12px] p-5 space-y-4 transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
            }}
          >
            <Palette className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
              Theme & Appearance
            </h2>
            <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              Choose your preferred appearance. System follows your operating system theme.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, description, Icon, preview }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className="text-left rounded-[8px] p-3 transition-all"
                style={{
                  border: isSelected
                    ? `2px solid var(--primary)`
                    : `1px solid var(--border)`,
                  backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--surface-secondary)',
                  padding: isSelected ? '11px' : '12px',
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span style={{ color: isSelected ? 'var(--primary)' : 'var(--foreground-muted)' }}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p
                        className="text-[13px] font-semibold leading-none"
                        style={{ color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}
                      >
                        {label}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                        {description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </div>
                {preview}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Business Profile */}
      <BusinessProfile />

      {/* 3. Team Management */}
      <TeamManagement />

      {/* 4. Multi-Tenant Info */}
      <div
        className="rounded-[12px] p-5 space-y-2 transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{
              backgroundColor: 'var(--success-soft)',
              color: 'var(--success)',
            }}
          >
            <Database className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
            Data Isolation
          </h2>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--foreground-secondary)' }}>
          All your leads, discussions, and audit records are isolated by your organization ID:{' '}
          <code
            className="font-mono text-[12px] px-1.5 py-0.5 rounded-[4px]"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              color: 'var(--primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {organization.id}
          </code>
        </p>
      </div>

      {/* 5. System & Health Diagnostics (Owner only) */}
      <HealthDiagnostics />

      {/* 6. Account & Session Management */}
      <AccountSessionSection />
    </div>
  );
}

function AccountSessionSection() {
  const { profile, signOut, isOwner } = useAuth();
  const { organization } = useData();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation.trim() !== organization.name.trim()) {
      setDeleteError('Type the organization name exactly to continue.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch('/api/organization/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation, organizationName: organization.name }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Unable to delete organization.');
      }
      await signOut();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete organization.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="rounded-[12px] p-5 space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-rose-500 bg-rose-500/10"
          >
            <LogOut className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">
              Account & Session
            </h2>
            <p className="text-[12px] text-foreground-muted">
              Signed in as {profile?.email || 'authenticated user'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-60"
        >
          <LogOut className={`w-4 h-4 ${isSigningOut ? 'animate-spin' : ''}`} />
          <span>{isSigningOut ? 'Signing out...' : 'Sign Out of Venue OS'}</span>
        </button>
      </div>

      {isOwner && (
        <div
          className="rounded-[12px] p-5 space-y-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(244, 63, 94, 0.35)' }}
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-rose-500">Danger Zone</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                Permanently delete this organization and all of its leads, discussions, activity, staff profiles, and settings.
              </p>
            </div>
          </div>

          {!showDeleteConfirmation ? (
            <button
              type="button"
              onClick={() => { setShowDeleteConfirmation(true); setDeleteError(''); }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors"
            >
              Delete Organization Permanently
            </button>
          ) : (
            <div className="space-y-3 rounded-lg p-3 bg-rose-500/5 border border-rose-500/20">
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                This cannot be undone. Type <strong style={{ color: 'var(--foreground)' }}>{organization.name}</strong> to confirm.
              </p>
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="Type organization name"
                disabled={isDeleting}
                className={inputClass}
                style={inputStyle}
              />
              {deleteError && <p className="text-xs text-rose-500">{deleteError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowDeleteConfirmation(false); setDeleteConfirmation(''); }} disabled={isDeleting} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--foreground)' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteOrganization} disabled={isDeleting || !deleteConfirmation.trim()} className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50">
                  {isDeleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
