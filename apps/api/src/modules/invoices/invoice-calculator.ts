import { Prisma } from '@prisma/client';

export interface InvoiceCalculationItem {
  quantity: Prisma.Decimal | string | number;
  unitPrice: Prisma.Decimal | string | number;
}

export interface InvoiceTotals {
  itemSubtotals: Prisma.Decimal[];
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

export function calculateInvoiceTotals(
  items: InvoiceCalculationItem[],
  taxPercent: Prisma.Decimal | string | number,
  discountAmount: Prisma.Decimal | string | number,
): InvoiceTotals {
  const itemSubtotals = items.map((item) =>
    new Prisma.Decimal(item.quantity)
      .mul(new Prisma.Decimal(item.unitPrice))
      .toDecimalPlaces(2),
  );
  const subtotal = itemSubtotals
    .reduce((sum, itemSubtotal) => sum.add(itemSubtotal), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  const discount = new Prisma.Decimal(discountAmount).toDecimalPlaces(2);

  if (discount.gt(subtotal)) {
    throw new Error('Diskon tidak boleh melebihi subtotal');
  }

  const taxAmount = subtotal
    .sub(discount)
    .mul(new Prisma.Decimal(taxPercent))
    .div(100)
    .toDecimalPlaces(2);
  const total = subtotal.sub(discount).add(taxAmount).toDecimalPlaces(2);

  return { itemSubtotals, subtotal, taxAmount, total };
}
