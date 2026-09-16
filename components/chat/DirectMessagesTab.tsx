'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, MessageSquare, ArrowLeft, Lock, Sparkles, RefreshCw, UserPlus, X, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface DMUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  role?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  rawTime?: string;
  unread?: boolean;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

function formatMessageTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function DirectMessagesTab() {
  const { user, openAuthModal } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<DMUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<DMUser | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allCommunityMembers, setAllCommunityMembers] = useState<DMUser[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = user?.id;

  // 1. Fetch Recent Conversations for Current User (Sorted by latest message at top)
  const fetchRecentConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }
    setLoadingConversations(true);
    try {
      const res = await fetch(`/api/dms?currentUserId=${userId}`);
      const data = await res.json();

      if (data?.success && Array.isArray(data.conversations)) {
        const mapped: DMUser[] = data.conversations.map((c: any) => ({
          id: c.user.id,
          username: c.user.username || 'member',
          displayName: c.user.display_name || c.user.username || 'User',
          avatar: c.user.avatar_url || '',
          role: c.user.role,
          lastMessage: c.lastMessage || '',
          lastMessageTime: formatMessageTime(c.lastMessageTime),
          rawTime: c.lastMessageTime || '',
          unread: c.unread,
        }));

        setConversations(mapped);
      } else {
        setConversations([]);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecentConversations();
  }, [fetchRecentConversations]);

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

  // 3. Fetch All Community Members for "+ New Chat" Modal Search
  const fetchCommunityMembers = useCallback(async () => {
    if (!showNewChatModal) return;
    setLoadingMembers(true);
    try {
      const url = `/api/dms/users?${userId ? `currentUserId=${userId}&` : ''}q=${encodeURIComponent(memberSearchQuery)}`;
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
        setAllCommunityMembers(mapped);
      }
    } catch {
      setAllCommunityMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [showNewChatModal, memberSearchQuery, userId]);

  useEffect(() => {
    fetchCommunityMembers();
  }, [fetchCommunityMembers]);

  // Update conversation list order to move target user to TOP on new message
  const updateConversationOrder = useCallback((otherUser: DMUser, lastMessageText: string, timeIso: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== otherUser.id);
      const updatedContact: DMUser = {
        ...otherUser,
        lastMessage: lastMessageText,
        lastMessageTime: formatMessageTime(timeIso),
        rawTime: timeIso,
      };
      return [updatedContact, ...filtered];
    });
  }, []);

  // 4. Supabase Realtime Listener for Incoming DMs across all contacts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-dms-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newDM = payload.new as DirectMessage;
          if (newDM.sender_id === userId || newDM.receiver_id === userId) {
            const otherUserId = newDM.sender_id === userId ? newDM.receiver_id : newDM.sender_id;

            // If active chat matches
            if (selectedContact && selectedContact.id === otherUserId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newDM.id)) return prev;
                return [...prev, newDM];
              });
            }

            // Move this conversation to the top of inbox list!
            fetchRecentConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedContact, fetchRecentConversations]);

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to send private direct messages');
      return;
    }
    if (!selectedContact || !inputMessage.trim() || sending) return;

    const textToSend = inputMessage.trim();
    const nowIso = new Date().toISOString();
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

        // Instantly move selected contact to TOP of conversations list
        updateConversationOrder(selectedContact, textToSend, nowIso);
      }
    } catch {
      setInputMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Filter local inbox search
  const filteredConversations = conversations.filter(
    (c) =>
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 text-white overflow-hidden font-sans relative">
      {/* "+ New Chat" Search Modal Overlay */}
      {showNewChatModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" /> Start New Conversation
              </h4>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search community member by name..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingMembers ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">Searching community members...</div>
              ) : allCommunityMembers.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">No members found matching &quot;{memberSearchQuery}&quot;</div>
              ) : (
                allCommunityMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setSelectedContact(member);
                      // Add to conversation top if not existing
                      setConversations((prev) => {
                        if (prev.some((c) => c.id === member.id)) return prev;
                        return [member, ...prev];
                      });
                      setShowNewChatModal(false);
                    }}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getAvatarUrl(member.avatar, member.username)}
                          alt={member.displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(member.username);
                          }}
                        />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white flex items-center gap-1">
                          {member.displayName}
                          {member.role === 'admin' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-black font-black">ADMIN</span>
                          )}
                        </h5>
                        <p className="text-[10px] text-amber-400">@{member.username}</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-xl bg-amber-500 text-black text-xs font-bold shadow-md hover:bg-amber-400 transition">
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: Inbox List (Only Active Chats, Latest at Top) */}
      <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/80 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3.5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Direct Messages
            </h3>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('Sign in to start a new private direct message');
                    return;
                  }
                  setShowNewChatModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md flex items-center gap-1 transition active:scale-95"
                title="Start New Chat"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New Chat</span>
              </button>

              <button
                onClick={fetchRecentConversations}
                title="Refresh Inbox"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inbox..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
        </div>

        {/* Inbox List of Active Conversations (Latest message at top) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {loadingConversations && conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              Loading active conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center space-y-3">
              <MessageSquare className="w-8 h-8 text-slate-700" />
              <p>No active conversations found.</p>
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('Sign in to start a new chat');
                    return;
                  }
                  setShowNewChatModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:border-amber-400 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Start New Chat
              </button>
            </div>
          ) : (
            filteredConversations.map((contact) => {
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
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0 relative">
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
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                        {contact.displayName}
                        {contact.role === 'admin' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-black font-black">
                            ADMIN
                          </span>
                        )}
                      </h4>
                      {contact.lastMessageTime && (
                        <span className="text-[9px] font-mono text-slate-400 shrink-0 ml-1">
                          {contact.lastMessageTime}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate line-clamp-1">
                      {contact.lastMessage || `@${contact.username}`}
                    </p>
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
                <Link
                  href={`/profile/${selectedContact.username}`}
                  className="flex items-center gap-3 group/user hover:opacity-90 transition"
                  title={`Visit @${selectedContact.username}'s profile`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 group-hover/user:border-amber-400 transition shrink-0">
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
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 group-hover/user:underline">
                      {selectedContact.displayName}
                      {selectedContact.role === 'admin' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-black font-black">
                          ADMIN
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-amber-400 font-medium">@{selectedContact.username}</span>
                  </div>
                </Link>
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
            <h3 className="text-sm font-bold text-white">Select a Direct Message Conversation</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Choose an active conversation from the left sidebar, or click <strong className="text-amber-400">+ New Chat</strong> to message any community member!
            </p>

            {!user ? (
              <button
                onClick={() => openAuthModal('Sign in to send and receive private direct messages')}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:border-amber-400 transition flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" /> Sign in to Direct Message
              </button>
            ) : (
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md hover:bg-amber-400 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Start New Chat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
