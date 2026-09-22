import { DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AccountInvite, AccountMember, InviteStatus } from '../../core/models/api.models';
import { AccountService } from '../../core/services/account.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

/**
 * Account delegation (issue #409): invite someone by email to manage your account, see who's
 * accepted, and accept invitations addressed to you. Also doubles as the emailed invite link's
 * landing page — `?token=` (bound via withComponentInputBinding) triggers acceptance on load.
 */
@Component({
  selector: 'app-access',
  imports: [FormsModule, DatePipe, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './access.component.html',
})
export class AccessComponent implements OnInit {
  private account = inject(AccountService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);

  @Input() token?: string;

  readonly InviteStatus = InviteStatus;

  readonly loading = signal(true);
  readonly inviting = signal(false);
  readonly newEmail = signal('');
  readonly sentInvites = signal<AccountInvite[]>([]);
  readonly pendingInvites = signal<AccountInvite[]>([]);
  readonly members = signal<AccountMember[]>([]);

  ngOnInit(): void {
    if (this.token) {
      this.acceptFromLink(this.token);
    }
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // Each list fails independently (caught to []) so one bad response doesn't blank the whole page.
    forkJoin({
      sent: this.account.listSentInvites().pipe(catchError(() => of([] as AccountInvite[]))),
      pending: this.account.listPendingInvites().pipe(catchError(() => of([] as AccountInvite[]))),
      members: this.account.listMembers().pipe(catchError(() => of([] as AccountMember[]))),
    }).subscribe(({ sent, pending, members }) => {
      this.sentInvites.set(sent);
      this.pendingInvites.set(pending);
      this.members.set(members);
      this.loading.set(false);
    });
  }

  private acceptFromLink(token: string): void {
    this.account.acceptInvite(token).subscribe({
      next: () => {
        this.toast.success(
          'Invite accepted',
          'You can now switch to that account from the profile menu.',
        );
        this.account.loadAccounts().subscribe();
        // Drop the token from the URL so a refresh doesn't try to re-accept it.
        this.router.navigate([], { queryParams: {} });
      },
      error: (err) => this.toast.error('Could not accept invite', err?.error?.error ?? undefined),
    });
  }

  invite(): void {
    const email = this.newEmail().trim();
    if (!email) return;
    this.inviting.set(true);
    this.account.inviteMember(email).subscribe({
      next: () => {
        this.toast.success(
          'Invite sent',
          `${email} will get an email with instructions to accept.`,
        );
        this.newEmail.set('');
        this.inviting.set(false);
        this.load();
      },
      error: (err) => {
        this.toast.error('Could not send invite', err?.error?.error ?? undefined);
        this.inviting.set(false);
      },
    });
  }

  async revoke(invite: AccountInvite): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Revoke invite',
      message: `Revoke the invite sent to ${invite.inviteeEmail}?`,
      confirmText: 'Revoke',
      kind: 'danger',
    });
    if (!ok) return;
    this.account.revokeInvite(invite.id).subscribe({
      next: () => {
        this.toast.success('Invite revoked');
        this.load();
      },
      error: () => this.toast.error('Could not revoke invite'),
    });
  }

  accept(invite: AccountInvite): void {
    this.account.acceptInviteById(invite.id).subscribe({
      next: () => {
        this.toast.success(
          'Invite accepted',
          'You can now switch to that account from the profile menu.',
        );
        this.account.loadAccounts().subscribe();
        this.load();
      },
      error: (err) => this.toast.error('Could not accept invite', err?.error?.error ?? undefined),
    });
  }

  async removeMember(member: AccountMember): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remove access',
      message: `Remove ${member.memberEmail}'s access to your account?`,
      confirmText: 'Remove',
      kind: 'danger',
    });
    if (!ok) return;
    this.account.removeMember(member.memberUserId).subscribe({
      next: () => {
        this.toast.success('Access removed');
        this.load();
      },
      error: () => this.toast.error('Could not remove access'),
    });
  }

  statusLabel(invite: AccountInvite): string {
    if (invite.status === InviteStatus.Accepted) return 'Accepted';
    if (invite.status === InviteStatus.Revoked) return 'Revoked';
    return invite.isExpired ? 'Expired' : 'Pending';
  }
}
