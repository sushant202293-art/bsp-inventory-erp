import { z } from "zod";

// ==========================================
// Common Validation Patterns
// ==========================================

export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be at most 15 digits")
  .regex(/^[6-9]\d{9}$/, "Please enter a valid Indian phone number");

export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .optional()
  .or(z.literal(""));

export const gstinSchema = z
  .string()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Please enter a valid GSTIN (e.g., 22AAAAA0000A1Z5)"
  )
  .optional()
  .or(z.literal(""));

export const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number")
  .optional()
  .or(z.literal(""));

export const ifscSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code")
  .optional()
  .or(z.literal(""));

export const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Please enter a valid 6-digit pincode")
  .optional()
  .or(z.literal(""));

export const amountSchema = z
  .number()
  .min(0, "Amount cannot be negative")
  .finite("Please enter a valid amount");

export const positiveNumberSchema = z
  .number()
  .min(0, "Value cannot be negative");

export const requiredStringSchema = z.string().min(1, "This field is required");

export const dateSchema = z.string().min(1, "Date is required");

export const idSchema = z.string().uuid("Invalid ID format");

// ==========================================
// Product Validation Schema
// ==========================================

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name must be at most 200 characters"),
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50, "SKU must be at most 50 characters")
    .regex(
      /^[A-Z0-9\-\/]+$/i,
      "SKU can only contain letters, numbers, hyphens, and slashes"
    ),
  hsn_code: z
    .string()
    .max(10, "HSN code must be at most 10 characters")
    .regex(/^\d{4,8}$/, "HSN code must be 4-8 digits")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  unit: z.enum(["NOS", "PCS", "KG", "G", "MG", "L", "ML", "M", "CM", "MM", "FT", "IN", "BOX", "SET", "PAIR", "DOZEN", "BAG", "BOTTLE", "CAN", "ROLL"], {
    errorMap: () => ({ message: "Please select a valid unit" }),
  }),
  opening_stock: z.number().min(0, "Opening stock cannot be negative").default(0),
  current_stock: z.number().min(0).default(0),
  minimum_stock: z
    .number()
    .min(0, "Minimum stock cannot be negative")
    .default(10),
  maximum_stock: z
    .number()
    .min(0, "Maximum stock cannot be negative")
    .optional()
    .nullable(),
  purchase_price: z
    .number()
    .min(0, "Purchase price cannot be negative")
    .finite("Please enter a valid purchase price"),
  selling_price: z
    .number()
    .min(0, "Selling price cannot be negative")
    .finite("Please enter a valid selling price"),
  gst_rate: z
    .number()
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .default(18),
  is_active: z.boolean().default(true),
  image_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  barcode: z
    .string()
    .max(50, "Barcode must be at most 50 characters")
    .optional()
    .or(z.literal("")),
});

export type ProductFormData = z.input<typeof productSchema>;

// ==========================================
// Customer Validation Schema
// ==========================================

export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, "Customer name must be at least 2 characters")
    .max(200, "Customer name must be at most 200 characters"),
  gstin: gstinSchema,
  state: requiredStringSchema.min(1, "Please select a state"),
  state_code: z.string().min(2, "State code is required").max(2),
  address: z
    .string()
    .max(500, "Address must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .optional()
    .or(z.literal("")),
  email: emailSchema,
  contact_person: z
    .string()
    .max(100, "Contact person must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  balance: z.number().default(0),
  credit_limit: z
    .number()
    .min(0, "Credit limit cannot be negative")
    .optional()
    .nullable(),
  payment_terms: z
    .number()
    .min(0, "Payment terms cannot be negative")
    .max(365, "Payment terms cannot exceed 365 days")
    .optional()
    .nullable(),
  is_active: z.boolean().default(true),
});

export type CustomerFormData = z.input<typeof customerSchema>;

// ==========================================
// Supplier Validation Schema
// ==========================================

export const supplierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, "Supplier name must be at least 2 characters")
    .max(200, "Supplier name must be at most 200 characters"),
  gstin: gstinSchema,
  state: requiredStringSchema.min(1, "Please select a state"),
  state_code: z.string().min(2, "State code is required").max(2),
  address: z
    .string()
    .max(500, "Address must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .optional()
    .or(z.literal("")),
  email: emailSchema,
  contact_person: z
    .string()
    .max(100, "Contact person must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  balance: z.number().default(0),
  credit_limit: z
    .number()
    .min(0, "Credit limit cannot be negative")
    .optional()
    .nullable(),
  payment_terms: z
    .number()
    .min(0, "Payment terms cannot be negative")
    .max(365, "Payment terms cannot exceed 365 days")
    .optional()
    .nullable(),
  is_active: z.boolean().default(true),
});

export type SupplierFormData = z.input<typeof supplierSchema>;

// ==========================================
// Invoice Item Validation Schema
// ==========================================

