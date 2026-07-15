import { Component, Input } from '@angular/core';
import { StatusMeta } from '../../core/models/status.util';

@Component({
  selector: 'app-status-badge',
  template: `
    @if (meta) {
      <span class="badge bg-label-{{ meta.color }} d-inline-flex align-items-center gap-1">
        <i class="bi {{ meta.icon }}"></i>{{ meta.label }}
      </span>
    }
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) meta!: StatusMeta;
}
