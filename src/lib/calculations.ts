import { roundTo2 } from "./utils";

// ==========================================
// Stock Calculations
// ==========================================

/**
 * Calculate current stock after movement
 */
export function calculateCurrentStock(
  openingStock: number,
  movements: {
    type: "purchase" | "sale" | "return" | "adjustment" | "opening";
    quantity: number;
  }[]
): number {
  return movements.reduce((stock, movement) => {
    switch (movement.type) {
      case "purchase":
        return stock + movement.quantity;
      case "sale":
        return stock - movement.quantity;
      case "return":
        return stock + movement.quantity;
      case "adjustment":
        return stock + movement.quantity;
      case "opening":
        return movement.quantity;
      default:
        return stock;
    }
  }, openingStock);
}

/**
 * Calculate stock value
 */
export function calculateStockValue(
  currentStock: number,
  unitPrice: number
): number {
  return roundTo2(currentStock * unitPrice);
}

/**
 * Calculate total stock value for inventory
 */
export function calculateTotalStockValue(
  products: {
    current_stock: number;
    purchase_price: number;
  }[]
): number {
  return roundTo2(
    products.reduce(
      (total, product) =>
        total + calculateStockValue(product.current_stock, product.purchase_price),
      0
    )
  );
}

/**
 * Calculate stock turnover ratio
 */
export function calculateStockTurnover(
  costOfGoodsSold: number,
  averageInventory: number
): number {
  if (averageInventory === 0) return 0;
  return roundTo2(costOfGoodsSold / averageInventory);
}

/**
 * Calculate days of inventory
 */
export function calculateDaysOfInventory(
  averageInventory: number,
  costOfGoodsSold: number
): number {
  if (costOfGoodsSold === 0) return 0;
  return roundTo2((averageInventory / costOfGoodsSold) * 365);
}

/**
 * Calculate reorder point
 */
export function calculateReorderPoint(
  dailyUsage: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  return Math.ceil(dailyUsage * leadTimeDays + safetyStock);
}

/**
 * Calculate economic order quantity
 */
export function calculateEOQ(
  annualDemand: number,
  orderCost: number,
  holdingCost: number
): number {
  if (holdingCost === 0) return 0;
  return Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
}

// ==========================================
// GST Calculations
// ==========================================

/**
 * Calculate GST breakdown (CGST/SGST/IGST)
 */
export function calculateGSTBreakdown(
  taxableAmount: number,
  gstRate: number,
  isInterstate: boolean
): {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
} {
  const totalTax = roundTo2((taxableAmount * gstRate) / 100);

  if (isInterstate) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
      totalAmount: roundTo2(taxableAmount + totalTax),
    };
  }

  const halfRate = gstRate / 2;
  const cgst = roundTo2((taxableAmount * halfRate) / 100);
  const sgst = roundTo2((taxableAmount * halfRate) / 100);

  return {
    cgst,
    sgst,
    igst: 0,
    totalTax,
    totalAmount: roundTo2(taxableAmount + totalTax),
  };
}

/**
 * Calculate reverse charge GST
 */
export function calculateReverseChargeGST(
  taxableAmount: number,
  gstRate: number
): {
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
} {
  const totalTax = roundTo2((taxableAmount * gstRate) / 100);
  const igst = roundTo2((taxableAmount * gstRate) / 100);

  return {
    igst,
    cgst: 0,
    sgst: 0,
    totalTax,
  };
}

/**
 * Calculate GST on MRP (Maximum Retail Price)
 */
export function calculateGSTOnMRP(
  mrp: number,
  gstRate: number
): {
  basePrice: number;
  gstAmount: number;
  netPrice: number;
} {
  const basePrice = roundTo2(mrp / (1 + gstRate / 100));
  const gstAmount = roundTo2(mrp - basePrice);

  return {
    basePrice,
    gstAmount,
    netPrice: mrp,
  };
}

/**
 * Calculate inclusive vs exclusive GST
 */
export function calculateGSTInclusiveExclusive(
  amount: number,
  gstRate: number,
  isInclusive: boolean
): {
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
} {
  if (isInclusive) {
    const taxableAmount = roundTo2(amount / (1 + gstRate / 100));
    const gstAmount = roundTo2(amount - taxableAmount);
    return {
      taxableAmount,
      gstAmount,
      totalAmount: amount,
    };
  }

  const gstAmount = roundTo2((amount * gstRate) / 100);
  return {
    taxableAmount: amount,
    gstAmount,
    totalAmount: roundTo2(amount + gstAmount),
  };
}

