'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Send, Users, Sparkles, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface GlobalChatDrawerProps {
  className?: string;
}

function cleanDisplayName(name: string): string {
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  const firstWord = clean.split(' ')[0];
  return firstWord || clean || 'Someone';
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

export function GlobalChatDrawer({ className }: GlobalChatDrawerProps = {}) {
  const { user, openAuthModal } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Fetch initial message history
    getGlobalChatMessages().then(setMessages);

    // 2. Subscribe to Supabase Realtime WebSockets
    const unsubscribe = subscribeToGlobalChat(
      user ? { id: user.id, display_name: user.display_name } : null,
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
            if (user?.display_name && item.displayName === user.display_name) return false;
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
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (user) {
      if (text.trim().length > 0) {
        sendTypingBroadcast({ id: user.id, display_name: user.display_name }, true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);
        }, 2500);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to send chat messages');
      return;
    }
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);

    const sent = await sendChatMessage(user.id, inputText);
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    }
    setInputText('');
  };

  const typingInfo = formatTypingStatus(typingUsers);

  return (
    <div className={`w-full flex flex-col rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-slate-900 dark:text-white shadow-2xl overflow-hidden transition-colors duration-200 ${className || 'max-w-4xl mx-auto h-[calc(100vh-6rem)]'}`}>

      {/* Chat Header */}
      <div className="px-6 py-4 glass-header flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Global Community Chat
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">WebSocket Realtime Sync • Active Presence</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm">
          <Users className="w-3.5 h-3.5 text-emerald-500" />
          <span>{onlineCount} Online Now</span>
        </div>
      </div>

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

        {/* Live WebSocket Typing Indicator */}
        {typingUsers.length > 0 && typingInfo.primaryUser && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm w-fit transition-all duration-300 my-1 animate-pulse">
            <div className="w-5 h-5 rounded-full overflow-hidden border border-emerald-500/50 bg-slate-100 dark:bg-slate-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCartoonAvatar(typingInfo.primaryUser.displayName)}
                alt="Typing..."
                className="w-full h-full object-cover"
              />
            </div>

            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {typingInfo.text}
            </span>

            <div className="flex items-center gap-1 pl-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.32s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.16s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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
    </div>
  );
}

