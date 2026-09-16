'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, User, MessageSquare, ArrowLeft, Lock, Sparkles, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { supabase } from '@/lib/supabase/client';

interface DMUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  role?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export function DirectMessagesTab() {
  const { user, openAuthModal } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<DMUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<DMUser | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  // 1. Fetch Real Community Members & Conversations from Supabase
  const fetchCommunityUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const url = `/api/dms/users?${userId ? `currentUserId=${userId}&` : ''}q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data?.success && Array.isArray(data.users)) {
        const mapped: DMUser[] = data.users.map((u: any) => ({
          id: u.id,
          username: u.username || 'member',
          displayName: u.display_name || u.username || 'Community Member',
          avatar: u.avatar_url || '',
          role: u.role,
        }));
        setContacts(mapped);
      }
    } catch {
      // Fallback empty
      setContacts([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [userId, searchQuery]);

  useEffect(() => {
    fetchCommunityUsers();
  }, [fetchCommunityUsers]);

  // 2. Fetch Chat History when a contact is selected
  const fetchChatHistory = useCallback(async () => {
    if (!userId || !selectedContact) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/dms?currentUserId=${userId}&targetUserId=${selectedContact.id}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId, selectedContact]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Supabase Realtime Listener for Incoming DMs
  useEffect(() => {
    if (!userId || !selectedContact) return;

    const channel = supabase
      .channel(`dm-${userId}-${selectedContact.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newDM = payload.new as DirectMessage;
          if (
            (newDM.sender_id === userId && newDM.receiver_id === selectedContact.id) ||
            (newDM.sender_id === selectedContact.id && newDM.receiver_id === userId)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newDM.id)) return prev;
              return [...prev, newDM];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedContact]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to send private direct messages');
      return;
    }
    if (!selectedContact || !inputMessage.trim() || sending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await fetch('/api/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: selectedContact.id,
          message: textToSend,
        }),
      });

      const data = await res.json();
      if (data?.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch {
      // Revert input if failed
      setInputMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 text-white overflow-hidden font-sans">
      {/* Sidebar / Real Supabase Community Members List */}
      <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/80 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3.5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Direct Messages
            </h3>
            <button
              onClick={fetchCommunityUsers}
              title="Refresh Members"
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-3 h-3 ${loadingUsers ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search community members..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Real Community Members List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {loadingUsers && contacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              Loading real members from database...
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No registered members found. Be the first to start a chat!
            </div>
          ) : (
            contacts.map((contact) => {
              const avatarSrc = getAvatarUrl(contact.avatar, contact.username);
              const isSelected = selectedContact?.id === contact.id;

              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    if (!user) {
                      openAuthModal(`Sign in to send direct messages to ${contact.displayName}`);
                      return;
                    }
                    setSelectedContact(contact);
                  }}
                  className={`w-full p-3 flex items-center gap-3 text-left transition hover:bg-slate-900/80 ${
                    isSelected ? 'bg-slate-900 border-l-4 border-amber-500' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc}
                      alt={contact.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(contact.username);
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{contact.displayName}</h4>
                      {contact.role === 'admin' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-black font-black">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-400/80 truncate">@{contact.username}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className={`flex-1 flex flex-col bg-slate-950 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* DM Header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatarUrl(selectedContact.avatar, selectedContact.username)}
                    alt={selectedContact.displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(selectedContact.username);
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {selectedContact.displayName}
                    {selectedContact.role === 'admin' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-black font-black">
                        ADMIN
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-amber-400 font-medium">@{selectedContact.username}</span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Private Chat
              </div>
            </div>

            {/* DM Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
              {loadingMessages && messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  Loading private chat history from database...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">No message history yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Send a private 1-on-1 message to @{selectedContact.username} to start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = user && msg.sender_id === user.id;
                  const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-xs md:max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-amber-500 text-black font-medium rounded-tr-none shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none shadow-md'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">{timeFormatted}</span>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* DM Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Private message to @${selectedContact.username}...`}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 transition active:scale-95 shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2.5 shadow-inner">
              <MessageSquare className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Select a Community Member</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Choose any registered user from the left sidebar to start private real-time 1-on-1 messaging!
            </p>

            {!user && (
              <button
                onClick={() => openAuthModal('Sign in to send and receive private direct messages')}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:border-amber-400 transition flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" /> Sign in to Direct Message
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
