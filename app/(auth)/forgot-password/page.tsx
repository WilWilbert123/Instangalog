import React from 'react';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 text-center">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 text-slate-900 dark:text-white shadow-2xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
          <KeyRound className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">Enter your email address and we&apos;ll send you a password reset link.</p>
        <form className="space-y-3 pt-2">
          <input
            type="email"
            placeholder="Enter your email..."
            required
            className="w-full px-4 py-3 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
          <button
            type="submit"
            className="w-full py-3 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-md hover:opacity-90"
          >
            Send Reset Link
          </button>
        </form>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/login" className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
