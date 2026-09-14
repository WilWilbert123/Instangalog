'use client';

import React, { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import {
  getPendingPosts,
  getAdminDashboardMetrics,
  AdminDashboardMetrics,
} from '@/lib/services/adminService';
import { VideoModerationCard } from '@/components/admin/VideoModerationCard';
import { Users, Video, AlertTriangle, ShieldCheck, CheckCircle, Clock, Loader2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>({
    pendingPostsCount: 0,
    approvedPostsCount: 0,
    totalUsersCount: 0,
    pendingReportsCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = async () => {
    setIsLoading(true);
    const [pending, liveMetrics] = await Promise.all([
      getPendingPosts(),
      getAdminDashboardMetrics(),
    ]);
    setPendingPosts(pending);
    setMetrics(liveMetrics);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-slate-900 dark:text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Safety & Moderation Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Platform activity, review queue, and security statistics</p>
        </div>
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>System Healthy</span>
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Review</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : metrics.pendingPostsCount}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Approved Content</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : metrics.approvedPostsCount}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Registered</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : metrics.totalUsersCount}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Reports</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : metrics.pendingReportsCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Pending Media Moderation Queue */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-amber-500" />
          <span>Pending Media Approvals ({pendingPosts.length})</span>
        </h2>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <p className="text-xs font-semibold">Checking live database metrics & pending uploads from Supabase...</p>
          </div>
        ) : pendingPosts.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 text-center text-slate-500 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">All uploads reviewed!</p>
            <p className="text-xs text-slate-500">There are no pending posts waiting for moderation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPosts.map((post) => (
              <VideoModerationCard key={post.id} post={post} onModerated={refreshData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