export const invoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid("Please select a product"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  quantity: z
    .number()
    .min(0.01, "Quantity must be greater than 0")
    .finite("Please enter a valid quantity"),
  unit: z.string().default("NOS"),
  unit_price: z
    .number()
    .min(0, "Unit price cannot be negative")
    .finite("Please enter a valid unit price"),
  discount_percentage: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .default(0),
  discount_amount: z
    .number()
    .min(0, "Discount amount cannot be negative")
    .default(0),
  taxable_amount: z.number().min(0).default(0),
  gst_rate: z.number().min(0).max(100).default(18),
  cgst_amount: z.number().min(0).default(0),
  sgst_amount: z.number().min(0).default(0),
  igst_amount: z.number().min(0).default(0),
  total_amount: z.number().min(0).default(0),
});

export type InvoiceItemFormData = z.input<typeof invoiceItemSchema>;

// ==========================================
// Invoice Validation Schema
// ==========================================

export const invoiceSchema = z
  .object({
    id: z.string().uuid().optional(),
    invoice_number: z
      .string()
      .min(1, "Invoice number is required")
      .max(50, "Invoice number must be at most 50 characters"),
    invoice_date: dateSchema,
    due_date: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val) return true;
          const due = new Date(val);
          const now = new Date();
          return due >= now;
        },
        { message: "Due date cannot be in the past" }
      ),
    customer_id: z.string().uuid("Please select a customer"),
    type: z.enum(["sales", "purchase"], {
      errorMap: () => ({ message: "Please select invoice type" }),
    }),
    status: z
      .enum(["draft", "sent", "paid", "partial", "overdue", "cancelled"])
      .default("draft"),
    subtotal: z.number().min(0),
    discount_amount: z.number().min(0).default(0),
    discount_percentage: z
      .number()
      .min(0, "Discount cannot be negative")
      .max(100, "Discount cannot exceed 100%")
      .default(0),
    tax_amount: z.number().min(0),
    cgst_amount: z.number().min(0).default(0),
    sgst_amount: z.number().min(0).default(0),
    igst_amount: z.number().min(0).default(0),
    total_amount: z.number().min(0),
    amount_paid: z.number().min(0).default(0),
    balance_amount: z.number().min(0),
    notes: z
      .string()
      .max(1000, "Notes must be at most 1000 characters")
      .optional()
      .or(z.literal("")),
    terms_and_conditions: z
      .string()
      .max(2000, "Terms and conditions must be at most 2000 characters")
      .optional()
      .or(z.literal("")),
    is_gst_invoice: z.boolean().default(true),
    place_of_supply: requiredStringSchema.min(1, "Place of supply is required"),
    reverse_charge: z.boolean().default(false),
    items: z
      .array(invoiceItemSchema)
      .min(1, "At least one item is required"),
  })
  .refine(
    (data) => {
      if (data.due_date && data.invoice_date) {
        return new Date(data.due_date) >= new Date(data.invoice_date);
      }
      return true;
    },
    {
      message: "Due date must be after invoice date",
      path: ["due_date"],
    }
  );

export type InvoiceFormData = z.input<typeof invoiceSchema>;

// ==========================================
// Payment Validation Schema
// ==========================================

export const paymentSchema = z
  .object({
    id: z.string().uuid().optional(),
    payment_number: z
      .string()
      .min(1, "Payment number is required")
      .max(50, "Payment number must be at most 50 characters"),
    payment_date: dateSchema,
    invoice_id: z.string().uuid().optional().nullable(),
    party_id: z.string().uuid("Please select a party"),
    party_type: z.enum(["customer", "supplier"], {
      errorMap: () => ({ message: "Please select party type" }),
    }),
    type: z.enum(["received", "paid"], {
      errorMap: () => ({ message: "Please select payment type" }),
    }),
    amount: z
      .number()
      .min(0.01, "Amount must be greater than 0")
      .finite("Please enter a valid amount"),
    payment_mode: z.enum(
      ["cash", "bank_transfer", "cheque", "upi", "card", "other"],
      {
        errorMap: () => ({ message: "Please select payment mode" }),
      }
    ),
    reference_number: z
      .string()
      .max(100, "Reference number must be at most 100 characters")
      .optional()
      .or(z.literal("")),
    bank_name: z
      .string()
      .max(100, "Bank name must be at most 100 characters")
      .optional()
      .or(z.literal("")),
    cheque_number: z
      .string()
      .max(20, "Cheque number must be at most 20 characters")
      .optional()
      .or(z.literal("")),
    cheque_date: z
      .string()
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(1000, "Notes must be at most 1000 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.payment_mode === "cheque") {
        return !!data.cheque_number && !!data.cheque_date;
      }
      return true;
    },
    {
      message: "Cheque number and date are required for cheque payments",
      path: ["cheque_number"],
    }
  )
  .refine(
    (data) => {
      if (data.payment_mode === "bank_transfer" || data.payment_mode === "cheque") {
        return !!data.bank_name;
      }
      return true;
    },
    {
      message: "Bank name is required for bank transfers and cheques",
      path: ["bank_name"],
    }
  );

