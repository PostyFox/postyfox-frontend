import { PostRootStatus, TargetStatus } from './api.models';

export interface StatusMeta {
  label: string;
  /** Bootstrap contextual colour name used for `bg-label-*` tonal badges. */
  color: 'secondary' | 'info' | 'primary' | 'success' | 'warning' | 'danger';
  icon: string;
}

export const ROOT_STATUS_META: Record<PostRootStatus, StatusMeta> = {
  [PostRootStatus.Queued]: { label: 'Queued', color: 'secondary', icon: 'bi-hourglass' },
  [PostRootStatus.Generating]: { label: 'Generating', color: 'info', icon: 'bi-magic' },
  [PostRootStatus.Delivering]: { label: 'Delivering', color: 'primary', icon: 'bi-send' },
  [PostRootStatus.Delivered]: { label: 'Delivered', color: 'success', icon: 'bi-check-circle' },
  [PostRootStatus.PartiallyFailed]: {
    label: 'Partially failed',
    color: 'warning',
    icon: 'bi-exclamation-triangle',
  },
  [PostRootStatus.Failed]: { label: 'Failed', color: 'danger', icon: 'bi-x-circle' },
  [PostRootStatus.Cancelled]: { label: 'Cancelled', color: 'secondary', icon: 'bi-slash-circle' },
};

export const TARGET_STATUS_META: Record<TargetStatus, StatusMeta> = {
  [TargetStatus.Queued]: { label: 'Queued', color: 'secondary', icon: 'bi-hourglass' },
  [TargetStatus.Generating]: { label: 'Generating', color: 'info', icon: 'bi-magic' },
  [TargetStatus.Ready]: { label: 'Ready', color: 'info', icon: 'bi-check2' },
  [TargetStatus.Delivering]: { label: 'Delivering', color: 'primary', icon: 'bi-send' },
  [TargetStatus.Delivered]: { label: 'Delivered', color: 'success', icon: 'bi-check-circle' },
  [TargetStatus.Failed]: { label: 'Failed', color: 'danger', icon: 'bi-x-circle' },
  [TargetStatus.Cancelled]: { label: 'Cancelled', color: 'secondary', icon: 'bi-slash-circle' },
};

/** A root status is still in-flight (worth polling). */
export function isRootStatusPending(s: PostRootStatus): boolean {
  return (
    s === PostRootStatus.Queued ||
    s === PostRootStatus.Generating ||
    s === PostRootStatus.Delivering
  );
}
