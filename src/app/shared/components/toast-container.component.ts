import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

const ICONS: Record<string, string> = {
  success: 'bi-check-circle-fill',
  danger: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1090">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast show mb-2 border-0 shadow" role="alert">
          <div class="toast-header">
            <i class="bi {{ icon(t.kind) }} text-{{ t.kind }} me-2"></i>
            <strong class="me-auto">{{ t.title }}</strong>
            <button type="button" class="btn-close" (click)="svc.dismiss(t.id)"></button>
          </div>
          @if (t.text) {
            <div class="toast-body">{{ t.text }}</div>
          }
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  svc = inject(ToastService);
  icon(kind: string): string {
    return ICONS[kind] ?? ICONS['info'];
  }
}
