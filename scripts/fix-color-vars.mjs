// Wraps bare var(--color-*) references in rgb() so the RGB-triplet theme
// variables produce valid CSS. Idempotent: already-wrapped and
// rgb(var(--x) / 0.5) forms are left alone.
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'src/components/layout/ConfirmDialog.tsx',
  'src/components/layout/NotificationPanel.tsx',
  'src/components/layout/ProfileDropdown.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/TopHeader.tsx',
  'src/layouts/AppLayout.tsx',
  'src/layouts/AuthLayout.tsx',
  'src/modules/suppliers/SupplierDetailPage.tsx',
  'src/modules/suppliers/SupplierLedgerPage.tsx',
  'src/styles/animations.ts',
  'src/styles/globals.css',
];

// negative lookbehind so rgb(var(--x)) and rgb(var(--x) / a) are skipped
const BARE = /(?<!rgb\()var\(--color-[a-z0-9-]+\)/g;

let totalPatched = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf8');
  const n = (before.match(BARE) || []).length;
  if (n === 0) { console.log(`  0  ${f}`); continue; }
  writeFileSync(f, before.replace(BARE, (m) => `rgb(${m})`));
  totalPatched += n;
  console.log(`  ${String(n).padStart(3)}  ${f}`);
}
console.log(`\npatched ${totalPatched} bare var(--color-*) references`);
