'use client';

import React, { useState, useEffect } from 'react';
import { Report, ReportStatus, ReportTargetType } from '@/types/report';
import { getReports, resolveReport } from '@/lib/services/adminService';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Check,
  Clock,
  Filter,
  Loader2,
  Video,
  Image as ImageIcon,
  Music,
  Type,
  MessageSquare,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export default function AdminReportsPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const realReports = await getReports();
      setReports(realReports || []);
      setLoading(false);
    }
    loadReports();
  }, []);

  const handleResolveAction = async (reportId: string, action: 'keep' | 'delete') => {
    setActionLoadingId(reportId);
    const adminId = user?.id || '00000000-0000-0000-0000-000000000001';

    const ok = await resolveReport(reportId, adminId, action);

    // Update local state even if mock data was used
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: action === 'delete' ? 'resolved' : 'dismissed',
            resolution: action === 'delete' ? 'Target content removed by admin' : 'Report dismissed by admin',
            reviewed_at: new Date().toISOString(),
          };
        }
        return r;
      })
    );

    if (action === 'delete') {
      setToastNotice({
        message: 'Target content permanently deleted and report marked as RESOLVED.',
        type: 'danger',
      });
    } else {
      setToastNotice({
        message: 'Report DISMISSED and target content kept on the platform.',
        type: 'success',
      });
    }

    setTimeout(() => setToastNotice(null), 4000);
    setActionLoadingId(null);
  };

  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const targetIconMap: Record<ReportTargetType, React.ComponentType<{ className?: string }>> = {
    video: Video,
    image: ImageIcon,
    music: Music,
    status: Type,
    post: Sparkles,
    comment: MessageSquare,
    chat: MessageSquare,
    user: UserCheck,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-500">
            <AlertTriangle className="w-4 h-4" />
            <span>Abuse & Safety Queue</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Community Abuse Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review user-submitted reports for copyright, spam, inappropriate media, or policy violations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{reports.filter((r) => r.status === 'pending').length} Pending Review</span>
          </div>
        </div>
      </div>

      {/* Action Toast Notice */}
      {toastNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            toastNotice.type === 'danger'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {toastNotice.type === 'danger' ? (
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          )}
          <span>{toastNotice.message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {[
          { key: 'pending', label: 'Pending Review', count: reports.filter((r) => r.status === 'pending').length },
          { key: 'resolved', label: 'Resolved (Deleted)', count: reports.filter((r) => r.status === 'resolved').length },
          { key: 'dismissed', label: 'Dismissed (Kept)', count: reports.filter((r) => r.status === 'dismissed').length },
          { key: 'all', label: 'All Reports', count: reports.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              filterStatus === key
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>{label}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3 p-8 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading abuse reports from Supabase...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center space-y-2 p-8 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No reports found</h3>
            <p className="text-xs text-slate-500">There are no reports matching the selected status filter.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const TargetIcon = targetIconMap[report.target_type] || AlertTriangle;
            const reporter = report.reporter || {
              display_name: 'Community Member',
              username: 'user',
              avatar_url: '',
            };
            const isProcessing = actionLoadingId === report.id;

            return (
              <div
                key={report.id}
                className="p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white space-y-4 shadow-xl hover:shadow-2xl transition-all"
              >
                {/* Top Badge & Time Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-[10px] font-black rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider flex items-center gap-1.5">
                      <TargetIcon className="w-3.5 h-3.5" />
                      <span>TARGET: {report.target_type}</span>
                    </span>

                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border capitalize ${
                        report.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : report.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Reason & Description */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Reason: {report.reason}</span>
                  </h4>
                  {report.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-5 leading-relaxed">
                      {report.description}
                    </p>
                  )}
                  {report.target_id && (
                    <div className="pt-2 pl-5 flex items-center gap-2">
                      <a
                        href={`/post/${report.target_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                      >
                        <span>Inspect Target Post ↗</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Reporter Footer & Action Buttons */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getAvatarUrl(reporter.avatar_url, reporter.username || reporter.display_name)}
                        alt={reporter.display_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(reporter.username || reporter.display_name);
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Reported by <strong className="text-slate-900 dark:text-white">{reporter.display_name}</strong> (@{reporter.username})
                    </span>
                  </div>

                  {report.status === 'pending' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveAction(report.id, 'keep')}
                        disabled={isProcessing}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1.5"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        <span>Resolve & Keep</span>
                      </button>

                      <button
                        onClick={() => handleResolveAction(report.id, 'delete')}
                        disabled={isProcessing}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md flex items-center gap-1.5"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Remove Target Content</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                      {report.resolution || 'Report decision finalized.'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
