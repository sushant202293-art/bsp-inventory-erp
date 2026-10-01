export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  pan: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  document_prefixes: DocumentPrefixes;
  tax_settings: TaxSettings;
  payment_settings: PaymentSettings;
  bank_accounts: BankAccount[];
  general_settings: GeneralSettings;
  theme_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentPrefixes {
  sale: string;
  purchase: string;
  quotation: string;
  proforma: string;
  purchase_order: string;
}

export interface TaxSettings {
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  tax_inclusive: boolean;
}

export interface PaymentSettings {
  default_credit_period: number;
  default_credit_limit: number;
  late_fee_percent: number;
}

export interface BankAccount {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  is_default: boolean;
}

export interface GeneralSettings {
  currency: string;
  currency_symbol: string;
  date_format: string;
  fiscal_year_start: string;
}

export interface Theme {
  id: string;
  name: string;
  config: Record<string, unknown>;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string | null;
  username: string | null;
  email: string | null;
  contact: string | null;
  avatar_url: string | null;
  role: string;
  department: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  company_id: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  company_id: string;
  name: string;
  short_name: string;
  base_unit_id: string | null;
  conversion_factor: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  code: string;
  category_id: string | null;
  brand_id: string | null;
  color: string | null;
  size: string | null;
  unit_id: string | null;
  gst_rate: number;
  hsn_sac: string | null;
  description: string | null;
  purchase_price: number;
  selling_price: number;
  low_stock_level: number;
  reorder_level: number;
  image_url: string | null;
  barcode: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductStock {
  id: string;
  product_id: string;
  warehouse_id: string;
  current_stock: number;
  avg_cost: number;
  last_updated: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  gstin: string | null;
  pan: string | null;
  contact_person: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  billing_address: Address | null;
  shipping_address: Address | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
  credit_limit: number;
  credit_period: number;
  opening_balance: number;
  opening_balance_type: 'debit' | 'credit';
  bank_details: BankDetails | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  gstin: string | null;
  pan: string | null;
  contact_person: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  billing_address: Address | null;
  shipping_address: Address | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
  credit_limit: number;
  credit_period: number;
  opening_balance: number;
  opening_balance_type: 'debit' | 'credit';
  payment_terms: string | null;
  bank_details: BankDetails | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pin: string;
  country: string;
}

export interface BankDetails {
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch: string | null;
}

/**
 * Company identity as it stood when a document was issued. Stored on the
 * document so later edits to the company profile never rewrite history.
 */
export interface CompanySnapshot {
  name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  pan: string | null;
  cin?: string | null;
}

/**
 * One row of the payment section of a document. On a proforma or quotation
 * this is a payment intention; on a posted sales/purchase invoice it mirrors
 * the rows written to payments_received / payments_made.
 */
export interface DocumentPaymentAllocation {
  method_key: string;
  method_label: string;
  bank_account_id: string | null;
  bank_label: string | null;
  reference: string | null;
  amount: number;
}

/** Payment method configured under Settings -> Payment Methods. */
export interface PaymentMethodConfig {
  key: string;
  label: string;
  enabled: boolean;
  requires_bank: boolean;
  requires_reference: boolean;
  sort_order: number;
}

/** Bank account configured under Settings -> Payment Methods. */
export interface ConfiguredBankAccount {
  id: string;
  display_name: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  ifsc: string;
  branch: string;
  account_type: string;
  upi_id: string;
  is_active: boolean;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  company_id: string;
  type: TransactionType;
  document_number: string;
  document_date: string;
  reference_number: string | null;
  reference_date: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  billing_address: Address | null;
  shipping_address: Address | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  round_off: number;
  grand_total: number;
  amount_paid: number;
  status: TransactionStatus;
  notes: string | null;
  terms: string | null;
  gstin: string | null;
  validity_date: string | null;
  expected_delivery: string | null;
  salesperson: string | null;
  warehouse_id: string | null;
  company_snapshot: CompanySnapshot | null;
  payment_allocations: DocumentPaymentAllocation[];
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'sale' | 'purchase' | 'quotation' | 'purchase_order' | 'proforma_invoice';
export type TransactionStatus = 'draft' | 'confirmed' | 'approved' | 'cancelled' | 'paid' | 'partial';

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  product_code: string | null;
  brand_name: string | null;
  quantity: number;
  unit: string | null;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  hsn_sac: string | null;
  description: string | null;
  sort_order: number;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  type: StockMovementType;
  reference_type: string | null;
  reference_id: string | null;
  quantity: number;
  balance_after: number;
  unit_cost: number;
  total_value: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type StockMovementType = 'opening' | 'purchase' | 'purchase_return' | 'sales' | 'sales_return' | 'adjustment_in' | 'adjustment_out' | 'transfer_in' | 'transfer_out';

export interface PaymentReceived {
  id: string;
  company_id: string;
  customer_id: string;
  date: string;
  reference_number: string | null;
  mode: PaymentMode;
  bank_name: string | null;
  amount: number;
  notes: string | null;
  transaction_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentMade {
  id: string;
  company_id: string;
  supplier_id: string;
  date: string;
  reference_number: string | null;
  mode: PaymentMode;
  bank_name: string | null;
  amount: number;
  notes: string | null;
  transaction_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMode = 'cash' | 'bank' | 'upi' | 'cheque' | 'other';

export interface CustomerLedger {
  id: string;
  customer_id: string;
  date: string;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface SupplierLedger {
  id: string;
  supplier_id: string;
  date: string;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  module: string;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface BackupLog {
  id: string;
  company_id: string;
  type: 'export' | 'import';
  format: string;
  file_name: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  records_count: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Database {
  companies: Company;
  company_settings: CompanySettings;
  themes: Theme;
  profiles: Profile;
  roles: Role;
  permissions: Permission;
  role_permissions: RolePermission;
  user_roles: UserRole;
  warehouses: Warehouse;
  categories: Category;
  brands: Brand;
  units: Unit;
  products: Product;
  product_stock: ProductStock;
  customers: Customer;
  suppliers: Supplier;
  transactions: Transaction;
  transaction_items: TransactionItem;
  stock_movements: StockMovement;
  payments_received: PaymentReceived;
  payments_made: PaymentMade;
  customer_ledger: CustomerLedger;
  supplier_ledger: SupplierLedger;
  audit_logs: AuditLog;
  notifications: Notification;
  backup_logs: BackupLog;
}
