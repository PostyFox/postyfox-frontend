import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { Subscription, switchMap, timer } from 'rxjs';
import {
  AutomationAction,
  AutomationStatus,
  ContentRating,
  PostStatus,
  PostTargetAutomation,
  PostTargetStatus,
} from '../../core/models/api.models';
import { contentRatingOptions } from '../../core/models/platforms';
import {
  ROOT_STATUS_META,
  TARGET_STATUS_META,
  isRootStatusPending,
} from '../../core/models/status.util';
import { PostsService } from '../../core/services/posts.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'app-post-status',
  imports: [TranslocoDirective, RouterLink, PageHeaderComponent, StatusBadgeComponent],
  templateUrl: './post-status.component.html',
})
export class PostStatusComponent implements OnInit, OnDestroy {
  /** Bound from the `:id` route param (withComponentInputBinding). */
  @Input() id!: string;

  private posts = inject(PostsService);
  private toast = inject(ToastService);
  private sub?: Subscription;

  readonly status = signal<PostStatus | null>(null);
  readonly loading = signal(true);
  readonly polling = signal(false);
  readonly notFound = signal(false);
  /** Automation ids with a cancel in flight, so their button disables/spins. */
  readonly cancellingAutomation = signal<Set<string>>(new Set());
  readonly automationStatus = AutomationStatus;

  readonly rootMeta = computed(() => {
    const s = this.status();
    return s ? ROOT_STATUS_META[s.rootStatus] : null;
  });

  targetMeta(t: PostTargetStatus) {
    return TARGET_STATUS_META[t.status];
  }

  ratingLabel(rating: ContentRating | null): string | null {
    const key = contentRatingOptions.find((o) => o.value === rating)?.label;
    return key ? translate(key) : null;
  }

  automationActionLabel(action: AutomationAction): string {
    return action === AutomationAction.Repost
      ? translate('postStatus.repost')
      : translate('postStatus.delete');
  }

  isCancellingAutomation(id: string): boolean {
    return this.cancellingAutomation().has(id);
  }

  /** Cancels a not-yet-executed automation rule (issue #323). */
  cancelAutomation(postId: string, automation: PostTargetAutomation): void {
    this.cancellingAutomation.update((s) => new Set(s).add(automation.id));
    this.posts.cancelAutomation(postId, automation.id).subscribe({
      next: () => {
        this.toast.success(translate('postStatus.automationCancelled'));
        this.refreshOnce();
      },
      error: (err) => {
        this.cancellingAutomation.update((s) => {
          const next = new Set(s);
          next.delete(automation.id);
          return next;
        });
        this.toast.error(
          translate('postStatus.couldNotCancelAutomation'),
          err?.status === 409 ? translate('postStatus.alreadyRanWasAlready') : undefined,
        );
      },
    });
  }

  /** One-off refresh outside the poll cadence, after cancelling an automation. */
  private refreshOnce(): void {
    this.posts.getStatus(this.id).subscribe({
      next: (s) => {
        this.status.set(s);
        this.cancellingAutomation.set(new Set());
      },
      error: () => undefined,
    });
  }

  ngOnInit(): void {
    // Poll every 3s while the post is still in flight; stop once terminal.
    this.sub = timer(0, 3000)
      .pipe(switchMap(() => this.posts.getStatus(this.id)))
      .subscribe({
        next: (s) => {
          this.status.set(s);
          this.loading.set(false);
          const pending = isRootStatusPending(s.rootStatus);
          this.polling.set(pending);
          if (!pending) this.stop();
        },
        error: (err) => {
          this.loading.set(false);
          this.polling.set(false);
          if (err?.status === 404) {
            this.notFound.set(true);
          } else {
            this.toast.error(translate('postStatus.couldNotLoadPost'));
          }
          this.stop();
        },
      });
  }

  private stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