// ==========================================
// Invoice Calculations
// ==========================================

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(
  items: {
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    discount_amount: number;
    gst_rate: number;
  }[],
  isInterstate: boolean,
  additionalDiscount: number = 0,
  additionalDiscountType: "percentage" | "amount" = "percentage"
): {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
} {
  // Calculate item totals
  const itemTotals = items.map((item) => {
    const lineTotal = roundTo2(item.quantity * item.unit_price);
    const discountAmount =
      item.discount_percentage > 0
        ? roundTo2((lineTotal * item.discount_percentage) / 100)
        : item.discount_amount;
    const taxableAmount = roundTo2(lineTotal - discountAmount);

    return {
      lineTotal,
      discountAmount,
      taxableAmount,
      gst_rate: item.gst_rate,
    };
  });

  // Sum up values
  const subtotal = roundTo2(
    itemTotals.reduce((sum, item) => sum + item.lineTotal, 0)
  );

  const totalDiscount = roundTo2(
    itemTotals.reduce((sum, item) => sum + item.discountAmount, 0)
  );

  const taxableAmount = roundTo2(
    itemTotals.reduce((sum, item) => sum + item.taxableAmount, 0)
  );

  // Apply additional discount
  let additionalDiscountAmount = 0;
  if (additionalDiscount > 0) {
    additionalDiscountAmount =
      additionalDiscountType === "percentage"
        ? roundTo2((taxableAmount * additionalDiscount) / 100)
        : additionalDiscount;
  }

  const finalTaxableAmount = roundTo2(taxableAmount - additionalDiscountAmount);

  // Calculate GST
  const gstBreakdown = calculateGSTBreakdown(
    finalTaxableAmount,
    items[0]?.gst_rate || 18,
    isInterstate
  );

  return {
    subtotal,
    totalDiscount: roundTo2(totalDiscount + additionalDiscountAmount),
    taxableAmount: finalTaxableAmount,
    cgst: gstBreakdown.cgst,
    sgst: gstBreakdown.sgst,
    igst: gstBreakdown.igst,
    totalTax: gstBreakdown.totalTax,
    totalAmount: gstBreakdown.totalAmount,
  };
}

/**
 * Calculate invoice item line total
 */
export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
  discountPercentage: number = 0,
  discountAmount: number = 0,
  gstRate: number = 18,
  isInterstate: boolean = false
): {
  lineTotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
} {
  const lineTotal = roundTo2(quantity * unitPrice);

  const discount =
    discountPercentage > 0
      ? roundTo2((lineTotal * discountPercentage) / 100)
      : discountAmount;

  const taxableAmount = roundTo2(lineTotal - discount);

  const gst = calculateGSTBreakdown(taxableAmount, gstRate, isInterstate);

  return {
    lineTotal,
    discount,
    taxableAmount,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    totalAmount: gst.totalAmount,
  };
}

/**
 * Calculate payment allocation
 */
export function calculatePaymentAllocation(
  payments: {
    amount: number;
    date: string;
  }[],
  totalAmount: number
): {
  totalPaid: number;
  balance: number;
  percentagePaid: number;
  isFullyPaid: boolean;
  lastPaymentDate: string | null;
} {
  const totalPaid = roundTo2(
    payments.reduce((sum, payment) => sum + payment.amount, 0)
  );

  const balance = roundTo2(totalAmount - totalPaid);

  const percentagePaid =
    totalAmount > 0 ? roundTo2((totalPaid / totalAmount) * 100) : 0;

  const isFullyPaid = balance <= 0;

  const lastPaymentDate =
    payments.length > 0
      ? // copy first: sorting in place would reorder the caller's array
        [...payments].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0].date
      : null;

  return {
    totalPaid,
    balance: Math.max(0, balance),
    percentagePaid: Math.min(100, percentagePaid),
    isFullyPaid,
    lastPaymentDate,
  };
}

// ==========================================
// Business Calculations
// ==========================================

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(
  sellingPrice: number,
  costPrice: number
): {
  profit: number;
  marginPercentage: number;
  markupPercentage: number;
} {
  const profit = roundTo2(sellingPrice - costPrice);

  const marginPercentage =
    sellingPrice > 0 ? roundTo2((profit / sellingPrice) * 100) : 0;

  const markupPercentage =
    costPrice > 0 ? roundTo2((profit / costPrice) * 100) : 0;

  return {
    profit,
    marginPercentage,
    markupPercentage,
  };
}

