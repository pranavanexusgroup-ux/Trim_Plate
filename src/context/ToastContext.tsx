import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  title: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface ToastContextValue {
  showToast: (title: string, type?: 'success' | 'error' | 'info') => void;
  requestConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((title: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const requestConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmDialog(options);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, requestConfirm }}>
      {children}

      {/* Toast Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 bg-[#123B16] text-white px-4 py-3 rounded-xl shadow-lg border border-white/10 transition-all duration-150"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#8CCB16] shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0" />}
            <span className="text-sm font-medium leading-snug flex-1">{t.title}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="p-1 text-white/70 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EEEEEE]">
            <h3 className="text-lg font-bold text-[#202124]">{confirmDialog.title}</h3>
            <p className="text-sm text-[#777777] mt-2 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#202124] bg-[#F5F6F7] hover:bg-[#EAECEF] transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  fn();
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors whitespace-nowrap ${
                  confirmDialog.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0B8F4D] hover:bg-[#09773F]'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
