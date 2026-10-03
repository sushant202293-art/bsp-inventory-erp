import type { Address } from '@/types/database.types';

/** A blank address, matching `EMPTY_ADDRESS` in the billing form. */
export function emptyAddressForTest(): Address {
  return { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' };
}