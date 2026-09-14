import React from 'react';
import Link from 'next/link';
import { Compass, House } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">404 - Page Not Found</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">The content or page you are looking for does not exist or has been moved.</p>
      <Link
        href="/"
        className="px-6 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-lg flex items-center gap-2"
      >
        <House className="w-4 h-4" />
        <span>Return to FYP Feed</span>
      </Link>
    </div>
  );
}
