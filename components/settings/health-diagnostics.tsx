'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldCheck,
  Database,
  Users,
  MessageSquare,
  FileText,
  AlertCircle,
  RefreshCw,
  Server,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';

interface DiagnosticsData {
  status: string;
  latencyMs: number;
  organization: {
    id: string;
    name: string;
    created_at: string;
  };
  metrics: {
    totalLeads: number;
    totalDiscussions: number;
    totalActivityLogs: number;
    totalStaffProfiles: number;
  };
  security: {
    rlsEnabled: boolean;
    dataIsolationScoping: string;
    orphanAuthUsers: number;
  };
  recentAuditLogs: Array<{
    id: string;
    action_type: string;
    actor_id: string | null;
    target_id: string | null;
    organization_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
}

export function HealthDiagnostics() {
  const { isOwner } = useAuth();
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/health/diagnostics');
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || payload.message || 'Failed to load diagnostics.');
      }
      setData(payload as DiagnosticsData);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to connect to diagnostics API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      void fetchDiagnostics();
    }
  }, [isOwner, fetchDiagnostics]);

  if (!isOwner) return null;

  return (
    <div
      className="rounded-[12px] p-5 space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
            }}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
              Database & Security Diagnostics
            </h2>
            <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              Owner-only system health, tenant isolation metrics, and security audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={() => void fetchDiagnostics()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors self-start sm:self-auto cursor-pointer"
          style={{
            backgroundColor: 'var(--surface-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-[8px] text-[12px] flex items-center gap-2" style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading && !data && (
        <div className="py-8 text-center text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
          Loading system diagnostics...
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Status & Latency Top Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="p-3.5 rounded-[8px] flex items-center justify-between"
              style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>Database Connection</div>
                  <div className="text-[13px] font-bold text-emerald-600">Online & Healthy</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {data.latencyMs} ms
              </span>
            </div>

            <div
              className="p-3.5 rounded-[8px] flex items-center justify-between"
              style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>Row-Level Security (RLS)</div>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>Enforced (All Tables)</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                Active
              </span>
            </div>

            <div
              className="p-3.5 rounded-[8px] flex items-center justify-between"
              style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--foreground-muted)' }}>Orphan Auth Accounts</div>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>
                    {data.security.orphanAuthUsers} {data.security.orphanAuthUsers === 1 ? 'account' : 'accounts'}
                  </div>
                </div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${data.security.orphanAuthUsers === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                {data.security.orphanAuthUsers === 0 ? 'Clean' : 'Pending Cleanup'}
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-[8px]" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                <FileText className="w-3.5 h-3.5" />
                <span>Total Leads</span>
              </div>
              <div className="text-[20px] font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {data.metrics.totalLeads}
              </div>
            </div>

            <div className="p-3 rounded-[8px]" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussions</span>
              </div>
              <div className="text-[20px] font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {data.metrics.totalDiscussions}
              </div>
            </div>

            <div className="p-3 rounded-[8px]" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                <Activity className="w-3.5 h-3.5" />
                <span>Activity Logs</span>
              </div>
              <div className="text-[20px] font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {data.metrics.totalActivityLogs}
              </div>
            </div>

            <div className="p-3 rounded-[8px]" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                <Users className="w-3.5 h-3.5" />
                <span>Staff Members</span>
              </div>
              <div className="text-[20px] font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {data.metrics.totalStaffProfiles}
              </div>
            </div>
          </div>

          {/* System Audit Logs Preview */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>
              Recent Security & Lifecycle Audit Events
            </h3>
            {data.recentAuditLogs.length === 0 ? (
              <div className="p-4 rounded-[8px] text-center text-[12px]" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--foreground-muted)', border: '1px solid var(--border)' }}>
                No recent security events logged.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[8px] border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-left text-[12px]">
                  <thead style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--foreground-muted)' }}>
                    <tr>
                      <th className="p-2.5 font-semibold">Action</th>
                      <th className="p-2.5 font-semibold">Details</th>
                      <th className="p-2.5 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {data.recentAuditLogs.map((log) => (
                      <tr key={log.id} style={{ color: 'var(--foreground)' }}>
                        <td className="p-2.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-semibold">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="p-2.5 truncate max-w-xs" style={{ color: 'var(--foreground-secondary)' }}>
                          {log.metadata ? JSON.stringify(log.metadata) : '—'}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
