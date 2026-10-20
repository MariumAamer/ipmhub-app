// src/api/drawerCache.ts
//
// In-memory cache for the profile drawer. The drawer used to fire five
// requests (profile, email, badge progress, member count, active members)
// on EVERY open, and the server answers them one after another, so it took
// ~15 s each time. Now the data is kept here and only refreshed when stale.
// AppHeader also primes `profile` from the request it already makes, which
// saves one of those calls on the first open. Wiped on logout/login.

import {registerSessionReset} from './sessionReset';

export const DRAWER_TTL_MS = 5 * 60 * 1000;

export interface DrawerCache {
  profile: any | null;
  profileAt: number;
  activeMembers: any[];
  totalMembers: string | null;
  badgeProgress: {unlock_points: number; percentage: number} | null;
  email: string;
  at: number; // when a full refresh last completed
}

const empty = (): DrawerCache => ({
  profile: null,
  profileAt: 0,
  activeMembers: [],
  totalMembers: null,
  badgeProgress: null,
  email: '',
  at: 0,
});

export const drawerCache: DrawerCache = empty();

registerSessionReset(() => {
  Object.assign(drawerCache, empty());
});

export const isDrawerFresh = (): boolean =>
  !!drawerCache.profile && Date.now() - drawerCache.at < DRAWER_TTL_MS;
