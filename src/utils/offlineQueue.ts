import type { QueuedAction } from '../types/dropp';

const BLOCKED_OFFLINE_ACTIONS = new Set([
  'order_create',
  'payment_confirm',
  'wallet_debit',
  'wallet_withdraw',
]);

/**
 * Payments and orders must NEVER be confirmed offline.
 */
export function canQueueActionOffline(actionType: string): boolean {
  return !BLOCKED_OFFLINE_ACTIONS.has(actionType);
}

/**
 * Enqueues an offline social interaction (like, comment, bookmark, follow).
 * Toggle actions on the same target replace earlier pending toggles to prevent duplicate flips.
 */
export function enqueueOfflineAction(
  queue: QueuedAction[],
  newAction: Omit<QueuedAction, 'status' | 'attempts'>
): QueuedAction[] {
  if (!canQueueActionOffline(newAction.type)) {
    throw new Error(`Action "${newAction.type}" cannot be queued offline.`);
  }

  const isToggle = newAction.type !== 'comment_create';
  const filtered = isToggle
    ? queue.filter(
        (item) =>
          !(
            item.type === newAction.type &&
            item.targetId === newAction.targetId &&
            item.status !== 'sent'
          )
      )
    : queue;

  return [
    ...filtered,
    {
      ...newAction,
      status: 'pending',
      attempts: 0,
    },
  ];
}

export function markQueuedActionStatus(
  queue: QueuedAction[],
  id: string,
  status: QueuedAction['status']
): QueuedAction[] {
  return queue.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      status,
      attempts: status === 'failed' ? item.attempts + 1 : item.attempts,
    };
  });
}

export function getRetryableActions(queue: QueuedAction[], maxAttempts = 4): QueuedAction[] {
  return queue.filter(
    (item) =>
      item.status === 'pending' ||
      (item.status === 'failed' && item.attempts < maxAttempts)
  );
}
