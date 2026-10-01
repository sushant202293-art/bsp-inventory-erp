import {
  LayoutDashboard,
  Package,
  Building2,
  Users,
  Truck,
  ShoppingCart,
  FileText,
  Receipt,
  FileOutput,
  Warehouse,
  ArrowDownUp,
  SlidersHorizontal,
  ArrowRightLeft,
  AlertTriangle,
  RefreshCw,
  IndianRupee,
  CreditCard,
  BookOpen,
  UsersRound,
  TruckIcon,
  BarChart3,
  TrendingUp,
  FileBarChart,
  FilePieChart,
  Activity,
  Scale,
  Settings,
  Palette,
  Database,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  /**
   * Module used for permission gating. Every route in this menu is a
   * read-only listing surface, so the sidebar checks `<module>:read`.
   */
  module?: string;
  badge?: string | number;
  children?: MenuItem[];
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export const menuConfig: MenuSection[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
      },
    ],
  },
  {
    title: 'Catalog',
    items: [
      {
        /*
         * Single catalog entry point. Categories, Brands and Units live as tabs
         * inside this screen rather than as nested sidebar items.
         */
        id: 'products',
        label: 'Products',
        icon: Package,
        path: '/products',
        module: 'products',
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: Users,
        path: '/customers',
        module: 'customers',
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        icon: Truck,
        path: '/suppliers',
        module: 'suppliers',
      },
    ],
  },
  {
    title: 'Transactions',
    items: [
      {
        id: 'sales',
        label: 'Sales Invoices',
        icon: Receipt,
        path: '/transactions/sales',
        module: 'sales',
      },
      {
        id: 'quotations',
        label: 'Quotations',
        icon: FileText,
        path: '/quotations',
        module: 'quotations',
      },
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        icon: FileOutput,
        path: '/purchase-orders',
        module: 'purchase_orders',
      },
      {
        id: 'purchases',
        label: 'Purchase Invoices',
        icon: ClipboardList,
        path: '/purchase',
        module: 'purchases',
      },
      {
        id: 'proforma-invoices',
        label: 'Proforma Invoices',
        icon: ShoppingCart,
        path: '/proforma-invoices',
        module: 'proforma_invoices',
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        id: 'stock',
        label: 'Stock',
        icon: Warehouse,
        path: '/stock',
        module: 'stock',
        children: [
          {
            id: 'stock-overview',
            label: 'Stock Overview',
            icon: Warehouse,
            path: '/stock',
            module: 'stock',
          },
          {
            id: 'stock-movement',
            label: 'Stock Movement',
            icon: ArrowDownUp,
            path: '/stock/movements',
            module: 'stock',
          },
          {
            id: 'stock-adjustment',
            label: 'Adjustment',
            icon: SlidersHorizontal,
            path: '/stock/adjustment',
            module: 'stock',
          },
          {
            id: 'stock-transfer',
            label: 'Transfer',
            icon: ArrowRightLeft,
            path: '/stock/transfer',
            module: 'stock',
          },
          {
            id: 'low-stock',
            label: 'Low Stock Alerts',
            icon: AlertTriangle,
            path: '/stock/low-stock',
            module: 'stock',
          },
          {
            id: 'reorder',
            label: 'Reorder Level',
            icon: RefreshCw,
            path: '/stock/reorder',
            module: 'stock',
          },
        ],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        id: 'payments-received',
        label: 'Payments Received',
        icon: IndianRupee,
        path: '/payments/received',
        module: 'payments',
      },
      {
        id: 'payments-made',
        label: 'Payments Made',
        icon: CreditCard,
        path: '/payments/made',
        module: 'payments',
      },
      {
        id: 'customer-ledger',
        label: 'Customer Ledger',
        icon: UsersRound,
        path: '/ledgers/customer',
        module: 'ledgers',
      },
      {
        id: 'supplier-ledger',
        label: 'Supplier Ledger',
        icon: TruckIcon,
        path: '/ledgers/supplier',
        module: 'ledgers',
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        icon: BarChart3,
        path: '/reports',
        module: 'reports',
        children: [
          {
            id: 'sales-report',
            label: 'Sales Report',
            icon: TrendingUp,
            path: '/reports/sales',
            module: 'reports',
          },
          {
            id: 'purchase-report',
            label: 'Purchase Report',
            icon: FileBarChart,
            path: '/reports/purchases',
            module: 'reports',
          },
          {
            id: 'stock-report',
            label: 'Stock Report',
            icon: FilePieChart,
            path: '/reports/stock',
            module: 'reports',
          },
          {
            id: 'customer-report',
            label: 'Customer Report',
            icon: UsersRound,
            path: '/reports/customers',
            module: 'reports',
          },
          {
            id: 'supplier-report',
            label: 'Supplier Report',
            icon: TruckIcon,
            path: '/reports/suppliers',
            module: 'reports',
          },
          {
            id: 'gst-report',
            label: 'GST Report',
            icon: Scale,
            path: '/reports/gst',
            module: 'reports',
          },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        id: 'users',
        label: 'Users',
        icon: Users,
        path: '/users',
        module: 'users',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings',
        module: 'settings',
      },
      {
        id: 'company-settings',
        label: 'Company Profile',
        icon: Building2,
        path: '/settings/company',
        module: 'settings',
      },
      {
        id: 'themes',
        label: 'Themes',
        icon: Palette,
        path: '/themes',
        module: 'settings',
      },
      {
        id: 'backup',
        label: 'Backup',
        icon: Database,
        path: '/backup',
        module: 'backup',
      },
    ],
  },
];

export default menuConfig;
