/**
 * Autosaved "Vendre" draft (Zeigarnik: unfinished listing resurfaces on Home
 * as "Terminer votre annonce"). Local only — stored in AsyncStorage, never
 * sent to the backend until the user publishes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryOptions, QueryClient } from '@tanstack/react-query';

export const SELL_DRAFT_KEY = 'bondeal.sell.draft.v1';
export const SELL_DRAFT_QUERY_KEY = ['sell-draft'] as const;

/** Steps of the sell flow: Photos → Vérifier → Aperçu (docs/11 §4.3). */
export const SELL_STEP_COUNT = 3;
/** Draft format: 2 = 3-step flow. Version-less drafts were saved by the 4-step flow. */
const DRAFT_VERSION = 2;
/** 4-step positions (Photos, Détails, Prix, Aperçu) → 3-step ones. */
const FROM_FOUR_STEPS = [0, 1, 1, 2];

/** Clamp a saved step into the current flow, migrating 4-step drafts. */
export function normalizeDraftStep(step: unknown, version: unknown): number {
  const n = typeof step === 'number' && Number.isFinite(step) ? Math.max(0, Math.round(step)) : 0;
  const mapped = version === DRAFT_VERSION ? n : (FROM_FOUR_STEPS[n] ?? SELL_STEP_COUNT - 1);
  return Math.min(SELL_STEP_COUNT - 1, mapped);
}

export interface SellDraft {
  /** 0-based stepper position the user was on. */
  step: number;
  /** Local image URIs picked by the user (may be stale after app reinstall). */
  images: string[];
  title: string;
  /** Free-form form state owned by the post-item screen. */
  form: Record<string, unknown>;
  updatedAt: string;
  version?: number;
}

export async function loadSellDraft(): Promise<SellDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(SELL_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SellDraft;
    if (!d || typeof d !== 'object') return null;
    return { ...d, step: normalizeDraftStep(d.step, d.version), version: DRAFT_VERSION };
  } catch {
    return null;
  }
}

export async function saveSellDraft(d: Omit<SellDraft, 'updatedAt' | 'version'>, qc?: QueryClient): Promise<void> {
  const full: SellDraft = { ...d, updatedAt: new Date().toISOString(), version: DRAFT_VERSION };
  try {
    await AsyncStorage.setItem(SELL_DRAFT_KEY, JSON.stringify(full));
    qc?.setQueryData(SELL_DRAFT_QUERY_KEY, full);
  } catch {
    // autosave is best-effort
  }
}

export async function clearSellDraft(qc?: QueryClient): Promise<void> {
  try {
    await AsyncStorage.removeItem(SELL_DRAFT_KEY);
  } catch {
    // ignore
  }
  qc?.setQueryData(SELL_DRAFT_QUERY_KEY, null);
}

/** For Home's resume card. */
export function sellDraftQuery() {
  return queryOptions({
    queryKey: SELL_DRAFT_QUERY_KEY,
    queryFn: loadSellDraft,
    staleTime: Infinity,
  });
}
