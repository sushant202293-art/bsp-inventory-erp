import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  getSupplier,
  createSupplier,
  updateSupplier,
} from '@/services/supplier.service';
import { INDIAN_STATES } from '@/constants';
import type { SupplierFormData } from '@/types/supplier.types';

const supplierFormSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
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
  opening_balance_type: z.enum(['debit', 'credit']).default('credit'),
  payment_terms: z.string().optional(),
  bank_details: z.object({
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    ifsc_code: z.string().optional(),
    branch: z.string().optional(),
  }),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.input<typeof supplierFormSchema>;

export default function SupplierFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canCreate } = usePermissions();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  const form = useForm<FormValues>({
    resolver: zodResolver(supplierFormSchema),
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
      opening_balance_type: 'credit',
      payment_terms: '',
      bank_details: { bank_name: '', account_number: '', ifsc_code: '', branch: '' },
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isEditing && id) {
      setFetching(true);
      getSupplier(id)
        .then((supplier) => {
          const addr = supplier.billing_address;
          const shipAddr = supplier.shipping_address;
          const bank = supplier.bank_details;
          const billingMatch =
            addr && shipAddr &&
            addr.line1 === shipAddr.line1 &&
            addr.city === shipAddr.city &&
            addr.state === shipAddr.state;

          form.reset({
            name: supplier.name || '',
            code: supplier.code || '',
            gstin: supplier.gstin || '',
            pan: supplier.pan || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            alt_phone: supplier.alt_phone || '',
            email: supplier.email || '',
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
            city: supplier.city || '',
            state: supplier.state || '',
            pin: supplier.pin || '',
            country: supplier.country || 'India',
            credit_limit: supplier.credit_limit || 0,
            credit_period: supplier.credit_period || 0,
            opening_balance: supplier.opening_balance || 0,
            opening_balance_type: supplier.opening_balance_type || 'credit',
            payment_terms: supplier.payment_terms || '',
            bank_details: {
              bank_name: bank?.bank_name || '',
              account_number: bank?.account_number || '',
              ifsc_code: bank?.ifsc_code || '',
              branch: bank?.branch || '',
            },
            notes: supplier.notes || '',
            is_active: supplier.is_active,
          });
        })
        .catch((error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to load supplier',
            variant: 'destructive',
          });
          navigate('/suppliers');
        })
        .finally(() => setFetching(false));
    }
  }, [id, isEditing, navigate, toast, form]);

  const onSubmit = async (data: FormValues) => {
    if (isEditing && !canEdit('suppliers')) return;
    if (!isEditing && !canCreate('suppliers')) return;

    setLoading(true);
    try {
      if (isEditing && id) {
        await updateSupplier(id, data);
        toast({ title: 'Success', description: 'Supplier updated successfully', variant: 'success' });
      } else {
        await createSupplier(data as SupplierFormData);
        toast({ title: 'Success', description: 'Supplier created successfully', variant: 'success' });
      }
      navigate('/suppliers');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save supplier',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sameAsBilling = form.watch('same_as_billing');

  if (fetching) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-[300px] animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="h-6 w-[200px] animate-pulse rounded bg-muted" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={isEditing ? 'Edit Supplier' : 'New Supplier'}
        description={isEditing ? 'Update supplier information' : 'Add a new supplier to your records'}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Suppliers', onClick: () => navigate('/suppliers') },
          { label: isEditing ? 'Edit' : 'New' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/suppliers')}>
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter supplier name" {...field} />
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
                      <FormLabel>Supplier Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SUPP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
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
                          Inactive suppliers cannot be used in transactions
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
              <CardContent className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                        <Input type="email" placeholder="supplier@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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
              <CardContent className="space-y-3">
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
                    <div className="grid grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Credit & Payment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                              <SelectItem value="debit">Debit (We owe them)</SelectItem>
                              <SelectItem value="credit">Credit (They owe us)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Net 30, 2% 10 Net 30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
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
            <Button type="button" variant="outline" onClick={() => navigate('/suppliers')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
