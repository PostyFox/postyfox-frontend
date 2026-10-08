import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { MarkdownComponent } from 'ngx-markdown';
import { TermsOfService } from '../../core/models/api.models';
import { TermsService } from '../../core/services/terms.service';

/** Public, read-only view of the terms in force. Acceptance happens on /terms (TermsComponent). */
@Component({
  selector: 'app-tos',
  imports: [TranslocoDirective, MarkdownComponent, RouterLink],
  templateUrl: './tos.component.html',
})
export class TosComponent {
  /** undefined while loading, null when no terms are in force. */
  readonly current = signal<TermsOfService | null | undefined>(undefined);
  readonly failed = signal(false);

  constructor() {
    inject(TermsService)
      .getCurrent()
      .subscribe({
        next: (terms) => this.current.set(terms),
        error: () => this.failed.set(true),
      });
  }
}
