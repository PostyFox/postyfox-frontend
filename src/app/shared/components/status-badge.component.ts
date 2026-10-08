import { Component, Input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StatusMeta } from '../../core/models/status.util';

@Component({
  selector: 'app-status-badge',
  imports: [TranslocoPipe],
  template: `
    @if (meta) {
      <span class="badge bg-label-{{ meta.color }} d-inline-flex align-items-center gap-1">
        <i class="bi {{ meta.icon }}"></i>{{ meta.label | transloco }}
      </span>
    }
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) meta!: StatusMeta;
}