/**
 * Calculate selling price from cost and margin
 */
export function calculateSellingPrice(
  costPrice: number,
  marginPercentage: number,
  gstRate: number = 0,
  isGSTInclusive: boolean = false
): {
  sellingPriceExclGST: number;
  gstAmount: number;
  sellingPriceInclGST: number;
} {
  const sellingPriceExclGST = roundTo2(
    costPrice * (1 + marginPercentage / 100)
  );

  const gstAmount = roundTo2((sellingPriceExclGST * gstRate) / 100);

  const sellingPriceInclGST = roundTo2(sellingPriceExclGST + gstAmount);

  return {
    sellingPriceExclGST,
    gstAmount,
    sellingPriceInclGST,
  };
}

/**
 * Calculate cost price from selling price and margin
 */
export function calculateCostPrice(
  sellingPrice: number,
  marginPercentage: number
): number {
  if (marginPercentage >= 100) return 0;
  return roundTo2(sellingPrice / (1 + marginPercentage / 100));
}

/**
 * Calculate running balance
 */
export function calculateRunningBalance(
  transactions: {
    type: "debit" | "credit";
    amount: number;
    date: string;
  }[]
): {
  runningBalance: number;
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
} {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningBalance = 0;
  const balances: number[] = [];

  sorted.forEach((transaction) => {
    if (transaction.type === "debit") {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }
    balances.push(roundTo2(runningBalance));
  });

  const totalDebit = roundTo2(
    transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const totalCredit = roundTo2(
    transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0)
  );

  return {
    runningBalance: roundTo2(runningBalance),
    totalDebit,
    totalCredit,
    finalBalance: roundTo2(totalDebit - totalCredit),
  };
}

/**
 * Calculate accounts receivable aging
 */
export function calculateReceivableAging(
  invoices: {
    invoice_date: string;
    due_date: string | null;
    total_amount: number;
    amount_paid: number;
    status: string;
  }[]
): {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
} {
  const now = new Date();

  const aging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    over90: 0,
    total: 0,
  };

  invoices.forEach((invoice) => {
    if (invoice.status === "paid") return;

    const balance = invoice.total_amount - invoice.amount_paid;
    if (balance <= 0) return;

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date)
      : new Date(invoice.invoice_date);
    const daysPastDue = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysPastDue <= 0) {
      aging.current += balance;
    } else if (daysPastDue <= 30) {
      aging.days1to30 += balance;
    } else if (daysPastDue <= 60) {
      aging.days31to60 += balance;
    } else if (daysPastDue <= 90) {
      aging.days61to90 += balance;
    } else {
      aging.over90 += balance;
    }

    aging.total += balance;
  });

  return {
    current: roundTo2(aging.current),
    days1to30: roundTo2(aging.days1to30),
    days31to60: roundTo2(aging.days31to60),
    days61to90: roundTo2(aging.days61to90),
    over90: roundTo2(aging.over90),
    total: roundTo2(aging.total),
  };
}

/**
 * Calculate accounts payable aging
 */
export function calculatePayableAging(
  invoices: {
    invoice_date: string;
    due_date: string | null;
    total_amount: number;
    amount_paid: number;
    status: string;
  }[]
): {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
} {
  const now = new Date();

  const aging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    over90: 0,
    total: 0,
  };

  invoices.forEach((invoice) => {
    if (invoice.status === "paid") return;

    const balance = invoice.total_amount - invoice.amount_paid;
    if (balance <= 0) return;

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date)
      : new Date(invoice.invoice_date);
    const daysPastDue = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysPastDue <= 0) {
      aging.current += balance;
    } else if (daysPastDue <= 30) {
      aging.days1to30 += balance;
    } else if (daysPastDue <= 60) {
      aging.days31to60 += balance;
    } else if (daysPastDue <= 90) {
      aging.days61to90 += balance;
    } else {
      aging.over90 += balance;
    }

    aging.total += balance;
  });

  return {
    current: roundTo2(aging.current),
    days1to30: roundTo2(aging.days1to30),
    days31to60: roundTo2(aging.days31to60),
    days61to90: roundTo2(aging.days61to90),
    over90: roundTo2(aging.over90),
    total: roundTo2(aging.total),
  };
}

// ==========================================
// Dashboard Calculations
// ==========================================

/**
 * Calculate sales summary
 */