export type PaymentFormData = z.input<typeof paymentSchema>;

// ==========================================
// Category Validation Schema
// ==========================================

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  parent_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type CategoryFormData = z.input<typeof categorySchema>;

// ==========================================
// Settings Validation Schema
// ==========================================

export const settingsSchema = z.object({
  business_name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name must be at most 200 characters"),
  gstin: gstinSchema,
  state: requiredStringSchema.min(1, "Please select a state"),
  state_code: z.string().min(2, "State code is required").max(2),
  address: z
    .string()
    .max(500, "Address must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .optional()
    .or(z.literal("")),
  email: emailSchema,
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  logo_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  default_gst_rate: z
    .number()
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .default(18),
  invoice_prefix: z
    .string()
    .min(1, "Invoice prefix is required")
    .max(10, "Invoice prefix must be at most 10 characters")
    .regex(
      /^[A-Z]+$/i,
      "Invoice prefix can only contain letters"
    )
    .default("INV"),
  payment_prefix: z
    .string()
    .min(1, "Payment prefix is required")
    .max(10, "Payment prefix must be at most 10 characters")
    .regex(
      /^[A-Z]+$/i,
      "Payment prefix can only contain letters"
    )
    .default("PAY"),
  terms_and_conditions: z
    .string()
    .max(2000, "Terms and conditions must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
  bank_name: z
    .string()
    .max(100, "Bank name must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  bank_account_number: z
    .string()
    .max(20, "Account number must be at most 20 characters")
    .optional()
    .or(z.literal("")),
  bank_ifsc: ifscSchema,
  bank_branch: z
    .string()
    .max(100, "Branch name must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  theme: z
    .enum([
      "neon-blue",
      "cyber-purple",
      "emerald",
      "ocean",
      "sunset",
      "royal",
      "crimson",
      "aurora",
      "midnight",
      "light-professional",
    ])
    .default("neon-blue"),
});

export type SettingsFormData = z.input<typeof settingsSchema>;

// ==========================================
// User Validation Schema
// ==========================================

export const userSchema = z.object({
  id: z.string().uuid().optional(),
  email: z
    .string()
    .email("Please enter a valid email address"),
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  avatar_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  business_id: z.string().uuid().optional().nullable(),
  role: z
    .enum(["owner", "admin", "manager", "accountant", "viewer"])
    .default("viewer"),
  is_active: z.boolean().default(true),
});

export type UserFormData = z.input<typeof userSchema>;

// ==========================================
// Login Validation Schema
// ==========================================

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

export type LoginFormData = z.input<typeof loginSchema>;

// ==========================================
// Register Validation Schema
// ==========================================

export const registerSchema = z
  .object({
    email: z
      .string()
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase, one lowercase, and one number"
      ),
    confirm_password: z
      .string()
      .min(1, "Please confirm your password"),
    full_name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    business_name: z
      .string()
      .min(2, "Business name must be at least 2 characters")
      .max(200, "Business name must be at most 200 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type RegisterFormData = z.input<typeof registerSchema>;

// ==========================================
// Search Validation Schema
// ==========================================

export const searchSchema = z.object({
  query: z
    .string()
    .max(100, "Search query must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

export type SearchFormData = z.input<typeof searchSchema>;

// ==========================================
// Filter Validation Schema
// ==========================================

export const filterSchema = z.object({
  status: z
    .enum(["all", "active", "inactive"])
    .default("all"),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  min_amount: z.number().min(0).optional().nullable(),
  max_amount: z.number().min(0).optional().nullable(),
});

export type FilterFormData = z.input<typeof filterSchema>;

// ==========================================
// Stock Adjustment Validation Schema
// ==========================================

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid("Please select a product"),
  type: z.enum(["add", "subtract", "set"], {
    errorMap: () => ({ message: "Please select adjustment type" }),
  }),
  quantity: z
    .number()
    .min(0.01, "Quantity must be greater than 0")
    .finite("Please enter a valid quantity"),
  notes: z
    .string()
    .max(500, "Notes must be at most 500 characters")
    .optional()
    .or(z.literal("")),
});

export type StockAdjustmentFormData = z.input<typeof stockAdjustmentSchema>;

// ==========================================
// Export All Schemas
// ==========================================

export const schemas = {
  product: productSchema,
  customer: customerSchema,
  supplier: supplierSchema,
  invoice: invoiceSchema,
  invoiceItem: invoiceItemSchema,
  payment: paymentSchema,
  category: categorySchema,
  settings: settingsSchema,
  user: userSchema,
  login: loginSchema,
  register: registerSchema,
  search: searchSchema,
  filter: filterSchema,
  stockAdjustment: stockAdjustmentSchema,
};

export default schemas;
