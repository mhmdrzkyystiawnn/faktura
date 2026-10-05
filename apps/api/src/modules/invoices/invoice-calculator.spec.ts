import { Prisma } from '@prisma/client';
import { calculateInvoiceTotals } from './invoice-calculator';

describe('calculateInvoiceTotals', () => {
  it('calculates item subtotals, tax, discount, and total with Decimal precision', () => {
    const result = calculateInvoiceTotals(
      [
        { quantity: '2.5', unitPrice: '100000' },
        { quantity: '1', unitPrice: '250000' },
      ],
      '11',
      '50000',
    );

    expect(result.itemSubtotals).toEqual([
      new Prisma.Decimal('250000.00'),
      new Prisma.Decimal('250000.00'),
    ]);
    expect(result.subtotal).toEqual(new Prisma.Decimal('500000.00'));
    expect(result.taxAmount).toEqual(new Prisma.Decimal('49500.00'));
    expect(result.total).toEqual(new Prisma.Decimal('499500.00'));
  });

  it('rejects a discount greater than the subtotal', () => {
    expect(() =>
      calculateInvoiceTotals(
        [{ quantity: '1', unitPrice: '100000' }],
        '0',
        '100001',
      ),
    ).toThrow('Diskon tidak boleh melebihi subtotal');
  });
});