import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, switchMap, timer } from 'rxjs';
import { PostStatus, PostTargetStatus } from '../../core/models/api.models';
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
  imports: [RouterLink, PageHeaderComponent, StatusBadgeComponent],
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

  readonly rootMeta = computed(() => {
    const s = this.status();
    return s ? ROOT_STATUS_META[s.rootStatus] : null;
  });

  targetMeta(t: PostTargetStatus) {
    return TARGET_STATUS_META[t.status];
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
            this.toast.error('Could not load post status');
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
