import { formatCurrency, formatDate, formatNumber, getStateCode } from "./utils";

// ==========================================
// Invoice Formatters
// ==========================================

/**
 * Format invoice status for display
 */
export function formatInvoiceStatus(
  status: "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled"
): { label: string; className: string; color: string } {
  const statusMap: Record<
    string,
    { label: string; className: string; color: string }
  > = {
    draft: {
      label: "Draft",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
      color: "gray",
    },
    sent: {
      label: "Sent",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      color: "blue",
    },
    paid: {
      label: "Paid",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      color: "green",
    },
    partial: {
      label: "Partial",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      color: "yellow",
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      color: "red",
    },
    cancelled: {
      label: "Cancelled",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      color: "purple",
    },
  };

  return statusMap[status] || statusMap.draft;
}

/**
 * Format payment mode for display
 */
export function formatPaymentMode(
  mode: "cash" | "bank_transfer" | "cheque" | "upi" | "card" | "other"
): { label: string; icon: string } {
  const modeMap: Record<string, { label: string; icon: string }> = {
    cash: { label: "Cash", icon: "banknote" },
    bank_transfer: { label: "Bank Transfer", icon: "building" },
    cheque: { label: "Cheque", icon: "file-text" },
    upi: { label: "UPI", icon: "smartphone" },
    card: { label: "Card", icon: "credit-card" },
    other: { label: "Other", icon: "more-horizontal" },
  };

  return modeMap[mode] || modeMap.other;
}

/**
 * Format payment type for display
 */
export function formatPaymentType(
  type: "received" | "paid"
): { label: string; className: string } {
  return type === "received"
    ? {
        label: "Received",
        className:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      }
    : {
        label: "Paid",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      };
}

// ==========================================
// Product Formatters
// ==========================================

/**
 * Format stock status
 */
export function formatStockStatus(
  currentStock: number,
  minimumStock: number,
  maximumStock?: number | null
): {
  label: string;
  className: string;
  color: string;
  available: boolean;
} {
  if (currentStock <= 0) {
    return {
      label: "Out of Stock",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      color: "red",
      available: false,
    };
  }

  if (currentStock <= minimumStock) {
    return {
      label: "Low Stock",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      color: "yellow",
      available: true,
    };
  }

  if (maximumStock && currentStock >= maximumStock) {
    return {
      label: "Overstocked",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      color: "purple",
      available: true,
    };
  }

  return {
    label: "In Stock",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    color: "green",
    available: true,
  };
}

/**
 * Format unit for display
 */
export function formatUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    NOS: "Nos",
    PCS: "Pcs",
    KG: "Kg",
    G: "G",
    MG: "Mg",
    L: "L",
    ML: "Ml",
    M: "M",
    CM: "Cm",
    MM: "Mm",
    FT: "Ft",
    IN: "In",
    BOX: "Box",
    SET: "Set",
    PAIR: "Pair",
    DOZEN: "Dozen",
    BAG: "Bag",
    BOTTLE: "Bottle",
    CAN: "Can",
    ROLL: "Roll",
  };

  return unitMap[unit] || unit;
}

// ==========================================
// Customer/Supplier Formatters
// ==========================================

/**
 * Format party type
 */
export function formatPartyType(
  type: "customer" | "supplier"
): { label: string; className: string } {
  return type === "customer"
    ? {
        label: "Customer",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      }
    : {
        label: "Supplier",
        className:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
      };
}

/**
 * Format balance type
 */
export function formatBalanceType(balance: number): {
  label: string;
  className: string;
  prefix: string;
} {
  if (balance > 0) {
    return {
      label: "Receivable",
      className: "text-green-600 dark:text-green-400",
      prefix: "+",
    };
  }

  if (balance < 0) {
    return {
      label: "Payable",
      className: "text-red-600 dark:text-red-400",
      prefix: "-",
    };
  }

  return {
    label: "Settled",
    className: "text-gray-600 dark:text-gray-400",
    prefix: "",
  };
}

// ==========================================
// Document Formatters
// ==========================================

/**
 * Format document number for display
 */
