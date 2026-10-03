import type { BillingDocType, BillingItemRow, BillingPartyState } from './billing.types';
import type { DocumentPaymentAllocation } from '@/types/database.types';

/**
 * Survives an accidental tab switch, refresh or crash.
 *
 * The billing form holds a whole voucher in React state, so anything that
 * remounts the page - switching browser tabs on a memory constrained machine,
 * an accidental F5, a crashed tab restore - used to silently throw the entered
 * items, party and payments away and show a blank invoice. The draft is
 * mirrored into `sessionStorage` on every change and rehydrated on mount.
 *
 * `sessionStorage` (not `localStorage`) is deliberate: a draft belongs to one
 * browser tab and must not leak into another tab or survive days later, and it
 * is cleared the moment the voucher is saved.
 *
 * Editing an existing saved document is never mirrored: the row is the source
 * of truth there, and a stale draft could overwrite deliberate edits.
 */

const PREFIX = 'bsp:billing-draft:';
const VERSION = 1;

export interface BillingDraft {
  version: number;
  docType: BillingDocType;
  savedAt: string;
  docNumber: string;
  docDate: string;
  extraDate: string;
  referenceNumber: string;
  party: BillingPartyState;
  items: BillingItemRow[];
  headerDiscount: number;
  terms: string;
  notes: string;
  payments: DocumentPaymentAllocation[];
}

/** Drafts older than this are ignored: a stale draft is worse than none. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function storageKey(docType: BillingDocType): string {
  return `${PREFIX}${docType}`;
}

function hasSessionStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    // Private browsing / disabled storage: drafts simply do not persist.
    return false;
  }
}

export function saveBillingDraft(draft: Omit<BillingDraft, 'version' | 'savedAt'>): void {
  if (!hasSessionStorage()) return;
  try {
    const payload: BillingDraft = { ...draft, version: VERSION, savedAt: new Date().toISOString() };
    window.sessionStorage.setItem(storageKey(draft.docType), JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage disabled - losing the draft is survivable.
  }
}

export function loadBillingDraft(docType: BillingDocType): BillingDraft | null {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(docType));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BillingDraft>;
    if (parsed.version !== VERSION || parsed.docType !== docType) return null;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;

    const savedAt = parsed.savedAt ? Date.parse(parsed.savedAt) : NaN;
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      clearBillingDraft(docType);
      return null;
    }

    return parsed as BillingDraft;
  } catch {
    return null;
  }
}

export function clearBillingDraft(docType: BillingDocType): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(storageKey(docType));
  } catch {
    // Nothing to do.
  }
}

/** True when the draft holds real work worth restoring. */
export function draftHasContent(draft: BillingDraft): boolean {
  const hasItems = draft.items.some((row) => row.product_name.trim().length > 0);
  return hasItems || draft.party.party_id !== null || draft.referenceNumber.trim().length > 0;
}