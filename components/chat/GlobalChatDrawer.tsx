'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';
import {
  getGlobalChatMessages,
  sendChatMessage,
  subscribeToGlobalChat,
  sendTypingBroadcast,
  TypingUser,
} from '@/lib/services/chatService';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { Send, Users, Sparkles, MessageSquare, Mail, Radio } from 'lucide-react';
import Link from 'next/link';

// Import Tab Components
import { DirectMessagesTab } from './DirectMessagesTab';
import { MusicLoungeTab } from './MusicLoungeTab';

interface GlobalChatDrawerProps {
  className?: string;
  simpleMode?: boolean;
}

type TabType = 'chat' | 'dms' | 'music';

function cleanDisplayName(name: string): string {
  if (!name) return 'Someone';
  return name.replace(/\s*\([^)]*\)/g, '').trim() || name;
}

function formatTypingStatus(users: TypingUser[]): { text: string; primaryUser?: TypingUser } {
  if (users.length === 0) return { text: '' };

  const names = users.map((u) => cleanDisplayName(u.displayName));
  const primaryUser = users[0];

  if (users.length === 1) {
    return { text: `${names[0]} is typing`, primaryUser };
  }
  if (users.length === 2) {
    return { text: `${names[0]} and ${names[1]} are typing`, primaryUser };
  }
  return { text: `${names[0]}, ${names[1]}, and ${users.length - 2} others are typing`, primaryUser };
}

export function GlobalChatDrawer({ className, simpleMode = false }: GlobalChatDrawerProps = {}) {
  const { user, openAuthModal } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Fetch initial message history
    getGlobalChatMessages().then(setMessages);

    // Subscribe to Supabase Realtime WebSockets
    const currentUserPayload = user
      ? { id: user.id, display_name: user.display_name }
      : null;

    const unsubscribe = subscribeToGlobalChat(
      currentUserPayload,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      (typingList) => {
        setTypingUsers(
          typingList.filter((item) => {
            if (user?.id && item.userId === user.id) return false;
            return true;
          })
        );
      },
      (count) => {
        setOnlineCount(count);
      }
    );

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.display_name]);

  useEffect(() => {
    if (activeTab === 'chat' || simpleMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, activeTab, simpleMode]);

  useEffect(() => {
    if (sendError) {
      const t = setTimeout(() => setSendError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [sendError]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(text);

      if (user) {
        if (text.trim().length > 0) {
          sendTypingBroadcast({ id: user.id, display_name: user.display_name }, true);

          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);
          }, 3000);
        } else {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);
        }
      }
    },
    [user]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to send chat messages');
      return;
    }
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);

    try {
      const sent = await sendChatMessage(user.id, inputText);
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }
      setInputText('');
      setSendError(null);
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message');
    }
  };

  const handleBroadcastFromTab = async (msgText: string) => {
    if (!user) {
      openAuthModal('Sign in to share game score');
      return;
    }
    try {
      const sent = await sendChatMessage(user.id, msgText);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
      }
    } catch {
      // ignore
    }
  };

  const typingInfo = formatTypingStatus(typingUsers);

  return (
    <div className={`w-full flex flex-col rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-slate-900 dark:text-white shadow-2xl overflow-hidden transition-colors duration-200 ${className || 'max-w-4xl mx-auto h-[calc(100vh-6rem)]'}`}>

      {/* Main Header with Logo & Online Counter */}
      <div className="px-6 py-3.5 glass-header flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-0.5 shadow-md shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain scale-125" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {simpleMode ? 'Global Chat' : 'Community Hub'}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Tangalog Bisayawa Lounge</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm" title={`${onlineCount} Online Now`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span>{onlineCount} Online</span>
        </div>
      </div>

      {/* Interactive Tabs Navigation Bar (Hidden in Simple Mode) */}
      {!simpleMode && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'chat'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Global Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('dms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'dms'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Direct Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('music')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'music'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Pagpag Party</span>
          </button>
        </div>
      )}

      {/* Tab Contents View */}
      {activeTab === 'chat' && (
        <>
          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 text-slate-500 dark:text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No real messages yet</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">Be the first to send a live message to the Instangalog community!</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = Boolean(user && (user.id === msg.user_id || user.username.toLowerCase() === msg.author?.username?.toLowerCase()));
                const author = isMe && user
                  ? {
                      display_name: user.display_name,
                      username: user.username,
                      avatar_url: user.avatar_url,
                      role: user.role,
                    }
                  : msg.author || {
                      display_name: 'Member',
                      username: 'member',
                      avatar_url: '',
                      role: 'user',
                    };

                const avatarSrc = getAvatarUrl(author.avatar_url, author.username || author.display_name || 'user');

                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Link href={`/profile/${author.username}`} className="shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarSrc}
                          alt={author.display_name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(author.username || author.display_name || 'user');
                          }}
                        />
                      </div>
                    </Link>

                    <div className={`max-w-md space-y-1 ${isMe ? 'items-end text-right' : ''}`}>
                      <div className="flex items-baseline gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-900 dark:text-slate-200">{author.display_name}</span>
                        {author.role === 'admin' && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-black text-white dark:bg-white dark:text-black font-bold">
                            ADMIN
                          </span>
                        )}
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && typingInfo.primaryUser && (
            <div className="px-4 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full overflow-hidden border border-emerald-500/40 bg-slate-100 dark:bg-slate-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCartoonAvatar(typingInfo.primaryUser.displayName)}
                  alt="Typing..."
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {typingInfo.text}
              </span>

              <div className="flex items-center gap-[2px]">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.32s] [animation-duration:0.6s]" />
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.16s] [animation-duration:0.6s]" />
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-duration:0.6s]" />
              </div>
            </div>
          )}

          {sendError && (
            <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
              {sendError}
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={user ? 'Type a public message...' : 'Sign in to send a chat message...'}
              onClick={() => {
                if (!user) openAuthModal('Sign in to chat with the Instangalog community');
              }}
              className="flex-1 px-4 py-3 text-xs md:text-sm rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-5 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs shadow-md disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      {activeTab === 'dms' && <DirectMessagesTab />}
      {activeTab === 'music' && <MusicLoungeTab />}

    </div>
  );
}
