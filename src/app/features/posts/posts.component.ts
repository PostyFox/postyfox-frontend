import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { Subscription, switchMap, timer } from 'rxjs';
import { PostSummary } from '../../core/models/api.models';
import { brandFor } from '../../core/models/platforms';
import {
  ROOT_STATUS_META,
  isRootStatusDraft,
  isRootStatusPending,
} from '../../core/models/status.util';
import { ConfirmService } from '../../core/services/confirm.service';
import { PostsService } from '../../core/services/posts.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

const SCHEDULED_VIEW_STORAGE_KEY = 'postyfox.scheduledView';

type ScheduledView = 'list' | 'calendar';

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  today: boolean;
  posts: PostSummary[];
}

/**
 * Posts / activity view. Shows what's being processed *right now* (auto-refreshing while anything is
 * in flight) plus the recent history the backend retains, so a user who navigated away from the
 * compose screen can always find an in-progress post again.
 */
@Component({
  selector: 'app-posts',
  imports: [
    TranslocoDirective,
    RouterLink,
    DatePipe,
    NgTemplateOutlet,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
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
  readonly clearingHistory = signal(false);
  /** Post ids with an action in flight, so their row buttons disable/spin. */
  readonly busy = signal<Set<string>>(new Set());
  brand = brandFor;

  readonly scheduledView = signal<ScheduledView>(readStoredView());
  /** First day of the month the calendar is showing. */
  readonly calendarMonth = signal(startOfMonth(new Date()));

  /** Submitted posts waiting for a future `postAt`, soonest first. */
  readonly scheduled = computed(() =>
    this.all()
      .filter((p) => this.isScheduled(p))
      .sort((a, b) => Date.parse(a.postAt!) - Date.parse(b.postAt!)),
  );
  readonly active = computed(() =>
    this.all().filter((p) => isRootStatusPending(p.rootStatus) && !this.isScheduled(p)),
  );
  /** The calendar only earns its place once there's more than one scheduled post. */
  readonly showCalendar = computed(
    () => this.scheduled().length > 1 && this.scheduledView() === 'calendar',
  );
  readonly calendarWeeks = computed(() =>
    buildCalendar(this.calendarMonth(), this.scheduled(), new Date()),
  );
  readonly drafts = computed(() => this.all().filter((p) => isRootStatusDraft(p.rootStatus)));
  readonly history = computed(() =>
    this.all().filter(
      (p) => !isRootStatusPending(p.rootStatus) && !isRootStatusDraft(p.rootStatus),
    ),
  );

  isScheduled(p: PostSummary): boolean {
    return (
      isRootStatusPending(p.rootStatus) && p.postAt !== null && Date.parse(p.postAt) > Date.now()
    );
  }

  setScheduledView(view: ScheduledView): void {
    this.scheduledView.set(view);
    try {
      localStorage.setItem(SCHEDULED_VIEW_STORAGE_KEY, view);
    } catch {
      // Storage unavailable (private mode): the choice just won't survive a reload.
    }
  }

  /** Move the calendar by `delta` months; 0 returns to the current month. */
  shiftMonth(delta: number): void {
    const m = this.calendarMonth();
    this.calendarMonth.set(
      delta === 0 ? startOfMonth(new Date()) : new Date(m.getFullYear(), m.getMonth() + delta, 1),
    );
  }

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
      title: translate('posts.cancelPost'),
      message: translate('posts.cancelTargetsHaventBeen', {
        title: p.title || translate('posts.untitledPost'),
      }),
      confirmText: translate('posts.cancelPost'),
      cancelText: translate('posts.keep'),
      kind: 'warning',
    });
    if (!ok) return;
    this.setBusy(p.postId, true);
    this.posts.cancel(p.postId).subscribe({
      next: () => {
        this.toast.success(translate('posts.postCancelled'));
        this.setBusy(p.postId, false);
        this.reload();
      },
      error: (err) => {
        this.setBusy(p.postId, false);
        this.toast.error(
          translate('posts.couldNotCancelPost'),
          err?.status === 409 ? translate('posts.alreadyFinishedProcessing') : undefined,
        );
        this.reload();
      },
    });
  }

  /** Permanently delete a post (history entry or stale/orphaned queued row). */
  async remove(p: PostSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: translate('posts.deletePost2'),
      message: translate('posts.permanentlyDeleteRemovesIts', {
        title: p.title || translate('posts.untitledPost'),
      }),
      confirmText: translate('posts.delete'),
      kind: 'danger',
    });
    if (!ok) return;
    this.setBusy(p.postId, true);
    this.posts.delete(p.postId).subscribe({
      next: () => {
        this.toast.success(translate('posts.postDeleted'));
        // Optimistically drop it; the next poll reconciles anyway.
        this.all.update((rows) => rows.filter((r) => r.postId !== p.postId));
        this.setBusy(p.postId, false);
      },
      error: () => {
        this.setBusy(p.postId, false);
        this.toast.error(translate('posts.couldNotDeletePost'));
        this.reload();
      },
    });
  }

  /** Permanently delete every terminal post at once. Active posts and drafts are untouched. */
  async clearHistory(): Promise<void> {
    const count = this.history().length;
    if (count === 0) return;
    const ok = await this.confirm.ask({
      title: translate('posts.clearHistory'),
      message:
        count === 1
          ? translate('posts.clearHistoryConfirmOne')
          : translate('posts.clearHistoryConfirmOther', { count }),
      confirmText: translate('posts.deleteAll'),
      kind: 'danger',
    });
    if (!ok) return;
    this.clearingHistory.set(true);
    this.posts.deleteAllHistory().subscribe({
      next: ({ deletedCount }) => {
        this.clearingHistory.set(false);
        this.toast.success(
          deletedCount === 1
            ? translate('posts.deletedPostsOne')
            : translate('posts.deletedPostsOther', { count: deletedCount }),
        );
        this.reload();
      },
      error: () => {
        this.clearingHistory.set(false);
        this.toast.error(translate('posts.couldNotClearHistory'));
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
        this.toast.error(translate('posts.couldNotLoadPost'));
      },
    });
  }

  /** Open the composer to keep editing a draft (unlike "post again", edits save back to the same post). */
  edit(p: PostSummary): void {
    this.setBusy(p.postId, true);
    this.posts.getContent(p.postId).subscribe({
      next: (prefill) => {
        this.setBusy(p.postId, false);
        this.router.navigate(['/compose'], { state: { prefill, draftId: p.postId } });
      },
      error: () => {
        this.setBusy(p.postId, false);
        this.toast.error(translate('posts.couldNotLoadDraft'));
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
          // Scheduled posts are pending too, but nothing is happening to them yet.
          this.polling.set(this.active().length > 0);
        },
        error: () => {
          this.loading.set(false);
          this.polling.set(false);
          this.toast.error(translate('posts.couldNotLoadPosts'));
        },
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

function readStoredView(): ScheduledView {
  try {
    return localStorage.getItem(SCHEDULED_VIEW_STORAGE_KEY) === 'calendar' ? 'calendar' : 'list';
  } catch {
    return 'list';
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Monday-first weeks covering `month`, padded with the neighbouring months' days. Posts land on
 * the local day of their `postAt`; `posts` is assumed already sorted by time.
 */
export function buildCalendar(month: Date, posts: PostSummary[], today: Date): CalendarDay[][] {
  const byDay = new Map<string, PostSummary[]>();
  for (const p of posts) {
    const key = dayKey(new Date(p.postAt!));
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }

  const first = startOfMonth(month);
  const cursor = new Date(first);
  cursor.setDate(1 - ((first.getDay() + 6) % 7));

  const weeks: CalendarDay[][] = [];
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor);
      week.push({
        date,
        inMonth: date.getMonth() === first.getMonth(),
        today: dayKey(date) === dayKey(today),
        posts: byDay.get(dayKey(date)) ?? [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === first.getMonth());
  return weeks;
}
