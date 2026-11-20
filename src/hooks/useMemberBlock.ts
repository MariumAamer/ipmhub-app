/**
 * useMemberBlock — the ONE place that holds "who is blocked" for every Block
 * entry point (member profile three dots, DM More Options, feed posts, …) and
 * for Settings → Blocked Members, so they all behave the same: block from
 * anywhere and every other screen showing that member reflects it.
 *
 * Backed by /custom/v1/blocked-members. The list is loaded once per signed-in
 * session (and again whenever Blocked Members opens), cleared on logout via
 * registerSessionReset, and kept in sync locally after each block/unblock.
 *
 * block()/unblock() resolve to null on success or the server's error message,
 * so callers show their toast only when nothing went wrong.
 */
import {useCallback, useEffect, useState} from 'react';
import {registerSessionReset} from '../api/sessionReset';
import {
  blockMember,
  listBlockedMembers,
  unblockMember,
} from '../api/accountApi';

export interface BlockedMember {
  id: number;
  name: string;
  avatarUrl: string;
  title: string; // not provided by the API — kept for the UI, '' for now
  canUnblock: boolean;
}

const blocked = new Map<number, BlockedMember>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

let loaded = false;
let loading: Promise<void> | null = null;
let loadError = '';

registerSessionReset(() => {
  blocked.clear();
  loaded = false;
  loading = null;
  loadError = '';
  emit();
});

const ensureLoaded = (force = false): Promise<void> => {
  if (loading) return loading;
  if (loaded && !force) return Promise.resolve();
  loadError = '';
  loading = listBlockedMembers()
    .then(list => {
      blocked.clear();
      list.forEach(m =>
        blocked.set(m.id, {
          id: m.id,
          name: m.name,
          avatarUrl: m.avatarUrl,
          title: '',
          canUnblock: m.canUnblock,
        }),
      );
      loaded = true;
    })
    .catch((e: any) => {
      loadError = e?.message || 'Could not load blocked members.';
    })
    .finally(() => {
      loading = null;
      emit();
    });
  emit();
  return loading;
};

const useStoreSubscription = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
};

/** Record a block made elsewhere (e.g. from a feed post) in the shared list. */
export const markMemberBlocked = (m: {
  id: number;
  name: string;
  avatarUrl?: string;
  title?: string;
}) => {
  blocked.set(m.id, {
    id: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl || '',
    title: m.title || '',
    canUnblock: true,
  });
  emit();
};

const unblockById = async (id: number): Promise<string | null> => {
  try {
    await unblockMember(id);
    blocked.delete(id);
    emit();
    return null;
  } catch (e: any) {
    return e?.message || 'Could not unblock this member.';
  }
};

/** Block state + actions for ONE member (profile, DM). */
export const useMemberBlock = (userId?: number | string | null) => {
  useStoreSubscription();
  useEffect(() => {
    ensureLoaded();
  }, []);
  const id = userId == null ? null : Number(userId);
  const isBlocked = id != null && blocked.has(id);

  const block = useCallback(
    async (info: Omit<BlockedMember, 'id' | 'canUnblock'>): Promise<string | null> => {
      if (id == null) return 'Member not found.';
      try {
        const m = await blockMember(id);
        markMemberBlocked({
          id,
          name: m.name || info.name,
          avatarUrl: m.avatarUrl || info.avatarUrl,
          title: info.title,
        });
        return null;
      } catch (e: any) {
        return e?.message || 'Could not block this member.';
      }
    },
    [id],
  );

  const unblock = useCallback(
    async (): Promise<string | null> =>
      id == null ? 'Member not found.' : unblockById(id),
    [id],
  );

  return {isBlocked, block, unblock};
};

/** The whole blocked list (Settings → Blocked Members). */
export const useBlockedMembers = () => {
  useStoreSubscription();
  useEffect(() => {
    ensureLoaded(true); // always fresh when the list is opened
  }, []);
  const refresh = useCallback(() => ensureLoaded(true), []);
  return {
    members: Array.from(blocked.values()),
    loading: loading !== null,
    error: loadError,
    refresh,
    unblock: unblockById,
  };
};
