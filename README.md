# BSP Inventory ERP

Complete Inventory Management ERP System built with React, TypeScript, Supabase, and Tailwind CSS.

## ✨ Features

### 📦 Inventory Management
- Product catalog with categories and brands
- Stock tracking with real-time updates
- Low stock alerts and reorder points
- Stock adjustments and transfers
- Barcode support

### 📄 Transaction Management
- Sales Invoices with GST calculation
- Purchase Orders and Purchase Invoices
- Quotations and Proforma Invoices
- Automatic document numbering
- Print-ready invoice templates

### 👥 Party Management
- Customer and Supplier records
- Credit limits and payment terms
- Party ledgers with running balance
- GSTIN and PAN validation
- Multiple addresses support

### 💰 Financial Features
- GST-compliant invoicing (CGST/SGST/IGST)
- Payment tracking (received and made)
- Aging reports (receivables and payables)
- Outstanding balance tracking
- Amount in words conversion

### 📊 Reports & Analytics
- Sales and Purchase reports
- Stock valuation reports
- Customer and Supplier reports
- GST summary reports
- Dashboard with key metrics

### 🔐 Security & Access Control
- Multi-tenant architecture (company isolation)
- Role-based permissions (5 roles)
- Row-level security (RLS) in database
- Supabase Authentication
- Session management

### 🎨 User Experience
- 8 theme options (light and dark modes)
- Responsive design (mobile/tablet/desktop)
- Keyboard shortcuts
- Search functionality
- Export to CSV/Excel

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8
- **Styling**: Tailwind CSS 3, Framer Motion
- **UI Components**: Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Icons**: Lucide React
- **PDF**: jsPDF + jsPDF-AutoTable
- **Excel**: SheetJS (xlsx)

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## 🚀 Quick Start

> ### ⚠️ Do not open this project by double-clicking `index.html`
>
> This is a Vite + React app. Opening `index.html` directly (or opening
> `dist/index.html`) shows a **blank white page** and will never work, because:
>
> 1. Browsers block ES modules over the `file://` protocol (CORS), so
>    `/assets/index-*.js` and `/src/main.tsx` fail to load at all.
> 2. Vite emits absolute paths like `/assets/...`, which on `file://` resolve to
>    `file:///D:/assets/...` — the wrong location entirely.
>
> The app **must be served over HTTP**. Use one of these:

| Method | What to do |
| --- | --- |
| **Easiest (Windows)** | Double-click **`START-APP.bat`**. It installs dependencies on first run, starts the server, waits until it responds, then opens your browser. |
| Manual | Run `npm install` once, then `npm run dev`, then open <http://localhost:5173> |
| Production build | `npm run build`, then `npm run preview`, then open <http://localhost:4173> |

To shut down, run **`STOP-APP.bat`** or close the server window.

**Login:** `admin@bspinventory.com` / `Admin@12345`

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd inventory-erp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project dashboard:
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings > API
4. Copy the URL and anon/public key

### 4. Set up the database

Run the migrations in Supabase SQL Editor:

```bash
# Run all files in supabase/migrations/ in order (001 to 007)
```

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 5. Load seed data and create the admin account

Run these two files in the Supabase SQL Editor, in this order:

```bash
# 1. supabase/seed/demo_data.sql    - sample company, products, parties, transactions
# 2. supabase/seed/admin_user.sql   - creates the first admin login
```

`admin_user.sql` must run **after** `demo_data.sql`, because it attaches the
admin to the demo company. It is safe to re-run.

### 6. Start the development server

```bash
npm run dev
```

Open http://localhost:5173 in your browser — or just double-click `START-APP.bat`, which does the above for you.

### 7. Build for production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
inventory-erp/
├── START-APP.bat        # One-click: install, serve, open browser
├── STOP-APP.bat         # One-click: shut the server down
├── public/              # Static assets
├── src/
│   ├── app/            # App setup (routes, providers)
│   ├── assets/         # Images, fonts
│   ├── components/     # Reusable UI components
│   │   ├── layout/    # Layout components
│   │   └── ui/        # Base UI components
│   ├── config/        # Configuration files
│   ├── constants/     # App constants
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom React hooks
│   ├── layouts/       # Page layouts
│   ├── lib/           # Utilities and helpers
│   ├── modules/       # Feature modules (pages)
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── sales/
│   │   ├── stock/
│   │   ├── reports/
│   │   └── ...
│   ├── pages/         # Auth and error pages
│   ├── services/      # API service layer
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript type definitions
│   └── main.tsx       # App entry point
├── supabase/
│   ├── migrations/    # Database migrations
│   └── seed/          # Seed data
├── .env.example       # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🔑 Default Login

After running `supabase/seed/admin_user.sql`:

- **Email**: admin@bspinventory.com
- **Password**: Admin@12345

**⚠️ Change this immediately in production!**

You can also skip all of the above and just sign up at `/signup` — migration
007 (`supabase/migrations/007_signup_onboarding.sql`) creates the company and
admin profile for you automatically.

## 👥 User Roles & Permissions