export function formatDocumentNumber(number: string): string {
  return number.replace(/\//g, " / ");
}

/**
 * Format GSTIN for display with spaces
 */
export function formatGSTIN(gstin: string): string {
  if (!gstin) return "";
  return gstin.replace(/(\d{2})([A-Z]{5})(\d{4})([A-Z])([1-9A-Z])(Z)([0-9A-Z])/, "$1 $2 $3 $4 $5 $6 $7");
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

// ==========================================
// Amount Formatters
// ==========================================

/**
 * Format amount with sign
 */
export function formatAmountWithSign(
  amount: number,
  showSign: boolean = true
): string {
  const formatted = formatCurrency(Math.abs(amount));

  if (!showSign) return formatted;

  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format discount
 */
export function formatDiscount(
  amount: number,
  percentage: number
): string {
  if (percentage > 0) {
    return `${percentage}%`;
  }
  return formatCurrency(amount);
}

/**
 * Format tax breakdown
 */
export function formatTaxBreakdown(
  cgst: number,
  sgst: number,
  igst: number
): string {
  if (igst > 0) {
    return `IGST: ${formatCurrency(igst)}`;
  }
  return `CGST: ${formatCurrency(cgst)} | SGST: ${formatCurrency(sgst)}`;
}

// ==========================================
// Date Formatters
// ==========================================

/**
 * Format invoice date
 */
export function formatInvoiceDate(date: string | Date): string {
  return formatDate(date, "DD-MM-YYYY");
}

/**
 * Format due date with status
 */
export function formatDueDate(
  dueDate: string | Date | null,
  status: string
): { text: string; className: string } {
  if (!dueDate) {
    return { text: "N/A", className: "text-gray-500" };
  }

  const formatted = formatDate(dueDate, "DD-MM-YYYY");
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (status === "paid") {
    return { text: formatted, className: "text-green-600 dark:text-green-400" };
  }

  if (diffDays < 0) {
    return {
      text: `${formatted} (${Math.abs(diffDays)} days overdue)`,
      className: "text-red-600 dark:text-red-400",
    };
  }

  if (diffDays <= 7) {
    return {
      text: `${formatted} (${diffDays} days left)`,
      className: "text-yellow-600 dark:text-yellow-400",
    };
  }

  return { text: formatted, className: "text-gray-600 dark:text-gray-400" };
}

/**
 * Format financial year
 */
export function formatFinancialYear(date: string | Date): string {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

// ==========================================
// Number Formatters
// ==========================================

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format quantity
 */
export function formatQuantity(
  quantity: number,
  unit: string
): string {
  const formatted = formatNumber(quantity);
  return `${formatted} ${formatUnit(unit)}`;
}

/**
 * Format stock level
 */
export function formatStockLevel(
  current: number,
  minimum: number
): string {
  const percentage = minimum > 0 ? (current / minimum) * 100 : 0;

  if (current <= 0) return "Out of Stock";
  if (percentage <= 100) return "Low Stock";
  if (percentage >= 200) return "Overstocked";
  return "Normal";
}

// ==========================================
// Status Formatters
// ==========================================

/**
 * Format user role
 */
export function formatUserRole(
  role: "owner" | "admin" | "manager" | "accountant" | "viewer"
): { label: string; className: string } {
  const roleMap: Record<string, { label: string; className: string }> = {
    owner: {
      label: "Owner",
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    },
    admin: {
      label: "Admin",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    },
    manager: {
      label: "Manager",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    accountant: {
      label: "Accountant",
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    },
    viewer: {
      label: "Viewer",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    },
  };

  return roleMap[role] || roleMap.viewer;
}

/**
 * Format activity status
 */
export function formatActivityStatus(
  isActive: boolean
): { label: string; className: string } {
  return isActive
    ? {
        label: "Active",
        className:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      }
    : {
        label: "Inactive",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      };
}

// ==========================================
// Table Formatters
// ==========================================

/**
 * Format table cell content
 */
export function formatTableCell(
  value: unknown,
  type: "text" | "currency" | "number" | "date" | "status"
): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "currency":
      return formatCurrency(Number(value));
    case "number":
      return formatNumber(Number(value));
    case "date":
      return formatDate(String(value), "DD-MM-YYYY");
    case "status":
      return String(value).charAt(0).toUpperCase() + String(value).slice(1);
    default:
      return String(value);
  }
}

/**
 * Sort table data
 */
export function sortTableData<T>(
  data: T[],
  sortBy: keyof T,
  sortOrder: "asc" | "desc"
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const comparison = aVal < bVal ? -1 : 1;
    return sortOrder === "asc" ? comparison : -1 * comparison;
  });
}

/**
 * Filter table data
 */
export function filterTableData<T extends Record<string, unknown>>(
  data: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query) return data;

  const lowerQuery = query.toLowerCase();

  return data.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(lowerQuery);
    })
  );
}

// ==========================================
// Export Formatters
// ==========================================

/**
 * Format data for CSV export
 */
export function formatForCSV(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): string {
  const headers = columns.map((col) => col.label).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const strValue = String(value ?? "");

        if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Format data for print
 */
export function formatForPrint(
  data: Record<string, unknown>[],
  columns: { key: string; label: string; width?: string }[]
): string {
  const headerRow = columns.map((col) => `<th style="width: ${col.width || "auto"}">${col.label}</th>`).join("");

  const bodyRows = data
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${row[col.key] ?? ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

// ==========================================
// Search Formatters
// ==========================================

/**
 * Highlight search matches
 */
export function highlightSearchMatch(
  text: string,
  query: string
): string {
  if (!query) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
}

/**
 * Escape regex special characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate search suggestions
 */
export function generateSearchSuggestions(
  query: string,
  items: string[],
  maxSuggestions: number = 5
): string[] {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();

  return items
    .filter((item) => item.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      const aStartsWith = a.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.toLowerCase().startsWith(lowerQuery);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return 0;
    })
    .slice(0, maxSuggestions);
}
