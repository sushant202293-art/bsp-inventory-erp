import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download } from 'lucide-react';
import { containerVariants, itemVariants } from '@/styles/animations';

const ledgerEntries = [
  { date: '2026-09-25', ref: 'PO-001', description: 'Purchase Order - Samsung Galaxy Cases (x100)', debit: '', credit: 'â‚¹1,10,000', balance: 'â‚¹1,10,000' },
  { date: '2026-09-25', ref: 'PAY-001', description: 'Payment Made - NEFT Transfer', debit: 'â‚¹1,10,000', credit: '', balance: 'â‚¹0' },
  { date: '2026-09-18', ref: 'PO-002', description: 'Purchase Order - HP Ink Cartridges (x50)', debit: '', credit: 'â‚¹89,500', balance: 'â‚¹89,500' },
  { date: '2026-09-10', ref: 'PO-003', description: 'Purchase Order - Logitech Mouse (x30)', debit: '', credit: 'â‚¹67,500', balance: 'â‚¹1,57,000' },
  { date: '2026-09-05', ref: 'PAY-002', description: 'Payment Made - UPI', debit: 'â‚¹1,57,000', credit: '', balance: 'â‚¹0' },
];

export default function SupplierLedgerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-[rgb(var(--color-border))]">
            <ArrowLeft className="h-5 w-5 text-[rgb(var(--color-muted))]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Supplier Ledger</h1>
            <p className="text-sm text-[rgb(var(--color-muted))]">TechSource India Pvt Ltd</p>
          </div>
        </div>
        <button className="btn-outline inline-flex items-center gap-2">
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry, i) => (
                <tr key={i}>
                  <td className="text-[rgb(var(--color-muted))]">{entry.date}</td>
                  <td className="font-medium text-[rgb(var(--color-text))]">{entry.ref}</td>
                  <td>{entry.description}</td>
                  <td className="text-right font-medium text-emerald-500">{entry.debit}</td>
                  <td className="text-right font-medium text-red-500">{entry.credit}</td>
                  <td className="text-right font-medium text-[rgb(var(--color-text))]">{entry.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
