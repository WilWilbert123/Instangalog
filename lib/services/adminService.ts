import { Post } from '@/types/post';
import { Profile } from '@/types/user';
import { Report, ReportTargetType } from '@/types/report';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureValidUuid } from '@/lib/utils/uuid';
import { MOCK_REPORTS } from './mockData';

export async function getPendingPosts(): Promise<Post[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/pending-posts');
      const json = await res.json();
      if (json.posts) return json.posts as Post[];
    } catch {
      // Fallthrough
    }
  }

  try {
    // Try supabaseAdmin first to bypass RLS restrictions on pending posts
    let { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) {
      const res = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          video:videos(*),
          image:images(*),
          music:music(*),
          status:statuses(*)
        `)
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false });
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      return data as unknown as Post[];
    }
  } catch (err: any) {
    console.warn('[getPendingPosts error]:', err?.message);
  }

  return [];
}

export async function approvePost(postId: string, adminId: string): Promise<Post | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/approve-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, adminId }),
      });
      const json = await res.json();
      return json.post || null;
    } catch (err: any) {
      console.error('[approvePost client error]:', err?.message);
      return null;
    }
  }

  const validAdminId = ensureValidUuid(adminId);
  try {
    const { data, error } = await (supabaseAdmin.from('posts') as any)
      .update({
        moderation_status: 'approved',
        approved_by: validAdminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as Post;
    } else if (error) {
      console.error('[approvePost DB error]:', error.message);
    }
  } catch (err: any) {
    console.warn('[approvePost error]:', err?.message);
  }

  return null;
}

export async function rejectPost(postId: string, adminId: string, reason: string): Promise<Post | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/reject-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, adminId, reason }),
      });
      const json = await res.json();
      return json.post || null;
    } catch (err: any) {
      console.error('[rejectPost client error]:', err?.message);
      return null;
    }
  }

  const validAdminId = ensureValidUuid(adminId);
  try {
    const { data, error } = await (supabaseAdmin.from('posts') as any)
      .update({
        moderation_status: 'rejected',
        rejected_by: validAdminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as Post;
    } else if (error) {
      console.error('[rejectPost DB error]:', error.message);
    }
  } catch (err: any) {
    console.warn('[rejectPost error]:', err?.message);
  }

  return null;
}

export async function getAllUsers(): Promise<Profile[]> {
  try {
    let { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      const res = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      return data as unknown as Profile[];
    }
  } catch (err: any) {
    console.warn('[getAllUsers error]:', err?.message);
  }

  return [];
}

export async function updateUserRole(
  userId: string,
  newRole: 'user' | 'moderator' | 'admin'
): Promise<boolean> {
  const validUserId = ensureValidUuid(userId);
  try {
    const { error } = await (supabaseAdmin.from('profiles') as any)
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', validUserId);

    if (!error) return true;
  } catch (err: any) {
    console.warn('[updateUserRole Error]:', err?.message);
  }

  return false;
}

export async function updateUserStatus(
  userId: string,
  newStatus: 'active' | 'suspended' | 'banned'
): Promise<boolean> {
  const validUserId = ensureValidUuid(userId);
  try {
    const { error } = await (supabaseAdmin.from('profiles') as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', validUserId);

    if (!error) return true;
  } catch (err: any) {
    console.warn('[updateUserStatus Error]:', err?.message);
  }

  return false;
}

export interface AdminDashboardMetrics {
  pendingPostsCount: number;
  approvedPostsCount: number;
  totalUsersCount: number;
  pendingReportsCount: number;
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/metrics');
      const json = await res.json();
      if (json.metrics) return json.metrics as AdminDashboardMetrics;
    } catch (err: any) {
      console.error('[getAdminDashboardMetrics client error]:', err?.message);
    }
  }

  let pendingPostsCount = 0;
  let approvedPostsCount = 0;
  let totalUsersCount = 0;
  let pendingReportsCount = 0;

  try {
    const [
      { count: pendingCount },
      { count: approvedCount },
      { count: usersCount },
      { count: reportsCount },
    ] = await Promise.all([
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    pendingPostsCount = pendingCount ?? 0;
    approvedPostsCount = approvedCount ?? 0;
    totalUsersCount = usersCount ?? 0;
    pendingReportsCount = reportsCount ?? 0;
  } catch (err: any) {
    console.warn('[getAdminDashboardMetrics count error]:', err?.message);
  }

  return {
    pendingPostsCount,
    approvedPostsCount,
    totalUsersCount,
    pendingReportsCount,
  };
}

export async function getReports(): Promise<Report[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/reports');
      const json = await res.json();
      if (res.ok && json.reports) {
        return json.reports as Report[];
      }
    } catch {
      // Fallthrough
    }
  }

  try {
    let { data, error } = await (supabaseAdmin.from('reports') as any)
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) {
      const res = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      return data as unknown as Report[];
    }
  } catch {
    // Fallthrough
  }
  return MOCK_REPORTS;
}

export async function resolveReport(
  reportId: string,
  adminId: string,
  action: 'keep' | 'delete'
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, adminId, action }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return true;
      }
    } catch {
      // Fallthrough
    }
  }

  const validAdminId = ensureValidUuid(adminId);
  try {
    const { data: report } = await (supabaseAdmin.from('reports') as any)
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) return false;

    if (action === 'delete' && report.target_id) {
      if (['video', 'image', 'music', 'status', 'post'].includes(report.target_type)) {
        await (supabaseAdmin.from('posts') as any).delete().eq('id', report.target_id);
      } else if (report.target_type === 'comment') {
        await (supabaseAdmin.from('comments') as any).delete().eq('id', report.target_id);
      } else if (report.target_type === 'chat') {
        await (supabaseAdmin.from('chat_messages') as any).delete().eq('id', report.target_id);
      }
    }

    const { error } = await (supabaseAdmin.from('reports') as any)
      .update({
        status: action === 'delete' ? 'resolved' : 'dismissed',
        resolution: action === 'delete' ? 'Content removed by admin' : 'Report dismissed / content kept',
        reviewed_by: validAdminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    return !error;
  } catch (err: any) {
    console.error('[resolveReport error]:', err?.message);
    return false;
  }
}

export async function createReport(reportData: {
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description?: string;
}): Promise<boolean> {
  const validReporterId = ensureValidUuid(reportData.reporter_id);
  const validTargetId = ensureValidUuid(reportData.target_id);

  try {
    const { error } = await (supabaseAdmin.from('reports') as any).insert({
      reporter_id: validReporterId,
      target_type: reportData.target_type,
      target_id: validTargetId,
      reason: reportData.reason,
      description: reportData.description || '',
      status: 'pending',
    });

    if (!error) return true;
    console.error('[createReport DB error]:', error.message);
  } catch (err: any) {
    console.error('[createReport error]:', err?.message);
  }
  return false;
}
