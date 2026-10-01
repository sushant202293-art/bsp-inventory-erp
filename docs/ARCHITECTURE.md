# BSP Inventory ERP - Architecture Documentation

## System Overview

BSP Inventory is a multi-tenant ERP system built with a modern React frontend and Supabase backend. The architecture follows a clean separation of concerns with a service layer mediating between UI components and the database.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    React App (SPA)                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Modules    │  │  Components  │  │   Contexts   │ │ │
│  │  │  (Pages)     │  │   (UI)       │  │  (State)     │ │ │
│  │  └──────┬───────┘  └──────────────┘  └──────────────┘ │ │
│  │         │                                               │ │
│  │  ┌──────▼──────────────────────────────────────────┐  │ │
│  │  │           Service Layer (API)                    │  │ │
│  │  │  • product.service.ts                            │  │ │
│  │  │  • customer.service.ts                           │  │ │
│  │  │  • transaction.service.ts                        │  │ │
│  │  │  • stock.service.ts                              │  │ │
│  │  └──────┬──────────────────────────────────────────┘  │ │
│  │         │                                               │ │
│  │  ┌──────▼──────────────────────────────────────────┐  │ │
│  │  │         Supabase Client (supabase-js)            │  │ │
│  │  └──────┬──────────────────────────────────────────┘  │ │
│  └─────────┼──────────────────────────────────────────────┘ │
└────────────┼──────────────────────────────────────────────────┘
             │ HTTPS
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  PostgreSQL Database                    │ │
│  │  • Tables (companies, products, transactions, etc.)    │ │
│  │  • Row Level Security (RLS) Policies                   │ │
│  │  • Functions (post_document_stock, etc.)               │ │
│  │  • Triggers (updated_at, audit logging)                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Supabase Auth                          │ │
│  │  • User Authentication (email/password)                │ │
│  │  • Session Management                                  │ │
│  │  • JWT Token Generation                                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Supabase Storage                       │ │
│  │  • Company logos                                       │ │
│  │  • Product images                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

### Tenant Isolation Strategy

Every data row is scoped to a `company_id`:

1. **Company Assignment**: Users are assigned to companies via `profiles.company_id`
2. **Automatic Scoping**: All service layer queries automatically inject `company_id`
3. **RLS Enforcement**: PostgreSQL Row Level Security enforces tenant isolation at the database level
4. **Cache Strategy**: `company_id` is cached per user session for performance

### Tenant Utilities

```typescript
// src/lib/tenant.ts
export async function getCompanyId(): Promise<string>
export async function getCurrentUserId(): Promise<string>
export async function getDefaultWarehouseId(): Promise<string>
```

## Frontend Architecture

### Component Hierarchy

```
App (main.tsx)
├── Providers (AuthProvider, CompanyProvider, ThemeProvider, etc.)
└── Routes
    ├── AuthLayout (login, forgot password)
    └── AppLayout (main app)
        ├── Sidebar (navigation)
        ├── TopHeader (search, notifications, profile)
        └── Outlet (page content)
            └── Module Pages
                ├── DashboardPage
                ├── ProductListPage
                ├── SalesFormPage
                └── ...
```

### State Management

**Context API** is used for global state:

1. **AuthContext**: User authentication, profile, session
2. **CompanyContext**: Current company data and settings
3. **PermissionContext**: User roles and permissions
4. **ThemeContext**: Theme selection and dark/light mode
5. **NotificationContext**: Toast notifications

### Service Layer Pattern

All API calls go through service modules:

```typescript
// Example: src/services/product.service.ts
export async function getProducts(filters, page, perPage) {
  const companyId = await getCompanyId(); // Automatic tenant scoping
  const query = supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId); // RLS also enforces this
  // ... filter, paginate, return
}
```

**Benefits**:
- Centralized business logic
- Automatic tenant isolation
- Consistent error handling
- Easy to mock for testing
- Type-safe with TypeScript

## Backend Architecture

### Database Schema

**Core Tables**:
- `companies` - Tenant/company records
- `profiles` - User profiles (extends auth.users)
- `products` - Product catalog
- `categories` - Hierarchical categories
- `brands` - Product brands
- `units` - Units of measurement
- `customers` - Customer master
- `suppliers` - Supplier master
- `transactions` - All transaction types (sales, purchases, etc.)
- `transaction_items` - Transaction line items
- `stock` - Stock balances per product
- `stock_movements` - Stock movement history
- `payments` - Payment records
- `payment_allocations` - Link payments to invoices
- `warehouses` - Warehouse/location master

**Security Tables**:
- `roles` - Role definitions
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings
- `user_roles` - User-role assignments

### Row Level Security (RLS)

Every table has RLS policies enforcing:

```sql
-- Example: products table RLS
CREATE POLICY "Users can view their company products"
ON products FOR SELECT
USING (
  company_id = get_current_company_id()
);

CREATE POLICY "Users can insert products"
ON products FOR INSERT
WITH CHECK (
  company_id = get_current_company_id()
  AND has_permission('products:write')
);
```

### Database Functions

Critical business logic runs in the database:

1. **post_document_stock** - Atomically posts stock movements
2. **cancel_document_stock** - Reverses stock movements
3. **next_document_number** - Allocates unique document numbers (with advisory locks)
4. **get_current_company_id** - Resolves company_id from JWT
5. **has_permission** - Checks user permissions

### Transaction Processing

```
1. User creates invoice in browser
2. Service layer prepares data
3. Server-side function:
   - Validates data
   - Creates transaction header
   - Creates transaction items
   - Posts stock movements (if applicable)
   - Updates party ledger
   - All in ONE atomic transaction
4. Success/error returned to client
```

