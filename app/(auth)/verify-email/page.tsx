import React from 'react';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 text-center">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 text-slate-900 dark:text-white shadow-2xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
          <MailCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Check Your Email</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          We&apos;ve sent a verification link to your email address. Please click the link to confirm your Spoti-Ngalog account.
        </p>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/login" className="text-xs font-bold text-slate-900 dark:text-white hover:underline">
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
