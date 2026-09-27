import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Save, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { cn } from '@/lib/utils';
import {
  getCustomer,
  createCustomer,
  updateCustomer,
} from '@/services/customer.service';
import { INDIAN_STATES } from '@/constants';
import type { CustomerFormData } from '@/types/customer.types';

const customerFormSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  code: z.string().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .optional()
    .or(z.literal('')),
  contact_person: z.string().optional(),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone must be at most 15 digits')
    .optional()
    .or(z.literal('')),
  alt_phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  billing_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pin: z.string().optional(),
    country: z.string().default('India'),
  }),
  shipping_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pin: z.string().optional(),
    country: z.string().default('India'),
  }),
  same_as_billing: z.boolean().default(false),
  city: z.string().optional(),
  state: z.string().min(1, 'State is required'),
  pin: z.string().optional(),
  country: z.string().default('India'),
  credit_limit: z.number().min(0, 'Credit limit cannot be negative').default(0),
  credit_period: z.number().min(0, 'Credit period cannot be negative').default(0),
  opening_balance: z.number().default(0),
  opening_balance_type: z.enum(['debit', 'credit']).default('debit'),
  bank_details: z.object({
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    ifsc_code: z.string().optional(),
    branch: z.string().optional(),
  }),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.input<typeof customerFormSchema>;

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canCreate } = usePermissions();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  const form = useForm<FormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      code: '',
      gstin: '',
      pan: '',
      contact_person: '',
      phone: '',
      alt_phone: '',
      email: '',
      billing_address: { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' },
      shipping_address: { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' },
      same_as_billing: false,
      city: '',
      state: '',
      pin: '',
      country: 'India',
      credit_limit: 0,
      credit_period: 0,
      opening_balance: 0,
      opening_balance_type: 'debit',
      bank_details: { bank_name: '', account_number: '', ifsc_code: '', branch: '' },
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isEditing && id) {
      setFetching(true);
      getCustomer(id)
        .then((customer) => {
          const addr = customer.billing_address;
          const shipAddr = customer.shipping_address;
          const bank = customer.bank_details;
          const billingMatch =
            addr && shipAddr &&
            addr.line1 === shipAddr.line1 &&
            addr.city === shipAddr.city &&
            addr.state === shipAddr.state;

          form.reset({
            name: customer.name || '',
            code: customer.code || '',
            gstin: customer.gstin || '',
            pan: customer.pan || '',
            contact_person: customer.contact_person || '',
            phone: customer.phone || '',
            alt_phone: customer.alt_phone || '',
            email: customer.email || '',
            billing_address: {
              line1: addr?.line1 || '',
              line2: addr?.line2 || '',
              city: addr?.city || '',
              state: addr?.state || '',
              pin: addr?.pin || '',
              country: addr?.country || 'India',
            },
            shipping_address: {
              line1: shipAddr?.line1 || '',
              line2: shipAddr?.line2 || '',
              city: shipAddr?.city || '',
              state: shipAddr?.state || '',
              pin: shipAddr?.pin || '',
              country: shipAddr?.country || 'India',
            },
            same_as_billing: billingMatch ?? true,
            city: customer.city || '',
            state: customer.state || '',
            pin: customer.pin || '',
            country: customer.country || 'India',
            credit_limit: customer.credit_limit || 0,
            credit_period: customer.credit_period || 0,
            opening_balance: customer.opening_balance || 0,
            opening_balance_type: customer.opening_balance_type || 'debit',
            bank_details: {
              bank_name: bank?.bank_name || '',
              account_number: bank?.account_number || '',
              ifsc_code: bank?.ifsc_code || '',
              branch: bank?.branch || '',
            },
            notes: customer.notes || '',
            is_active: customer.is_active,
          });
        })
        .catch((error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to load customer',
            variant: 'destructive',
          });
          navigate('/customers');
        })
        .finally(() => setFetching(false));
    }
  }, [id, isEditing, navigate, toast, form]);

  const onSubmit = async (data: FormValues) => {
    if (isEditing && !canEdit('customers')) return;
    if (!isEditing && !canCreate('customers')) return;

    setLoading(true);
    try {
      if (isEditing && id) {
        await updateCustomer(id, data);
        toast({ title: 'Success', description: 'Customer updated successfully', variant: 'success' });
      } else {
        await createCustomer(data as CustomerFormData);
        toast({ title: 'Success', description: 'Customer created successfully', variant: 'success' });
      }
      navigate('/customers');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save customer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sameAsBilling = form.watch('same_as_billing');

  if (fetching) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[300px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[200px]" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <PageHeader
        title={isEditing ? 'Edit Customer' : 'New Customer'}
        description={isEditing ? 'Update customer information' : 'Add a new customer to your records'}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Customers', onClick: () => navigate('/customers') },
          { label: isEditing ? 'Edit' : 'New' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/customers')}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CUST-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN</FormLabel>
                        <FormControl>
                          <Input placeholder="22AAAAA0000A1Z5" maxLength={15} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN</FormLabel>
                        <FormControl>
                          <Input placeholder="ABCDE1234F" maxLength={10} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Inactive customers cannot be used in transactions
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit phone number" maxLength={15} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alt_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternate Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Alternate phone" maxLength={15} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="customer@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="billing_address.line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billing_address.line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Apartment, suite, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_address.pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN Code</FormLabel>
                        <FormControl>
                          <Input placeholder="6-digit PIN" maxLength={6} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Shipping Address</CardTitle>
                <FormField
                  control={form.control}
                  name="same_as_billing"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">Same as billing</FormLabel>
                    </FormItem>
                  )}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {!sameAsBilling && (
                  <>
                    <FormField
                      control={form.control}
                      name="shipping_address.line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Apartment, suite, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shipping_address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipping_address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shipping_address.pin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN Code</FormLabel>
                            <FormControl>
                              <Input placeholder="6-digit PIN" maxLength={6} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipping_address.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="India" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
                {sameAsBilling && (
                  <p className="text-sm text-muted-foreground py-4">
                    Shipping address will be the same as billing address.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Credit Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="credit_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="credit_period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Period (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="opening_balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Balance (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="opening_balance_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balance Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debit">Debit (You owe them)</SelectItem>
                              <SelectItem value="credit">Credit (They owe you)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="bank_details.bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bank name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_details.account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bank_details.ifsc_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                          <Input placeholder="IFSC code" maxLength={11} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_details.branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <FormControl>
                          <Input placeholder="Branch name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Additional notes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/customers')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}
