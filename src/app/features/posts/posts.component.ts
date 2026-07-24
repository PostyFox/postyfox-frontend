import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription, switchMap, timer } from 'rxjs';
import { PostSummary } from '../../core/models/api.models';
import { brandFor } from '../../core/models/platforms';
import { ROOT_STATUS_META, isRootStatusPending } from '../../core/models/status.util';
import { ConfirmService } from '../../core/services/confirm.service';
import { PostsService } from '../../core/services/posts.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

/**
 * Posts / activity view. Shows what's being processed *right now* (auto-refreshing while anything is
 * in flight) plus the recent history the backend retains — so a user who navigated away from the
 * compose screen can always find an in-progress post again.
 */
@Component({
  selector: 'app-posts',
  imports: [RouterLink, DatePipe, PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './posts.component.html',
})
export class PostsComponent implements OnInit, OnDestroy {
  private posts = inject(PostsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  private sub?: Subscription;

  readonly all = signal<PostSummary[]>([]);
  readonly loading = signal(true);
  readonly polling = signal(false);
  /** Post ids with an action in flight, so their row buttons disable/spin. */
  readonly busy = signal<Set<string>>(new Set());
  brand = brandFor;

  readonly active = computed(() => this.all().filter((p) => isRootStatusPending(p.rootStatus)));
  readonly history = computed(() => this.all().filter((p) => !isRootStatusPending(p.rootStatus)));

  rootMeta(p: PostSummary) {
    return ROOT_STATUS_META[p.rootStatus];
  }

  isBusy(id: string): boolean {
    return this.busy().has(id);
  }

  private setBusy(id: string, on: boolean): void {
    this.busy.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Cancel the parts of a post that haven't gone out yet. */
  async cancel(p: PostSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cancel post',
      message: `Cancel “${p.title || 'Untitled post'}”? Targets that haven't been sent yet will be stopped; anything already delivered stays.`,
      confirmText: 'Cancel post',
      cancelText: 'Keep',
      kind: 'warning',
    });
    if (!ok) return;
    this.setBusy(p.postId, true);
    this.posts.cancel(p.postId).subscribe({
      next: () => {
        this.toast.success('Post cancelled');
        this.setBusy(p.postId, false);
        this.reload();
      },
      error: (err) => {
        this.setBusy(p.postId, false);
        this.toast.error(
          'Could not cancel post',
          err?.status === 409 ? 'It already finished processing.' : undefined,
        );
        this.reload();
      },
    });
  }

  /** Permanently delete a post (history entry or stale/orphaned queued row). */
  async remove(p: PostSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete post',
      message: `Permanently delete “${p.title || 'Untitled post'}”? This removes it and its stored content for good.`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!ok) return;
    this.setBusy(p.postId, true);
    this.posts.delete(p.postId).subscribe({
      next: () => {
        this.toast.success('Post deleted');
        // Optimistically drop it; the next poll reconciles anyway.
        this.all.update((rows) => rows.filter((r) => r.postId !== p.postId));
        this.setBusy(p.postId, false);
      },
      error: () => {
        this.setBusy(p.postId, false);
        this.toast.error('Could not delete post');
        this.reload();
      },
    });
  }

  /** Open the composer pre-filled with a fresh copy of this post's content ("post again"). */
  recreate(p: PostSummary): void {
    this.setBusy(p.postId, true);
    this.posts.duplicate(p.postId).subscribe({
      next: (prefill) => {
        this.setBusy(p.postId, false);
        this.router.navigate(['/compose'], { state: { prefill } });
      },
      error: () => {
        this.setBusy(p.postId, false);
        this.toast.error('Could not load that post to reuse');
      },
    });
  }

  /** One-off refresh outside the poll cadence, after an action. */
  private reload(): void {
    this.posts.list(undefined, 100).subscribe({
      next: (rows) => this.all.set(rows),
      error: () => undefined,
    });
  }

  ngOnInit(): void {
    // Poll every 5s so in-flight posts update live; the list also drives the "Active now" section.
    this.sub = timer(0, 5000)
      .pipe(switchMap(() => this.posts.list(undefined, 100)))
      .subscribe({
        next: (rows) => {
          this.all.set(rows);
          this.loading.set(false);
          this.polling.set(rows.some((p) => isRootStatusPending(p.rootStatus)));
        },
        error: () => {
          this.loading.set(false);
          this.polling.set(false);
          this.toast.error('Could not load your posts');
        },
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
