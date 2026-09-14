'use client';

import React, { useState, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import {
  getGlobalChatMessages,
  subscribeToGlobalChat,
  deleteChatMessage,
} from '@/lib/services/chatService';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import {
  MessageSquare,
  Trash2,
  Search,
  Users,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
  Loader2,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export default function AdminChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 1. Initial Fetch of Real Chat Messages from Supabase
  useEffect(() => {
    async function loadChatData() {
      setLoading(true);
      const data = await getGlobalChatMessages();
      setMessages(data);
      setLoading(false);
    }
    loadChatData();
  }, []);

  // 2. Real-time Subscription to Global Chat Stream
  useEffect(() => {
    const unsubscribe = subscribeToGlobalChat(
      user ? { id: user.id, display_name: user.display_name } : null,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      (typers) => {
        setTypingUsers(typers.map((t) => t.displayName));
      },
      (count) => {
        setOnlineCount(count);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // 3. Delete / Moderate Message
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chat message?')) return;

    setDeletingId(id);
    const success = await deleteChatMessage(id);

    if (success) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setNotice('Message deleted successfully.');
      setTimeout(() => setNotice(null), 4000);
    } else {
      alert('Failed to delete chat message. Please try again.');
    }
    setDeletingId(null);
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const content = m.message.toLowerCase();
    const name = (m.author?.display_name || '').toLowerCase();
    const username = (m.author?.username || '').toLowerCase();
    return content.includes(q) || name.includes(q) || username.includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-500">
            <Radio className="w-4 h-4 animate-pulse text-emerald-500" />
            <span>Real-time Chat Audit & Moderation</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Global Community Chat Audit Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live stream of user chat messages with instant moderation and message deletion privileges.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{onlineCount} Online Now</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            <span>{messages.length} Total Messages</span>
          </div>
        </div>
      </div>

      {/* Delete Feedback Toast Notice */}
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{notice}</span>
        </div>
      )}

      {/* Search & Typing Status Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat messages or users..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>

        {typingUsers.length > 0 && (
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
      </div>

      {/* Messages List Container */}
      <div className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white shadow-xl space-y-3">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Connecting to Supabase Realtime Audit Stream...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">No chat messages found</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? `No results for "${searchQuery}"` : 'Community chat history is currently empty.'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const author = msg.author || {
              display_name: 'User',
              username: 'user',
              avatar_url: '',
              role: 'user',
            };
            const isDeleting = deletingId === msg.id;

            return (
              <div
                key={msg.id}
                className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-start gap-3 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAvatarUrl(author.avatar_url, author.username || author.display_name)}
                      alt={author.display_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(author.username || author.display_name);
                      }}
                    />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {author.display_name}
                        {author.role === 'admin' && (
                          <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black">
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        @{author.username}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium break-words leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(msg.id)}
                  disabled={isDeleting}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                  title="Moderate & Delete Message"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
