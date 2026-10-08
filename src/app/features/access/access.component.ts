import { DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
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
  imports: [TranslocoDirective, FormsModule, DatePipe, PageHeaderComponent, EmptyStateComponent],
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
          translate('access.inviteAccepted'),
          translate('access.canNowSwitchAccount'),
        );
        this.account.loadAccounts().subscribe();
        // Drop the token from the URL so a refresh doesn't try to re-accept it.
        this.router.navigate([], { queryParams: {} });
      },
      error: (err) =>
        this.toast.error(translate('access.couldNotAcceptInvite'), err?.error?.error ?? undefined),
    });
  }

  invite(): void {
    const email = this.newEmail().trim();
    if (!email) return;
    this.inviting.set(true);
    this.account.inviteMember(email).subscribe({
      next: () => {
        this.toast.success(
          translate('access.inviteSent'),
          translate('access.willGetEmailInstructions', { email }),
        );
        this.newEmail.set('');
        this.inviting.set(false);
        this.load();
      },
      error: (err) => {
        this.toast.error(translate('access.couldNotSendInvite'), err?.error?.error ?? undefined);
        this.inviting.set(false);
      },
    });
  }

  async revoke(invite: AccountInvite): Promise<void> {
    const ok = await this.confirm.ask({
      title: translate('access.revokeInvite'),
      message: translate('access.revokeInviteSent', { inviteeEmail: invite.inviteeEmail }),
      confirmText: translate('access.revoke'),
      kind: 'danger',
    });
    if (!ok) return;
    this.account.revokeInvite(invite.id).subscribe({
      next: () => {
        this.toast.success(translate('access.inviteRevoked'));
        this.load();
      },
      error: () => this.toast.error(translate('access.couldNotRevokeInvite')),
    });
  }

  accept(invite: AccountInvite): void {
    this.account.acceptInviteById(invite.id).subscribe({
      next: () => {
        this.toast.success(
          translate('access.inviteAccepted'),
          translate('access.canNowSwitchAccount'),
        );
        this.account.loadAccounts().subscribe();
        this.load();
      },
      error: (err) =>
        this.toast.error(translate('access.couldNotAcceptInvite'), err?.error?.error ?? undefined),
    });
  }

  async removeMember(member: AccountMember): Promise<void> {
    const ok = await this.confirm.ask({
      title: translate('access.removeAccess'),
      message: translate('access.removeSAccessAccount', { memberEmail: member.memberEmail }),
      confirmText: translate('access.remove'),
      kind: 'danger',
    });
    if (!ok) return;
    this.account.removeMember(member.memberUserId).subscribe({
      next: () => {
        this.toast.success(translate('access.accessRemoved'));
        this.load();
      },
      error: () => this.toast.error(translate('access.couldNotRemoveAccess')),
    });
  }

  statusLabel(invite: AccountInvite): string {
    if (invite.status === InviteStatus.Accepted) return translate('access.accepted');
    if (invite.status === InviteStatus.Revoked) return translate('access.revoked');
    return invite.isExpired ? translate('access.expired') : translate('access.pending');
  }
}
