import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Phone, Mail, MapPin, BookOpen } from 'lucide-react';
import { containerVariants, itemVariants } from '@/styles/animations';

const supplierData = {
  name: 'TechSource India Pvt Ltd',
  contact: 'Mahesh Agarwal',
  email: 'mahesh@techsource.in',
  phone: '+91 98200 12345',
  address: '101, Andheri Kurla Road, Andheri East',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400069',
  gstin: '27BBBBB0000B2Z5',
  bankName: 'HDFC Bank',
  bankAccount: '50100012345678',
  ifsc: 'HDFC0001234',
  balance: 'â‚¹2,34,500',
  totalOrders: 62,
  totalPurchased: 'â‚¹45,67,800',
};

export default function SupplierDetailPage() {
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
            <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">{supplierData.name}</h1>
            <p className="text-sm text-[rgb(var(--color-muted))]">Contact: {supplierData.contact}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/suppliers/${id}/ledger`} className="btn-outline inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Ledger
          </Link>
          <Link to={`/suppliers/${id}/edit`} className="btn-primary inline-flex items-center gap-2">
            <Edit className="h-4 w-4" /> Edit
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="card space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">Contact Information</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-[rgb(var(--color-border))] p-3">
              <Phone className="mt-0.5 h-4 w-4 text-[rgb(var(--color-muted))]" />
              <div><p className="text-xs text-[rgb(var(--color-muted))]">Phone</p><p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.phone}</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-[rgb(var(--color-border))] p-3">
              <Mail className="mt-0.5 h-4 w-4 text-[rgb(var(--color-muted))]" />
              <div><p className="text-xs text-[rgb(var(--color-muted))]">Email</p><p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.email}</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-[rgb(var(--color-border))] p-3">
              <MapPin className="mt-0.5 h-4 w-4 text-[rgb(var(--color-muted))]" />
              <div><p className="text-xs text-[rgb(var(--color-muted))]">Address</p><p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.address}, {supplierData.city}</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-[rgb(var(--color-border))] p-3">
              <span className="mt-0.5 text-xs font-medium text-[rgb(var(--color-muted))]">GST</span>
              <div><p className="text-xs text-[rgb(var(--color-muted))]">GSTIN</p><p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.gstin}</p></div>
            </div>
          </div>
          <h3 className="text-sm font-semibold text-[rgb(var(--color-text))]">Bank Details</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[rgb(var(--color-border))] p-3">
              <p className="text-xs text-[rgb(var(--color-muted))]">Bank</p>
              <p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.bankName}</p>
            </div>
            <div className="rounded-lg border border-[rgb(var(--color-border))] p-3">
              <p className="text-xs text-[rgb(var(--color-muted))]">Account</p>
              <p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.bankAccount}</p>
            </div>
            <div className="rounded-lg border border-[rgb(var(--color-border))] p-3">
              <p className="text-xs text-[rgb(var(--color-muted))]">IFSC</p>
              <p className="text-sm font-medium text-[rgb(var(--color-text))]">{supplierData.ifsc}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card space-y-4">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">Summary</h2>
          <div className="space-y-3">
            <div className="rounded-lg bg-[rgb(var(--color-background))] p-3 text-center">
              <p className="text-2xl font-bold text-[rgb(var(--color-text))]">{supplierData.balance}</p>
              <p className="text-xs text-[rgb(var(--color-muted))]">Outstanding Payable</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[rgb(var(--color-border))] p-3 text-center">
                <p className="text-lg font-bold text-[rgb(var(--color-text))]">{supplierData.totalOrders}</p>
                <p className="text-xs text-[rgb(var(--color-muted))]">Total Orders</p>
              </div>
              <div className="rounded-lg border border-[rgb(var(--color-border))] p-3 text-center">
                <p className="text-lg font-bold text-[rgb(var(--color-text))]">{supplierData.totalPurchased}</p>
                <p className="text-xs text-[rgb(var(--color-muted))]">Total Purchased</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