export function calculateSalesSummary(
  sales: {
    total_amount: number;
    date: string;
  }[],
  period: "daily" | "weekly" | "monthly" | "yearly"
): {
  currentPeriod: number;
  previousPeriod: number;
  growth: number;
  trend: "up" | "down" | "stable";
} {
  const now = new Date();
  const currentPeriodStart = getPeriodStart(now, period);
  const previousPeriodStart = getPeriodStart(
    new Date(currentPeriodStart.getTime() - 1),
    period
  );

  const currentPeriodSales = sales
    .filter(
      (s) =>
        new Date(s.date) >= currentPeriodStart &&
        new Date(s.date) <= now
    )
    .reduce((sum, s) => sum + s.total_amount, 0);

  const previousPeriodSales = sales
    .filter(
      (s) =>
        new Date(s.date) >= previousPeriodStart &&
        new Date(s.date) < currentPeriodStart
    )
    .reduce((sum, s) => sum + s.total_amount, 0);

  const growth =
    previousPeriodSales > 0
      ? roundTo2(
          ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) *
            100
        )
      : currentPeriodSales > 0
      ? 100
      : 0;

  const trend =
    currentPeriodSales > previousPeriodSales
      ? "up"
      : currentPeriodSales < previousPeriodSales
      ? "down"
      : "stable";

  return {
    currentPeriod: roundTo2(currentPeriodSales),
    previousPeriod: roundTo2(previousPeriodSales),
    growth,
    trend,
  };
}

/**
 * Get period start date
 */
function getPeriodStart(
  date: Date,
  period: "daily" | "weekly" | "monthly" | "yearly"
): Date {
  const d = new Date(date);

  switch (period) {
    case "daily":
      d.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case "yearly":
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
  }

  return d;
}

/**
 * Calculate monthly revenue
 */
export function calculateMonthlyRevenue(
  invoices: {
    total_amount: number;
    invoice_date: string;
    type: string;
  }[],
  year: number,
  month: number
): number {
  return roundTo2(
    invoices
      .filter((inv) => {
        const date = new Date(inv.invoice_date);
        return (
          date.getFullYear() === year &&
          date.getMonth() === month &&
          inv.type === "sales"
        );
      })
      .reduce((sum, inv) => sum + inv.total_amount, 0)
  );
}

/**
 * Calculate outstanding balance
 */
export function calculateOutstandingBalance(
  invoices: {
    total_amount: number;
    amount_paid: number;
    status: string;
  }[]
): {
  totalOutstanding: number;
  overdueAmount: number;
  currentAmount: number;
  averageDaysToPay: number;
} {
  const unpaid = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "cancelled"
  );

  const totalOutstanding = roundTo2(
    unpaid.reduce(
      (sum, inv) => sum + (inv.total_amount - inv.amount_paid),
      0
    )
  );

  const overdueAmount = roundTo2(
    invoices
      .filter((inv) => inv.status === "overdue")
      .reduce(
        (sum, inv) => sum + (inv.total_amount - inv.amount_paid),
        0
      )
  );

  const currentAmount = roundTo2(totalOutstanding - overdueAmount);

  return {
    totalOutstanding,
    overdueAmount,
    currentAmount,
    averageDaysToPay: 30, // Default, can be calculated from historical data
  };
}

/**
 * Calculate top products by sales
 */
export function calculateTopProducts(
  sales: {
    product_id: string;
    product_name: string;
    quantity: number;
    total_amount: number;
  }[],
  limit: number = 5
): {
  product_id: string;
  product_name: string;
  totalQuantity: number;
  totalRevenue: number;
  percentage: number;
}[] {
  const productMap = new Map<
    string,
    {
      product_id: string;
      product_name: string;
      totalQuantity: number;
      totalRevenue: number;
    }
  >();

  sales.forEach((sale) => {
    const existing = productMap.get(sale.product_id);
    if (existing) {
      existing.totalQuantity += sale.quantity;
      existing.totalRevenue += sale.total_amount;
    } else {
      productMap.set(sale.product_id, {
        product_id: sale.product_id,
        product_name: sale.product_name,
        totalQuantity: sale.quantity,
        totalRevenue: sale.total_amount,
      });
    }
  });

  const totalRevenue = Array.from(productMap.values()).reduce(
    (sum, p) => sum + p.totalRevenue,
    0
  );

  return Array.from(productMap.values())
    .map((product) => ({
      ...product,
      totalQuantity: roundTo2(product.totalQuantity),
      totalRevenue: roundTo2(product.totalRevenue),
      percentage:
        totalRevenue > 0
          ? roundTo2((product.totalRevenue / totalRevenue) * 100)
          : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}