There are 4 database-backed roles plus `owner`/`super_admin`, seeded in
`supabase/migrations/001_initial_schema.sql`. The labels the admin UI offers in
`/users` all resolve to a permission set — see `src/lib/permissions.ts`.

| Role label | Level | Description |
|------|-------|-------------|
| `owner` / `super_admin` | 6 / 5 | Full access to everything |
| `admin` | 4 | Company administrator, all operations |
| `manager` | 3 | Day-to-day operations, no delete |
| `sales` | 2 | Customers, sales invoices, quotations |
| `purchase` | 2 | Suppliers, purchase orders and invoices |
| `accounts` / `accountant` | 2 | Payments, ledgers and finance reports |
| `inventory` | 2 | Products, stock adjustments and transfers |
| `viewer` | 1 | Read-only access |

> Permissions come from two places, and both are needed:
>
> - the `permissions` / `role_permissions` tables, translated into the app's
>   vocabulary by `src/lib/permission-mapping.ts` (the database says
>   `create`/`update` and `backups`; the app asks for `write` and `backup`), and
> - the static role matrix in `src/lib/permissions.ts`, which covers the modules
>   the database has no rows for (`units`, `ledgers`, `reports`) and the actions
>   it never defines (`export`, `import`).
>
> When the `user_roles` bridge row no longer matches `profiles.role`, the
> database grants are discarded so a role downgrade takes effect immediately.
>
> There is no separate `super_admin` role in the database; cross-company access
> is granted by the `public.user_is_admin()` RLS helper, which the `admin` role
> satisfies.

## 🗄️ Database Tables

- `companies` - Multi-tenant company records
- `profiles` - User profiles linked to auth.users
- `products` - Product catalog
- `categories` - Product categories (tree structure)
- `brands` - Product brands
- `units` - Units of measurement
- `customers` - Customer records
- `suppliers` - Supplier records
- `transactions` - Sales, purchases, quotations, POs, PIs
- `transaction_items` - Line items for transactions
- `stock` - Stock balances by product
- `stock_movements` - Stock movement history
- `warehouses` - Warehouse/location master
- `payments` - Payment records
- `payment_allocations` - Payment to invoice mapping
- `roles` - User roles
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings
- `user_roles` - User-role assignments
- `company_settings` - Company-specific settings

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run linter (oxlint)

# Testing
npm test                 # Run tests (vitest)
npm run test:watch       # Run tests in watch mode

# Database verification
npm run verify:seed       # Validate seed data against the schema
npm run verify:arity      # Check seed VALUES rows match their column lists
npm run verify:live       # Probe the live Supabase project (tables)
npm run verify:schema     # Probe every table + RPC the app calls
npm run verify:dashboard  # Probe the dashboard service queries with a real login
npm run verify:permissions # Show how the RBAC rules resolve for the logged-in user
npm run build:install-sql # Regenerate supabase/install.sql from migrations

# Database
npx supabase db push     # Push migrations to Supabase
npx supabase db reset    # Reset database
npx supabase gen types   # Generate TypeScript types
```

## 🐛 Known Issues

1. `npm audit` reports 2 moderate advisories in `react-router-dom` v6. The fix
   requires a major upgrade to v7, which is a breaking change and has not been
   applied. Both advisories are low risk for this app: one concerns SSR
   hydration (this is a client-only SPA) and the other is an open-redirect in
   `useNavigate`/`Link` (the app never navigates to user-supplied URLs).
2. `npm run lint` (oxlint) reports non-blocking warnings, mostly unused imports
   and `setState`-in-`useEffect` advisories in older form pages.

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Manual Build

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design overview
- [Database Schema](docs/DATABASE.md) - Database structure and relationships
- [Implementation Status](docs/implementation-status.md) - Feature-by-feature status
- [Project Status](PROJECT_STATUS.md) - Completion status and remaining work

> The permission matrix is defined in code at
> `src/types/permission.types.ts` and seeded in
> `supabase/migrations/001_initial_schema.sql`. A standalone `PERMISSIONS.md`,
> `USER_GUIDE.md`, and `DEPLOYMENT.md` have not been written yet.

## 🤝 Contributing

This is a private project. Contact the repository owner for contribution guidelines.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review `PROJECT_STATUS.md` for known issues
3. Contact: your-email@example.com

## 🎯 Roadmap

### Phase 1 (MVP) - ✅ Complete
- Core inventory management
- Transaction processing
- Basic reports
- User authentication

### Phase 2 (Coming Soon)
- Mobile app (React Native)
- Advanced reports (pivot tables)
- Email notifications
- SMS integration
- Barcode scanning
- Multi-warehouse management
- Batch and serial number tracking

### Phase 3 (Future)
- Manufacturing module
- E-commerce integration
- Payment gateway integration
- API for third-party integrations
- Advanced analytics and forecasting
- Multi-currency support

## 🙏 Acknowledgments

- React Team for React 19
- Supabase for the amazing backend platform
- Vercel for hosting
- Radix UI for accessible components
- Tailwind Labs for Tailwind CSS
- The open-source community

---

**Built with ❤️ for businesses that need powerful, modern inventory management.**
