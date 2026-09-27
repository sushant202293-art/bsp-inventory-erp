import type { Address } from '@/types/database.types';
import type { AddressFormData } from '@/types/customer.types';

export const EMPTY_ADDRESS: Address = {
  line1: '',
  line2: null,
  city: '',
  state: '',
  pin: '',
  country: 'India',
};

export function toAddress(value: unknown): Address {
  if (!value || typeof value !== 'object') return { ...EMPTY_ADDRESS };
  const raw = value as Partial<Address> & Record<string, unknown>;

  // Tolerate the legacy flat shape: { address, city, state, pin }
  const line1 =
    typeof raw.line1 === 'string'
      ? raw.line1
      : typeof raw.address === 'string'
        ? raw.address
        : '';

  return {
    line1,
    line2: typeof raw.line2 === 'string' && raw.line2 ? raw.line2 : null,
    city: typeof raw.city === 'string' ? raw.city : '',
    state: typeof raw.state === 'string' ? raw.state : '',
    pin: typeof raw.pin === 'string' ? raw.pin : '',
    country: typeof raw.country === 'string' && raw.country ? raw.country : 'India',
  };
}

export function addressToString(address: Address | null | undefined): string {
  if (!address) return '';
  return [address.line1, address.line2, address.city, address.state, address.pin, address.country]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function addressToMultiline(address: Address | null | undefined): string {
  if (!address) return '';
  return [address.line1, address.line2, [address.city, address.state, address.pin].filter(Boolean).join(' - ')]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join('\n');
}

export function isAddressEmpty(address: Address | null | undefined): boolean {
  if (!address) return true;
  return !address.line1 && !address.city && !address.state && !address.pin;
}

/**
 * Narrows a stored/legacy address into the optional-field shape the
 * customer, supplier and product forms submit. Without this every
 * `Address | null` handed to a form helper was a type error, and a
 * `null` address leaked into a `TEXT`/JSONB column.
 */
export function toAddressFormData(
  value: Address | AddressFormData | string | null | undefined
): AddressFormData {
  const address = typeof value === 'string' ? toAddress({ line1: value }) : toAddress(value);
  return {
    line1: address.line1,
    line2: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    pin: address.pin,
    country: address.country,
  };
}
