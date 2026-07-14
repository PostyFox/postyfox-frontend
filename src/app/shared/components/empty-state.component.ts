import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="text-center py-5">
      <div
        class="stat-icon mx-auto mb-3"
        style="width:4rem;height:4rem;background:rgba(140,87,255,.12)"
      >
        <i class="bi {{ icon }} fs-2 text-primary"></i>
      </div>
      <h6 class="mb-1">{{ title }}</h6>
      @if (text) {
        <p class="text-muted-2 mb-3">{{ text }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'bi-inbox';
  @Input({ required: true }) title = '';
  @Input() text?: string;
}
