/**
 * App-wide blocking states reported by the API: maintenance (503
 * `code: "maintenance"` or `/app-config` maintenance_mode) and a required
 * update (426 `code: "update_required"` or `/app-config` min_app_version).
 *
 * A tiny external store: `lib/api.ts` reports into it from any request, and
 * the root `AppGate` renders the full-screen pages from it.
 */
import { useSyncExternalStore } from 'react';

export interface StoreUrls {
  android_store_url?: string | null;
  ios_store_url?: string | null;
}

export interface AppStatus {
  maintenance: { message: string | null } | null;
  updateRequired: (StoreUrls & { message: string | null; min_app_version?: string | null }) | null;
}

let state: AppStatus = { maintenance: null, updateRequired: null };
const listeners = new Set<() => void>();

function set(next: Partial<AppStatus>) {
  const merged = { ...state, ...next };
  if (merged.maintenance === state.maintenance && merged.updateRequired === state.updateRequired) return;
  state = merged;
  listeners.forEach((fn) => fn());
}

export function getAppStatus(): AppStatus {
  return state;
}

export function subscribeAppStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function reportMaintenance(message: string | null): void {
  if (state.maintenance && state.maintenance.message === message) return;
  set({ maintenance: { message } });
}

export function clearMaintenance(): void {
  if (state.maintenance) set({ maintenance: null });
}

export function reportUpdateRequired(info: AppStatus['updateRequired'] & object): void {
  const cur = state.updateRequired;
  if (
    cur &&
    cur.message === info.message &&
    cur.android_store_url === info.android_store_url &&
    cur.ios_store_url === info.ios_store_url
  )
    return;
  set({ updateRequired: { ...cur, ...info } });
}

export function clearUpdateRequired(): void {
  if (state.updateRequired) set({ updateRequired: null });
}

export function useAppStatus(): AppStatus {
  return useSyncExternalStore(subscribeAppStatus, getAppStatus, getAppStatus);
}
