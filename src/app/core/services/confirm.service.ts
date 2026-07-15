import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Contextual colour for the confirm button. */
  kind?: 'primary' | 'danger' | 'warning';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Promise-based confirmation dialog, rendered once by ConfirmDialogComponent. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.current.set({ ...options, resolve });
    });
  }

  respond(ok: boolean): void {
    const req = this.current();
    if (req) {
      req.resolve(ok);
      this.current.set(null);
    }
  }
}
