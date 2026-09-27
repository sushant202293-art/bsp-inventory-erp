import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Pencil,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getCustomer, getCustomerLedger } from '@/services/customer.service';
import type { CustomerWithRelations } from '@/types/customer.types';
import type { CustomerLedgerResponse } from '@/types/customer.types';

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = usePermissions();

  const [customer, setCustomer] = useState<CustomerWithRelations | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCustomer(id)
      .then(setCustomer)
      .catch((error) => {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load customer',
          variant: 'destructive',
        });
        navigate('/customers');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  const loadLedger = async () => {
    if (!id) return;
    setLedgerLoading(true);
    try {
      const data = await getCustomerLedger(id);
      setLedger(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load ledger',
        variant: 'destructive',
      });
    } finally {
      setLedgerLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[300px]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const billingAddr = customer.billing_address;
  const bankDetails = customer.bank_details;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <PageHeader
        title={customer.name}
        description={`Customer Code: ${customer.code || 'N/A'}`}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Customers', onClick: () => navigate('/customers') },
          { label: customer.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/customers')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/ledgers/customers?customer_id=${customer.id}`)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Ledger
            </Button>
            {canEdit('customers') && (
              <Button onClick={() => navigate(`/customers/${customer.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">{customer.code || 'No code'}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {customer.gstin && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">GSTIN:</span>
                  <span className="font-mono">{customer.gstin}</span>
                </div>
              )}
              {customer.pan && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">PAN:</span>
                  <span className="font-mono">{customer.pan}</span>
                </div>
              )}
              {customer.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-4 w-4 text-muted-foreground font-medium">👤</span>
                  <span className="text-muted-foreground">Contact:</span>
                  <span>{customer.contact_person}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{customer.email}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Badge variant={customer.is_active ? 'success' : 'secondary'}>
                {customer.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" onValueChange={(v) => v === 'ledger' && !ledger && loadLedger()}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {billingAddr ? (
                      <div className="text-sm space-y-1">
                        <p>{billingAddr.line1}</p>
                        {billingAddr.line2 && <p>{billingAddr.line2}</p>}
                        <p>{[billingAddr.city, billingAddr.state, billingAddr.pin].filter(Boolean).join(', ')}</p>
                        <p>{billingAddr.country}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address on file</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Credit Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credit Limit</span>
                      <span className="font-medium">{formatCurrency(customer.credit_limit || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credit Period</span>
                      <span className="font-medium">{customer.credit_period || 0} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Opening Balance</span>
                      <span className="font-medium">{formatCurrency(customer.opening_balance || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance Type</span>
                      <Badge variant={customer.opening_balance_type === 'debit' ? 'warning' : 'info'}>
                        {customer.opening_balance_type === 'debit' ? 'Debit' : 'Credit'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {bankDetails && bankDetails.bank_name && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Bank Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bank</span>
                        <span>{bankDetails.bank_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Account No</span>
                        <span className="font-mono">{bankDetails.account_number}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IFSC</span>
                        <span className="font-mono">{bankDetails.ifsc_code}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Branch</span>
                        <span>{bankDetails.branch}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Outstanding Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      'text-3xl font-bold',
                      (customer.opening_balance || 0) > 0 ? 'text-red-500' : (customer.opening_balance || 0) < 0 ? 'text-green-500' : 'text-foreground'
                    )}>
                      {formatCurrency(customer.opening_balance || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(customer.opening_balance || 0) > 0
                        ? 'Amount owed by customer'
                        : (customer.opening_balance || 0) < 0
                        ? 'Advance from customer'
                        : 'No outstanding balance'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {customer.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ledger" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Account Ledger</CardTitle>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    Print
                  </Button>
                </CardHeader>
                <CardContent>
                  {ledgerLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : ledger ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Opening Balance</p>
                          <p className="text-lg font-semibold">{formatCurrency(ledger.opening_balance)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Total Debit</p>
                          <p className="text-lg font-semibold text-red-500">{formatCurrency(ledger.total_debit)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Total Credit</p>
                          <p className="text-lg font-semibold text-green-500">{formatCurrency(ledger.total_credit)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Closing Balance</p>
                          <p className={cn(
                            'text-lg font-semibold',
                            ledger.closing_balance > 0 ? 'text-red-500' : ledger.closing_balance < 0 ? 'text-green-500' : ''
                          )}>
                            {formatCurrency(ledger.closing_balance)}
                          </p>
                        </div>
                      </div>

                      {ledger.entries.length > 0 ? (
                        <div className="rounded-md border overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Description</th>
                                <th className="px-4 py-2 text-right">Debit</th>
                                <th className="px-4 py-2 text-right">Credit</th>
                                <th className="px-4 py-2 text-right">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.entries.map((entry) => (
                                <tr key={entry.id} className="border-t">
                                  <td className="px-4 py-2">{formatDate(entry.date)}</td>
                                  <td className="px-4 py-2">{entry.description}</td>
                                  <td className="px-4 py-2 text-right">
                                    {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                  </td>
                                  <td className={cn(
                                    'px-4 py-2 text-right font-medium',
                                    entry.balance > 0 ? 'text-red-500' : entry.balance < 0 ? 'text-green-500' : ''
                                  )}>
                                    {formatCurrency(entry.balance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No ledger entries found</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Click the Ledger tab to load entries</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Transaction history will be displayed here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Payment history will be displayed here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}
