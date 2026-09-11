'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          error: <AlertCircle className="w-4 h-4 text-rose-500" />,
          info: <Info className="w-4 h-4 text-indigo-500" />,
        }[toast.type];

        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-lg border border-slate-200 text-sm font-medium text-slate-800 backdrop-blur-md pointer-events-auto animate-scale-in"
          >
            {icon}
            <span>{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
