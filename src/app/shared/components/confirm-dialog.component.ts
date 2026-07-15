import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (svc.current(); as req) {
      <div class="modal fade show d-block" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ req.title }}</h5>
              <button type="button" class="btn-close" (click)="svc.respond(false)"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">{{ req.message }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="svc.respond(false)">
                {{ req.cancelText || 'Cancel' }}
              </button>
              <button
                type="button"
                class="btn btn-{{ req.kind || 'primary' }}"
                (click)="svc.respond(true)"
              >
                {{ req.confirmText || 'Confirm' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    }
  `,
})
export class ConfirmDialogComponent {
  svc = inject(ConfirmService);
}
