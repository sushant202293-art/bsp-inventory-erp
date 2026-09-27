export const APP_NAME = 'BSP Inventory';
export const APP_TAGLINE = 'Complete Inventory Management ERP';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const API_TIMEOUT = 30000;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'bsp_auth_token',
  REFRESH_TOKEN: 'bsp_refresh_token',
  USER: 'bsp_user',
  COMPANY: 'bsp_company',
  THEME: 'bsp_theme',
  SIDEBAR_COLLAPSED: 'bsp_sidebar_collapsed',
  SIDEBAR_STATE: 'bsp_sidebar_state',
  NOTIFICATIONS: 'bsp_notifications',
  RECENT_SEARCHES: 'bsp_recent_searches',
  TABLE_PAGE_SIZE: 'bsp_table_page_size',
  LOCALE: 'bsp_locale',
} as const;

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/products',
  PRODUCT_CATEGORIES: '/products/categories',
  PRODUCT_BRANDS: '/products/brands',
  PRODUCT_UNITS: '/products/units',
  CUSTOMERS: '/customers',
  SUPPLIERS: '/suppliers',
  SALES: '/transactions/sales',
  QUOTATIONS: '/transactions/quotations',
  PURCHASE_ORDERS: '/transactions/purchase-orders',
  PROFORMA_INVOICES: '/transactions/proforma-invoices',
  STOCK_OVERVIEW: '/stock/overview',
  STOCK_MOVEMENTS: '/stock/movements',
  STOCK_ADJUSTMENTS: '/stock/adjustments',
  STOCK_TRANSFERS: '/stock/transfers',
  LOW_STOCK: '/stock/low-stock',
  REORDER: '/stock/reorder',
  PAYMENTS_RECEIVED: '/payments/received',
  PAYMENTS_PAID: '/payments/paid',
  CUSTOMER_LEDGER: '/ledgers/customers',
  SUPPLIER_LEDGER: '/ledgers/suppliers',
  SALES_REPORT: '/reports/sales',
  PURCHASE_REPORT: '/reports/purchases',
  STOCK_REPORT: '/reports/stock',
  GST_REPORT: '/reports/gst',
  PROFIT_LOSS: '/reports/profit-loss',
  USERS: '/admin/users',
  SETTINGS: '/settings',
  THEMES: '/settings/themes',
  BACKUP: '/settings/backup',
} as const;

export const SORT_ORDERS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
] as const;

export const TABLE_PAGE_SIZES = [10, 20, 50, 100] as const;

export const IMAGE_PLACEHOLDER = '/images/placeholder-product.png';
export const LOGO_PLACEHOLDER = '/images/logo-placeholder.png';

export const KEYBOARD_SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, label: 'Ctrl + K' },
  SAVE: { key: 's', ctrl: true, label: 'Ctrl + S' },
  PRINT: { key: 'p', ctrl: true, label: 'Ctrl + P' },
  NEW: { key: 'n', ctrl: true, label: 'Ctrl + N' },
  ESCAPE: { key: 'Escape', label: 'Esc' },
  TOGGLE_SIDEBAR: { key: 'b', ctrl: true, label: 'Ctrl + B' },
} as const;

export const TOAST_DURATION = 3000;
export const DEBOUNCE_DELAY = 300;
export const ANIMATION_DURATION = 0.2;
export const SKELETON_COUNT = 5;

export const GST_PERCENTAGES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu & Kashmir',
  'Ladakh',
] as const;

export const COUNTRIES = [
  { code: 'IN', name: 'India', phone: '+91' },
] as const;

export const DATE_FORMATS = [
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
] as const;

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
] as const;

export default {
  APP_NAME,
  APP_TAGLINE,
  API_BASE_URL,
  API_TIMEOUT,
  STORAGE_KEYS,
  ROUTES,
  SORT_ORDERS,
  TABLE_PAGE_SIZES,
  KEYBOARD_SHORTCUTS,
  TOAST_DURATION,
  DEBOUNCE_DELAY,
  ANIMATION_DURATION,
  GST_PERCENTAGES,
  INDIAN_STATES,
  COUNTRIES,
  DATE_FORMATS,
  CURRENCIES,
};
