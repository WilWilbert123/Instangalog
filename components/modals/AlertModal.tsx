'use client';

import React from 'react';
import { useModalStore } from '@/stores/modalStore';
import { ShieldAlert, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export function AlertModal() {
  const { alertModal, closeAlert } = useModalStore();

  if (!alertModal.isOpen) return null;

  const getIcon = () => {
    switch (alertModal.type) {
      case 'warning':
        return <ShieldAlert className="w-8 h-8 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-rose-500" />;
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
      default:
        return <Info className="w-8 h-8 text-indigo-400" />;
    }
  };

  const getGlowColor = () => {
    switch (alertModal.type) {
      case 'warning':
        return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
      case 'error':
        return 'bg-rose-500/20 border-rose-500/30 text-rose-400';
      case 'success':
        return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400';
    }
  };

  return (
    <div
      onClick={closeAlert}
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Glow Accent */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none ${getGlowColor()}`} />

        {/* Close button */}
        <button
          onClick={closeAlert}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Circle */}
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto shadow-inner relative z-10 ${getGlowColor()}`}>
          {getIcon()}
        </div>

        {/* Text */}
        <div className="space-y-2 relative z-10">
          <h3 className="text-base font-bold text-white tracking-tight">
            {alertModal.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            {alertModal.message}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 relative z-10">
          <button
            onClick={closeAlert}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            {alertModal.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
