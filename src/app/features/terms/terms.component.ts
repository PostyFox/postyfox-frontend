import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { TermsService } from '../../core/services/terms.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Terms of service acceptance (issue #417). Reached via termsGuard or the interceptor whenever the
 * API refuses a request because the current terms have not been accepted.
 */
@Component({
  selector: 'app-terms',
  imports: [MarkdownComponent, RouterLink],
  templateUrl: './terms.component.html',
})
export class TermsComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly terms = inject(TermsService);
  readonly auth = inject(AuthService);
  readonly account = inject(AccountService);

  readonly accepting = signal(false);

  constructor() {
    this.terms.load().subscribe({
      error: () => this.toast.error('Could not load the terms of service'),
    });
  }

  /** Lets an admin back out of a bad publish without accepting it (the API exempts this call). */
  async turnOff(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Turn off terms of service',
      message: 'Users will no longer need to accept terms to use PostyFox.',
      confirmText: 'Turn off',
      kind: 'danger',
    });
    if (!confirmed) return;

    this.accepting.set(true);
    this.terms.publish('').subscribe({
      next: () => window.location.assign('/admin'),
      error: () => {
        this.accepting.set(false);
        this.toast.error('Could not turn off the terms of service');
      },
    });
  }

  accept(version: number): void {
    this.accepting.set(true);
    this.terms.accept(version).subscribe({
      // Reload so bootstrap data (admin access, accounts) is fetched now that the API allows it.
      next: () => window.location.assign('/'),
      error: (err) => {
        this.accepting.set(false);
        if (err.status === 409) {
          this.toast.warning(
            'The terms have just been updated',
            'Please review the latest version.',
          );
          this.terms.load().subscribe();
        } else {
          this.toast.error('Could not record your acceptance');
        }
      },
    });
  }
}
