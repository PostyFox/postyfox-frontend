import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, switchMap, timer } from 'rxjs';
import { PostSummary } from '../../core/models/api.models';
import { brandFor } from '../../core/models/platforms';
import { ROOT_STATUS_META, isRootStatusPending } from '../../core/models/status.util';
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
  private sub?: Subscription;

  readonly all = signal<PostSummary[]>([]);
  readonly loading = signal(true);
  readonly polling = signal(false);
  brand = brandFor;

  readonly active = computed(() => this.all().filter((p) => isRootStatusPending(p.rootStatus)));
  readonly history = computed(() => this.all().filter((p) => !isRootStatusPending(p.rootStatus)));

  rootMeta(p: PostSummary) {
    return ROOT_STATUS_META[p.rootStatus];
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
