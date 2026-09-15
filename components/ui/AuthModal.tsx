'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { X, ShieldCheck, Mail, ArrowRight, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export function AuthModal() {
  const { user, showAuthModal, authModalActionText, closeAuthModal, loginWithEmail, loginWithGoogle } = useAuthStore();
  const [emailInput, setEmailInput] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-close modal as soon as user session becomes active (e.g. when email link is clicked)
  useEffect(() => {
    if (user && showAuthModal) {
      closeAuthModal();
    }
  }, [user, showAuthModal, closeAuthModal]);

  // Real-time cross-device heartbeat polling while waiting for magic link click
  useEffect(() => {
    if (!emailSent || !showAuthModal || user || !emailInput) return;

    const pollInterval = setInterval(async () => {
      try {
        // 1. Cross-device API heartbeat poll
        const res = await fetch(`/api/auth/poll-magic-link?email=${encodeURIComponent(emailInput.trim())}`);
        if (res.ok) {
          const pollData = await res.json();
          if (pollData.verified) {
            if (pollData.session?.access_token && pollData.session?.refresh_token) {
              await supabase.auth.setSession({
                access_token: pollData.session.access_token,
                refresh_token: pollData.session.refresh_token,
              });
            }
            await useAuthStore.getState().initSession();
            return;
          }
        }

        // 2. Local Supabase session check
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.email?.toLowerCase() === emailInput.trim().toLowerCase()) {
          await useAuthStore.getState().initSession();
        }
      } catch {
        // Ignore
      }
    }, 1500);

    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key && e.key.includes('auth-token')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await useAuthStore.getState().initSession();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [emailSent, showAuthModal, user, emailInput]);

  // Cooldown countdown timer for resending magic link
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!showAuthModal) return null;

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setErrorMsg(null);
    setEmailSubmitting(true);

    const res = await loginWithEmail(emailInput);
    setEmailSubmitting(false);

    if (res.success) {
      setEmailSent(true);
      setResendCooldown(60); // 60s rate-limit prevention cooldown
    } else {
      setErrorMsg(res.error || 'Failed to send magic link');
    }
  };

  const handleResendMagicLink = async () => {
    if (resendCooldown > 0 || emailSubmitting) return;
    setErrorMsg(null);
    setEmailSubmitting(true);

    const res = await loginWithEmail(emailInput);
    setEmailSubmitting(false);

    if (res.success) {
      setResendCooldown(60);
    } else {
      setErrorMsg(res.error || 'Failed to resend magic link');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    // Real Google OAuth redirect — page navigates away
    await loginWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 sm:p-7 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-2xl">

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-16 h-16 mb-3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign In to Instangalog
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xs">
            {authModalActionText}
          </p>
        </div>

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 transition-all shadow-sm active:scale-[0.98] mb-4 group disabled:opacity-70 disabled:cursor-wait"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          ) : (
            <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          )}
          <span>{googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-semibold">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Or Email Magic Link</span>
          </div>
        </div>

        {/* Error Alert Message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Email Magic Link Form & Sent Confirmation */}
        {emailSent ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center border-2 border-emerald-500/30">
                <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Check Your Email Inbox</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                We sent a magic sign-in link to <span className="font-mono font-bold text-slate-900 dark:text-white">{emailInput}</span>. Open the link in your email to log in automatically.
              </p>
            </div>

            {/* Resend Magic Link Button with Cooldown Timer */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleResendMagicLink}
                disabled={resendCooldown > 0 || emailSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {emailSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span>Resending Magic Link…</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                    <span>Resend Magic Link ({resendCooldown}s)</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend Magic Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setErrorMsg(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline block mx-auto"
              >
                Use a different email address
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Enter Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={emailSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md active:scale-[0.98] disabled:opacity-70"
            >
              {emailSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Magic Link…</span>
                </>
              ) : (
                <>
                  <span>Send Magic Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-5">
          By continuing, you agree to Instangalog&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

