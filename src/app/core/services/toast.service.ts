import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'danger' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  text?: string;
}

/** Lightweight app-wide toast notifications, rendered by ToastContainerComponent. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(kind: ToastKind, title: string, text?: string, timeoutMs = 5000): void {
    const id = ++this.seq;
    this.toasts.update((t) => [...t, { id, kind, title, text }]);
    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(id), timeoutMs);
    }
  }

  success(title: string, text?: string): void {
    this.show('success', title, text);
  }

  error(title: string, text?: string): void {
    this.show('danger', title, text, 8000);
  }

  info(title: string, text?: string): void {
    this.show('info', title, text);
  }

  warning(title: string, text?: string): void {
    this.show('warning', title, text);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
