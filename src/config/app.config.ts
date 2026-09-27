export const appConfig = {
  APP_NAME: 'BSP Inventory',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Complete Inventory Management ERP',
  DEFAULT_CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  DATE_FORMAT: 'DD-MM-YYYY',
  TIME_FORMAT: 'hh:mm A',
  NUMBER_FORMAT: 'Indian',
  DECIMAL_PLACES: 2,
  FINANCIAL_YEAR_START_MONTH: 4,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  PAGE_SIZE: 20,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  PRINT_OPTIONS: {
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
  },
} as const;

export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'upi', label: 'UPI', icon: 'Smartphone' },
  { id: 'neft', label: 'NEFT', icon: 'Building2' },
  { id: 'rtgs', label: 'RTGS', icon: 'Building2' },
  { id: 'imps', label: 'IMPS', icon: 'Building2' },
  { id: 'cheque', label: 'Cheque', icon: 'FileText' },
  { id: 'demand_draft', label: 'Demand Draft', icon: 'FileText' },
  { id: 'credit_card', label: 'Credit Card', icon: 'CreditCard' },
  { id: 'debit_card', label: 'Debit Card', icon: 'CreditCard' },
  { id: 'online', label: 'Online Payment', icon: 'Globe' },
] as const;

export type PaymentModeId = (typeof PAYMENT_MODES)[number]['id'];

export const DOCUMENT_TYPES = [
  { id: 'quotation', label: 'Quotation', prefix: 'QT', color: '#3b82f6' },
  { id: 'proforma_invoice', label: 'Proforma Invoice', prefix: 'PI', color: '#8b5cf6' },
  { id: 'sales_invoice', label: 'Sales Invoice', prefix: 'INV', color: '#10b981' },
  { id: 'purchase_order', label: 'Purchase Order', prefix: 'PO', color: '#f59e0b' },
  { id: 'delivery_challan', label: 'Delivery Challan', prefix: 'DC', color: '#06b6d4' },
  { id: 'credit_note', label: 'Credit Note', prefix: 'CN', color: '#ef4444' },
  { id: 'debit_note', label: 'Debit Note', prefix: 'DN', color: '#ec4899' },
  { id: 'stock_adjustment', label: 'Stock Adjustment', prefix: 'SA', color: '#6366f1' },
  { id: 'stock_transfer', label: 'Stock Transfer', prefix: 'ST', color: '#14b8a6' },
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPES)[number]['id'];

export const STOCK_MOVEMENT_TYPES = [
  { id: 'inward', label: 'Inward', color: '#10b981', description: 'Stock coming in' },
  { id: 'outward', label: 'Outward', color: '#ef4444', description: 'Stock going out' },
  { id: 'adjustment', label: 'Adjustment', color: '#f59e0b', description: 'Manual adjustment' },
  { id: 'transfer', label: 'Transfer', color: '#6366f1', description: 'Between locations' },
  { id: 'return', label: 'Return', color: '#06b6d4', description: 'Customer return' },
  { id: 'damaged', label: 'Damaged', color: '#ec4899', description: 'Damaged goods' },
  { id: 'expired', label: 'Expired', color: '#84cc16', description: 'Expired products' },
] as const;

export type StockMovementTypeId = (typeof STOCK_MOVEMENT_TYPES)[number]['id'];

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export const HSNSAC_CODES = [
  { code: '998314', description: 'Consulting / IT Services', gstRate: 18 },
  { code: '998319', description: 'Other IT Services', gstRate: 18 },
  { code: '998611', description: 'Printing Services', gstRate: 18 },
  { code: '8471', description: 'Computer & Peripherals', gstRate: 18 },
  { code: '8443', description: 'Printers & Cartridges', gstRate: 18 },
  { code: '8523', description: 'Storage Media', gstRate: 18 },
  { code: '8528', description: 'Monitors & Displays', gstRate: 18 },
  { code: '9403', description: 'Furniture', gstRate: 18 },
  { code: '4820', description: 'Stationery', gstRate: 12 },
  { code: '4819', description: 'Cartons & Boxes', gstRate: 18 },
] as const;

export default appConfig;
