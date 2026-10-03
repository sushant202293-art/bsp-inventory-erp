import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearBillingDraft,
  draftHasContent,
  loadBillingDraft,
  saveBillingDraft,
} from '../draft-persistence';
import type { BillingDraft } from '../draft-persistence';
import type { BillingItemRow, BillingPartyState } from '../billing.types';
import { emptyAddressForTest } from './helpers/empty-party';

/**
 * Switching browser tabs used to blank the whole voucher.
 *
 * The billing form keeps items, party and payments in React state only, so any
 * remount - a memory-pressure tab discard, an accidental refresh, a crashed tab
 * restore - came back as a fresh empty invoice. The draft is now mirrored into
 * `sessionStorage` and rehydrated on mount.
 *
 * The suite runs in vitest's default `node` environment (jsdom is not a project
 * dependency), so `sessionStorage` is stubbed by hand - it is the only browser
 * API the module touches, and every failure path is already guarded by
 * try/catch in the implementation.
 */

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

const sessionStorage = new MemoryStorage();
(globalThis as unknown as { window: unknown }).window = {
  sessionStorage,
};

const row: BillingItemRow = {
  key: 'row-1',
  product_id: 'p1',
  product_name: 'Widget',
  product_code: 'W-1',
  brand_name: 'Acme',
  hsn_sac: '8471',
  description: '',
  quantity: 2,
  unit: 'Pcs',
  rate: 500,
  discount_percent: 5,
  gst_rate: 18,
  gross_amount: 1000,
  discount_amount: 50,
  taxable_value: 950,
  cgst_amount: 85.5,
  sgst_amount: 85.5,
  igst_amount: 0,
  total_amount: 1121,
};

const party: BillingPartyState = {
  ...emptyAddressForTest(),
  party_id: 'c1',
  name: 'Ramesh Traders',
  code: 'C-001',
  contact_person: 'Ramesh',
  phone: '9876543210',
  email: 'ramesh@example.com',
  gstin: '27AAAAA0000A1Z5',
  state: 'Maharashtra',
  billing: { ...emptyAddressForTest(), line1: '12 Market Road', city: 'Pune', state: 'Maharashtra', pin: '411001' },
  shipping: { ...emptyAddressForTest() },
  same_as_billing: true,
  shipping_recipient: '',
  shipping_contact: '',
  shipping_phone: '',
  shipping_email: '',
};

function makeDraft(overrides: Partial<Omit<BillingDraft, 'version' | 'savedAt'>> = {}) {
  return {
    docType: 'sale' as const,
    docNumber: 'INV/0042',
    docDate: '2026-10-04',
    extraDate: '',
    referenceNumber: 'REF-9',
    party,
    items: [row],
    headerDiscount: 20,
    terms: 'Payment within 30 days.',
    notes: 'Deliver before 5pm.',
    payments: [{ id: 'p', method_key: 'cash', method_label: 'Cash', amount: 500, date: '2026-10-04', reference: '', bank_account_id: null, bank_label: '', notes: '' }],
    ...overrides,
  };
}

describe('billing draft persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('round-trips a voucher through session storage', () => {
    saveBillingDraft(makeDraft());
    const restored = loadBillingDraft('sale');

    expect(restored).not.toBeNull();
    expect(restored?.items).toHaveLength(1);
    expect(restored?.items[0].product_name).toBe('Widget');
    expect(restored?.items[0].quantity).toBe(2);
    expect(restored?.party.party_id).toBe('c1');
    expect(restored?.party.name).toBe('Ramesh Traders');
    expect(restored?.headerDiscount).toBe(20);
    expect(restored?.payments).toHaveLength(1);
  });

  it('keeps drafts of different document types apart', () => {
    saveBillingDraft(makeDraft());
    saveBillingDraft(makeDraft({ docType: 'purchase', docNumber: 'PUR/0007' }));

    expect(loadBillingDraft('sale')?.docNumber).toBe('INV/0042');
    expect(loadBillingDraft('purchase')?.docNumber).toBe('PUR/0007');
    expect(loadBillingDraft('quotation')).toBeNull();
  });

  it('is discarded once the document is saved', () => {
    saveBillingDraft(makeDraft());
    clearBillingDraft('sale');
    expect(loadBillingDraft('sale')).toBeNull();
  });

  it('ignores a draft older than twelve hours', () => {
    saveBillingDraft(makeDraft());
    const key = 'bsp:billing-draft:sale';
    const stored = JSON.parse(sessionStorage.getItem(key) as string);
    stored.savedAt = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    sessionStorage.setItem(key, JSON.stringify(stored));

    expect(loadBillingDraft('sale')).toBeNull();
  });

  it('ignores corrupt or foreign payloads instead of throwing', () => {
    sessionStorage.setItem('bsp:billing-draft:sale', '{not json');
    expect(loadBillingDraft('sale')).toBeNull();

    sessionStorage.setItem('bsp:billing-draft:sale', JSON.stringify({ version: 99, docType: 'sale' }));
    expect(loadBillingDraft('sale')).toBeNull();

    sessionStorage.setItem('bsp:billing-draft:sale', JSON.stringify({ version: 1, docType: 'sale', items: [] }));
    expect(loadBillingDraft('sale')).toBeNull();
  });

  it('recognises a draft that holds real work', () => {
    expect(draftHasContent(makeDraft() as BillingDraft)).toBe(true);
    expect(
      draftHasContent({ ...makeDraft(), items: [{ ...row, product_name: '' }], party: { ...party, party_id: null }, referenceNumber: '' } as BillingDraft)
    ).toBe(false);
  });
});