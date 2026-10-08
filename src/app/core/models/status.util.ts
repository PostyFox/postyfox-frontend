import { PostRootStatus, TargetStatus } from './api.models';

export interface StatusMeta {
  /** Translation key. */
  label: string;
  /** Bootstrap contextual colour name used for `bg-label-*` tonal badges. */
  color: 'secondary' | 'info' | 'primary' | 'success' | 'warning' | 'danger';
  icon: string;
}

export const ROOT_STATUS_META: Record<PostRootStatus, StatusMeta> = {
  [PostRootStatus.Queued]: { label: 'status.queued', color: 'secondary', icon: 'bi-hourglass' },
  [PostRootStatus.Generating]: { label: 'status.generating', color: 'info', icon: 'bi-magic' },
  [PostRootStatus.Delivering]: { label: 'status.delivering', color: 'primary', icon: 'bi-send' },
  [PostRootStatus.Delivered]: {
    label: 'status.delivered',
    color: 'success',
    icon: 'bi-check-circle',
  },
  [PostRootStatus.PartiallyFailed]: {
    label: 'status.partiallyFailed',
    color: 'warning',
    icon: 'bi-exclamation-triangle',
  },
  [PostRootStatus.Failed]: { label: 'status.failed', color: 'danger', icon: 'bi-x-circle' },
  [PostRootStatus.Cancelled]: {
    label: 'status.cancelled',
    color: 'secondary',
    icon: 'bi-slash-circle',
  },
  [PostRootStatus.Draft]: { label: 'status.draft', color: 'secondary', icon: 'bi-pencil-square' },
};

export const TARGET_STATUS_META: Record<TargetStatus, StatusMeta> = {
  [TargetStatus.Queued]: { label: 'status.queued', color: 'secondary', icon: 'bi-hourglass' },
  [TargetStatus.Generating]: { label: 'status.generating', color: 'info', icon: 'bi-magic' },
  [TargetStatus.Ready]: { label: 'status.ready', color: 'info', icon: 'bi-check2' },
  [TargetStatus.Delivering]: { label: 'status.delivering', color: 'primary', icon: 'bi-send' },
  [TargetStatus.Delivered]: {
    label: 'status.delivered',
    color: 'success',
    icon: 'bi-check-circle',
  },
  [TargetStatus.Failed]: { label: 'status.failed', color: 'danger', icon: 'bi-x-circle' },
  [TargetStatus.Cancelled]: {
    label: 'status.cancelled',
    color: 'secondary',
    icon: 'bi-slash-circle',
  },
};

/** A root status is still in-flight (worth polling). */
export function isRootStatusPending(s: PostRootStatus): boolean {
  return (
    s === PostRootStatus.Queued ||
    s === PostRootStatus.Generating ||
    s === PostRootStatus.Delivering
  );
}

/** A draft has never been submitted: it belongs in its own section, not history or "active now". */
export function isRootStatusDraft(s: PostRootStatus): boolean {
  return s === PostRootStatus.Draft;
}
