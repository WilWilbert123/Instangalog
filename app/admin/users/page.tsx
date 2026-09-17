'use client';

import React, { useState, useEffect } from 'react';
import { Profile } from '@/types/user';
import { getAllUsers, updateUserRole, updateUserStatus } from '@/lib/services/adminService';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { Users, Search, ShieldCheck, UserCheck, ShieldAlert, Loader2, ExternalLink, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [errorToast, setErrorToast] = useState('');

  const handleRoleChange = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    setUpdatingUserId(userId);
    setErrorToast('');
    const res = await updateUserRole(userId, newRole);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } else {
      setErrorToast(res.error || 'Failed to update user role');
      setTimeout(() => setErrorToast(''), 4000);
    }
    setUpdatingUserId(null);
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended' | 'banned') => {
    setUpdatingUserId(userId);
    setErrorToast('');
    const res = await updateUserStatus(userId, newStatus);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } else {
      setErrorToast(res.error || 'Failed to update user status');
      setTimeout(() => setErrorToast(''), 4000);
    }
    setUpdatingUserId(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.display_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-slate-900 dark:text-white">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>User Overview & Moderation Desk</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage user roles, inspect profiles, and issue live status restrictions in Supabase
          </p>
          {errorToast && (
            <p className="text-xs font-bold text-rose-500 mt-1.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              {errorToast}
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handle, name, role..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <p className="text-xs font-semibold">Loading real user accounts from Supabase...</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-1">
            <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300 min-w-[900px] table-fixed">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 pl-6 w-[280px]">User</th>
                  <th className="p-4 w-[140px]">Role</th>
                  <th className="p-4 w-[140px]">Status</th>
                  <th className="p-4 w-[100px]">Posts</th>
                  <th className="p-4 w-[110px]">Followers</th>
                  <th className="p-4 pr-8 text-right w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      No user accounts found matching &ldquo;{searchQuery}&rdquo;
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuperAdmin = u.username?.toLowerCase() === 'johnwilbert';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        {/* User avatar + handle */}
                        <td className="p-4 pl-6 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getAvatarUrl(u.avatar_url, u.username || u.display_name)}
                                alt={u.display_name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(u.username || u.display_name);
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                <span className="truncate">{u.display_name}</span>
                                {u.role === 'admin' && (
                                  <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black shrink-0">
                                    <ShieldCheck className="w-3 h-3" />
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">@{u.username}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Selector */}
                        <td className="p-4 align-middle">
                          {isSuperAdmin ? (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase w-fit" title="Super Admin account is immutable">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>SUPER ADMIN</span>
                            </div>
                          ) : (
                            <select
                              value={u.role}
                              disabled={updatingUserId === u.id}
                              onChange={(e) =>
                                handleRoleChange(u.id, e.target.value as 'user' | 'moderator' | 'admin')
                              }
                              className={`w-full max-w-[120px] px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer focus:outline-none transition-colors ${
                                u.role === 'admin'
                                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                  : u.role === 'moderator'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <option value="user" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                USER
                              </option>
                              <option value="moderator" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                MODERATOR
                              </option>
                              <option value="admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                ADMIN
                              </option>
                            </select>
                          )}
                        </td>

                        {/* Status Selector */}
                        <td className="p-4 align-middle">
                          {isSuperAdmin ? (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase w-fit" title="Super Admin account is protected">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>ACTIVE</span>
                            </div>
                          ) : (
                            <select
                              value={u.status}
                              disabled={updatingUserId === u.id}
                              onChange={(e) =>
                                handleStatusChange(u.id, e.target.value as 'active' | 'suspended' | 'banned')
                              }
                              className={`w-full max-w-[120px] px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer focus:outline-none transition-colors ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : u.status === 'suspended'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-800'
                              }`}
                            >
                              <option value="active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                ACTIVE
                              </option>
                              <option value="suspended" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                SUSPENDED
                              </option>
                              <option value="banned" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                BANNED
                              </option>
                            </select>
                          )}
                        </td>

                        <td className="p-4 font-semibold text-slate-900 dark:text-white align-middle">{u.posts_count}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white align-middle">
                          {u.followers_count.toLocaleString()}
                        </td>

                        <td className="p-4 pr-8 text-right align-middle">
                          <Link
                            href={`/profile/${u.username}`}
                            className="inline-block px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-sm active:scale-95 text-center"
                          >
                            View Profile ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

