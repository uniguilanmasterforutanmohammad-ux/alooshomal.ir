import { create } from 'zustand';

export type ToastTone = 'error' | 'success' | 'info' | 'warning';

export interface Toast {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
  /** milliseconds before auto-dismiss */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/** Every message stays for 10 seconds unless the user closes it sooner. */
export const TOAST_DURATION = 10000;

let counter = 0;

/**
 * Global, app-wide message bubbles ("toast"). The `api` layer pushes errors
 * here automatically and pages can push success/info messages manually, so a
 * failure is always visible as a dismissible bubble for 10 seconds.
 */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ tone, title, message, duration = TOAST_DURATION }) => {
    // collapse identical, still-visible messages (polls can re-fire an error)
    const existing = get().toasts.find(
      (toast) => toast.message === message && toast.tone === tone,
    );
    if (existing) {
      return existing.id;
    }
    const id = `toast-${Date.now()}-${counter++}`;
    set((state) => ({ toasts: [...state.toasts, { id, tone, title, message, duration }] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  error: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'error', message, title }),
  success: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'success', message, title }),
  info: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'info', message, title }),
  warning: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'warning', message, title }),
};
