import { describe, expect, it } from 'vitest';
import { planColumns, fixedColumnFor, isFixedHeader } from '../stock-statement.service';

describe('stock statement column planning', () => {
  it('merges headers that match an existing statement column', () => {
    expect(fixedColumnFor('Item Name')).toBe('name');
    expect(fixedColumnFor('category')).toBe('category');
    expect(fixedColumnFor('Brand')).toBe('brand');
    expect(fixedColumnFor('Quantity')).toBe('stock');
    expect(fixedColumnFor('qty')).toBe('stock');
    expect(fixedColumnFor('Rate')).toBe('rate');
    expect(fixedColumnFor('Total Value')).toBe('value');
    expect(fixedColumnFor('Sl No')).toBeNull();
    expect(fixedColumnFor('GST')).toBeNull();
    expect(fixedColumnFor('Unit')).toBeNull();
  });

  it('creates a new column for every header with no stock-statement equivalent', () => {
    const { newColumns } = planColumns([
      'Sl No', 'Item Name', 'Category', 'Brand', 'Unit', 'Quantity', 'Rate', 'GST', 'Total Value',
    ]);
    expect(newColumns).toEqual(['Sl No', 'Unit', 'GST']);
  });

  it('flags headers that feed an existing column', () => {
    expect(isFixedHeader('item name')).toBe(true);
    expect(isFixedHeader('unit')).toBe(false);
    expect(isFixedHeader('shelf location')).toBe(false);
  });
});
