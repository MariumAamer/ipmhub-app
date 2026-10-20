// src/api/snapshotCache.ts
//
// "Show the last result instantly, then refresh" for list screens.
// The server takes seconds to answer, so each screen saves the first page it
// last received (default filters only) here; the next time the screen opens
// it renders that straight away while the real request runs, then swaps in
// the fresh data. Kept in memory and in AsyncStorage (so it also survives an
// app restart), capped at 24 h, and wiped on logout/login via sessionReset.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {registerSessionReset} from './sessionReset';

const PREFIX = 'ipm_snap:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const mem = new Map<string, {at: number; data: unknown}>();

export const readSnapshot = async <T>(name: string): Promise<T | null> => {
  const hit = mem.get(name);
  if (hit && Date.now() - hit.at < MAX_AGE_MS) return hit.data as T;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.at > MAX_AGE_MS) return null;
    mem.set(name, parsed);
    return parsed.data as T;
  } catch {
    return null;
  }
};

export const writeSnapshot = (name: string, data: unknown): void => {
  const entry = {at: Date.now(), data};
  mem.set(name, entry);
  // Serialize off the hot path so it never delays rendering the list.
  setTimeout(() => {
    AsyncStorage.setItem(PREFIX + name, JSON.stringify(entry)).catch(() => {});
  }, 0);
};

registerSessionReset(async () => {
  mem.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter(k => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {}
});