## Data Flow Examples

### Creating a Sales Invoice

```
1. SalesFormPage
   ↓ form submission
2. transaction.service.createTransaction()
   ↓ validate & prepare
3. Supabase RPC call
   ↓ atomic transaction
4. PostgreSQL:
   - INSERT into transactions
   - INSERT into transaction_items
   - CALL post_document_stock()
   - UPDATE stock table
   - INSERT into stock_movements
   ↓ success
5. Return to client
   ↓ navigate & toast
6. SalesListPage (updated)
```

### Permission Check Flow

```
1. User navigates to /products/new
   ↓
2. ProtectedRoute checks authentication
   ↓
3. PermissionContext.canCreate('products')
   ↓
4. Check cached permissions array
   ↓ if not found
5. Query database for user's role permissions
   ↓ cache result
6. Return true/false
   ↓ if true
7. Render ProductFormPage
   ↓ if false
8. Navigate to /unauthorized
```

## Security Model

### Authentication Flow

1. User enters email/password
2. Supabase Auth validates credentials
3. JWT token generated and stored in browser
4. JWT includes `user_id` in claims
5. Every API call includes JWT in Authorization header
6. Supabase validates JWT and extracts `user_id`
7. RLS policies use `auth.uid()` to get current user

### Authorization Flow

1. User action requires permission check
2. Frontend checks `PermissionContext`
3. Backend checks RLS policies
4. Both must pass for operation to succeed

### Defense in Depth

- **Frontend**: UI hides unauthorized actions
- **Service Layer**: Checks permissions before API calls
- **RLS Policies**: Database enforces rules even if frontend bypassed
- **Application Logic**: Business rules validated server-side

## Performance Optimizations

### Caching Strategy

1. **Company ID**: Cached per user session
2. **User Permissions**: Cached after first load
3. **Theme**: Cached in localStorage
4. **Sidebar State**: Cached in localStorage

### Database Optimizations

1. **Indexes**: On company_id, foreign keys, document_date
2. **Advisory Locks**: For document number allocation
3. **Materialized Views**: For complex reports (future)
4. **Query Optimization**: Select only needed columns

### Frontend Optimizations

1. **Code Splitting**: React.lazy() for all pages
2. **Tree Shaking**: Vite removes unused code
3. **Image Optimization**: Lazy loading images
4. **Virtual Scrolling**: For large tables (TanStack Table)

## Deployment Architecture

### Development

```
Local Machine
├── npm run dev (Vite dev server)
└── Supabase (cloud or local)
```

### Production

```
Vercel Edge Network
├── Static Assets (CDN)
├── React App (SSG)
└── API Routes (Serverless)
    ↓
Supabase Cloud
├── PostgreSQL (managed)
├── Auth (managed)
└── Storage (S3-compatible)
```

## Technology Choices & Rationale

| Technology | Rationale |
|------------|-----------|
| **React 19** | Latest features, performance improvements |
| **TypeScript 6** | Type safety, better DX, fewer runtime errors |
| **Vite 8** | Fast dev server, optimized builds |
| **Supabase** | PostgreSQL + Auth + Storage, great DX |
| **Tailwind CSS** | Utility-first, fast styling, small bundle |
| **Radix UI** | Accessible, unstyled, composable |
| **Framer Motion** | Smooth animations with good DX |
| **React Hook Form** | Performant forms with easy validation |
| **Zod** | Runtime type validation for forms |
| **TanStack Table** | Powerful table library for data grids |
| **Recharts** | Declarative charts built on D3 |

## Design Patterns

### Service Layer Pattern
- Abstracts Supabase API calls
- Centralizes business logic
- Automatic tenant isolation

### Context API Pattern
- Global state without Redux complexity
- Avoids prop drilling
- Easy to test and mock

### Compound Components
- UI components built with Radix UI primitives
- Flexible, composable, accessible

### Form State Management
- React Hook Form for performance
- Zod schemas for validation
- Controlled components for complex logic

### Error Boundaries
- Catch rendering errors
- Show user-friendly fallback UI
- Log errors for debugging

## Scalability Considerations

### Current Capacity
- **Users**: 100s per company
- **Products**: 10,000s
- **Transactions**: 100,000s per year
- **Concurrent Users**: 50+ per company

### Bottlenecks & Solutions
1. **Large Transaction Lists**: Pagination + virtual scrolling
2. **Complex Reports**: Database-side aggregation
3. **Image Storage**: CDN for product images
4. **Real-time Updates**: Supabase Realtime (future)

### Horizontal Scaling
- **Frontend**: Vercel auto-scales
- **Database**: Supabase managed scaling
- **Storage**: Object storage scales infinitely

## Monitoring & Observability

### Current (Minimal)
- Browser console errors
- Supabase dashboard metrics

### Recommended Additions
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Database query analysis (pg_stat_statements)
- User analytics (PostHog, Mixpanel)

## Future Architecture Enhancements

1. **Microservices**: Split into inventory, accounting, CRM services
2. **Event Sourcing**: Store all state changes as events
3. **CQRS**: Separate read and write models
4. **Redis Cache**: For frequently accessed data
5. **GraphQL**: Replace REST with GraphQL API
6. **Offline Support**: PWA with service workers
7. **Real-time Sync**: WebSocket updates for stock changes
8. **Audit Trail**: Comprehensive change tracking
9. **API Gateway**: Rate limiting, API versioning
10. **Kubernetes**: Container orchestration for complex deployments

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-27  
**Maintained By**: Development Team
