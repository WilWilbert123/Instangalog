'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  Music,
  Type,
  MessageSquare,
  Zap,
  CheckCircle2,
  Lock,
  Sliders,
  Database,
  Server,
  Sparkles,
  Info,
  Save,
  Check,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [requireVideoApproval, setRequireVideoApproval] = useState(true);
  const [autoApproveImageStatus, setAutoApproveImageStatus] = useState(true);
  const [enableChatRateLimit, setEnableChatRateLimit] = useState(true);
  const [enableSpamFilter, setEnableSpamFilter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch live security and moderation settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data?.success && data.settings) {
          setRequireVideoApproval(Boolean(data.settings.requireVideoApproval));
          setAutoApproveImageStatus(Boolean(data.settings.autoApproveImageStatus));
          setEnableChatRateLimit(Boolean(data.settings.enableChatRateLimit));
          setEnableSpamFilter(Boolean(data.settings.enableSpamFilter));
        }
      } catch (err: any) {
        console.warn('Error fetching admin settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // 2. Persist updated configuration to server real-time
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requireVideoApproval,
          autoApproveImageStatus,
          enableChatRateLimit,
          enableSpamFilter,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMsg(data?.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-500">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Security & Moderation</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            System Moderation & Security Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure content pre-approval rules, chat rate limits, CDN storage limits, and database security.
          </p>
          {errorMsg && (
            <p className="text-xs font-bold text-rose-500">{errorMsg}</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-5 py-2.5 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Settings Saved!</span>
            </>
          ) : saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>

      {/* Grid Section 1: Content Moderation Policy */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-500" />
            <span>Content Approval & Moderation Rules</span>
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Live Enforcement Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Video Pre-Approval */}
          <div className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Video Post Moderation</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Requires Admin Pre-Approval</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRequireVideoApproval(!requireVideoApproval)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                  requireVideoApproval
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                {requireVideoApproval ? 'REQUIRED (Review Queue)' : 'AUTO-APPROVE'}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              Video posts (`video_url`) enter `moderation_status = pending` and require explicit Admin approval before distributing to public feeds & FYP.
            </p>
          </div>

          {/* Image, Status & Music Instant Publishing */}
          <div className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Image, Status & Music Posts</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant Live Feed Publishing</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoApproveImageStatus(!autoApproveImageStatus)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                  autoApproveImageStatus
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                {autoApproveImageStatus ? 'AUTO-APPROVED (Live)' : 'MANDATORY REVIEW'}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              Images, statuses, and music audio posts are assigned `moderation_status = approved` on creation, appearing live on feeds instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Section 2: Global Chat & Anti-Spam Protections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span>Global Chat & Anti-Spam Protections</span>
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Real-Time Messaging Limits</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Global Chat Rate Limiting */}
          <div className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Chat Rate Limiter</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Max 5 Messages per 10 Seconds</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnableChatRateLimit(!enableChatRateLimit)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                  enableChatRateLimit
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                {enableChatRateLimit ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              Prevents automated bots and flood-spam in Global Chat by enforcing a 10-second sliding rate limit per IP and user ID.
            </p>
          </div>

          {/* Automated Content Filter */}
          <div className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Automated Keyword & Link Safety</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Malicious Link & Keyword Scanning</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnableSpamFilter(!enableSpamFilter)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                  enableSpamFilter
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                {enableSpamFilter ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              Scans captions, status updates, and global messages for blacklisted phishing domains and harmful external links.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Section 3: CDN Storage & Database Infrastructure */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            <span>Media Storage & Supabase Database Security</span>
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Infrastructure Thresholds</span>
        </div>

        <div className="p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Cloudinary CDN Limit</span>
              <p className="text-sm font-black text-slate-900 dark:text-white">100MB / Video</p>
              <p className="text-[11px] text-slate-500">Auto thumbnail generation & HLS streaming</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Image & Audio Limit</span>
              <p className="text-sm font-black text-slate-900 dark:text-white">10MB Image / 25MB Audio</p>
              <p className="text-[11px] text-slate-500">Direct high-speed Cloudinary upload</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Database Row Security</span>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Supabase RLS Active
              </p>
              <p className="text-[11px] text-slate-500">Public read for approved posts only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
