import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  getCustomer,
  createCustomer,
  updateCustomer,
} from '@/services/customer.service';
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

const LABEL_CLS =
  'block mb-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider';
const INPUT_CLS =
  'h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus-visible:border-cyan-500 focus-visible:ring-cyan-500';
const SECTION_CLS = 'space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5';
const SECTION_TITLE_CLS = 'text-[11px] font-medium text-slate-400 uppercase tracking-wider';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canCreate } = usePermissions();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [showAdditional, setShowAdditional] = useState(false);

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

          if (
            bank?.bank_name || bank?.account_number || customer.notes ||
            customer.credit_limit || customer.opening_balance
          ) {
            setShowAdditional(true);
          }
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

  const handleClose = () => {
    navigate('/customers');
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100"
      >
        {/* Header (Pinned) */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="space-y-0.5">
            <h2 id="customer-modal-title" className="text-base font-semibold text-slate-100">
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEditing
                ? 'Update customer details in your business records.'
                : 'Quickly register a customer to your business records.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {fetching ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              ) : (
                <>
                  {/* Section 1: Identification & Tax */}
                  <div className={SECTION_CLS}>
                    <h3 className={SECTION_TITLE_CLS}>Identification &amp; Tax</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_CLS}>
                                Customer Name <span className="text-rose-400">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input className={INPUT_CLS} placeholder="e.g., Acme Traders Pvt Ltd" {...field} />
                              </FormControl>
                              <FormMessage className="text-[11px] text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_CLS}>Customer Code</FormLabel>
                              <FormControl>
                                <Input className={INPUT_CLS} placeholder="e.g., CUST-001" {...field} />
                              </FormControl>
                              <FormMessage className="text-[11px] text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="gstin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_CLS}>GSTIN</FormLabel>
                            <FormControl>
                              <Input className={INPUT_CLS} placeholder="22AAAAA0000A1Z5" maxLength={15} {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px] text-rose-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_CLS}>PAN</FormLabel>
                            <FormControl>
                              <Input className={INPUT_CLS} placeholder="ABCDE1234F" maxLength={10} {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px] text-rose-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="block text-xs font-medium text-slate-300">
                              Active Status
                            </FormLabel>
                            <p className="text-[11px] text-slate-500">
                              Inactive customers cannot be used in transactions
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Section 2: Contact */}
                  <div className={SECTION_CLS}>
                    <h3 className={SECTION_TITLE_CLS}>Contact</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="contact_person"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_CLS}>Contact Person</FormLabel>
                            <FormControl>
                              <Input className={INPUT_CLS} placeholder="e.g., Ramesh Kumar" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px] text-rose-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_CLS}>Phone</FormLabel>
                            <FormControl>
                              <Input className={INPUT_CLS} placeholder="10-digit phone number" maxLength={15} {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px] text-rose-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_CLS}>Email</FormLabel>
                            <FormControl>
                              <Input type="email" className={INPUT_CLS} placeholder="customer@example.com" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px] text-rose-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alt_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_CLS}>Alternate Phone</FormLabel>
                            <FormControl>
                              <Input className={INPUT_CLS} placeholder="Alternate phone" maxLength={15} {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px] text-rose-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Section 3: Addresses */}
                  <div className={SECTION_CLS}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className={SECTION_TITLE_CLS}>Addresses</h3>
                      <FormField
                        control={form.control}
                        name="same_as_billing"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs font-medium text-slate-300">
                              Shipping same as billing
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Billing */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">
                          Billing Address
                        </p>
                        <FormField
                          control={form.control}
                          name="billing_address.line1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_CLS}>Address Line 1</FormLabel>
                              <FormControl>
                                <Input className={INPUT_CLS} placeholder="Street address" {...field} />
                              </FormControl>
                              <FormMessage className="text-[11px] text-rose-400" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="billing_address.line2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_CLS}>Address Line 2</FormLabel>
                              <FormControl>
                                <Input className={INPUT_CLS} placeholder="Apartment, suite, etc." {...field} />
                              </FormControl>
                              <FormMessage className="text-[11px] text-rose-400" />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="billing_address.city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>City</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="City" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="billing_address.state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>State</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="State" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="billing_address.pin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>PIN Code</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="6-digit PIN" maxLength={6} {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="billing_address.country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Country</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="India" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Shipping */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">
                          Shipping Address
                        </p>
                        {!sameAsBilling && (
                          <>
                            <FormField
                              control={form.control}
                              name="shipping_address.line1"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={LABEL_CLS}>Address Line 1</FormLabel>
                                  <FormControl>
                                    <Input className={INPUT_CLS} placeholder="Street address" {...field} />
                                  </FormControl>
                                  <FormMessage className="text-[11px] text-rose-400" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="shipping_address.line2"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={LABEL_CLS}>Address Line 2</FormLabel>
                                  <FormControl>
                                    <Input className={INPUT_CLS} placeholder="Apartment, suite, etc." {...field} />
                                  </FormControl>
                                  <FormMessage className="text-[11px] text-rose-400" />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name="shipping_address.city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={LABEL_CLS}>City</FormLabel>
                                    <FormControl>
                                      <Input className={INPUT_CLS} placeholder="City" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-[11px] text-rose-400" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="shipping_address.state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={LABEL_CLS}>State</FormLabel>
                                    <FormControl>
                                      <Input className={INPUT_CLS} placeholder="State" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-[11px] text-rose-400" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="shipping_address.pin"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={LABEL_CLS}>PIN Code</FormLabel>
                                    <FormControl>
                                      <Input className={INPUT_CLS} placeholder="6-digit PIN" maxLength={6} {...field} />
                                    </FormControl>
                                    <FormMessage className="text-[11px] text-rose-400" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="shipping_address.country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={LABEL_CLS}>Country</FormLabel>
                                    <FormControl>
                                      <Input className={INPUT_CLS} placeholder="India" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-[11px] text-rose-400" />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </>
                        )}
                        {sameAsBilling && (
                          <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                            Shipping address will be the same as billing address.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progressive Disclosure: Credit, Bank & Notes */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdditional((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/50 hover:text-slate-100"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-semibold">{showAdditional ? '−' : '+'}</span>
                        <span>
                          {showAdditional ? 'Hide Credit, Bank & Notes' : 'Add Credit, Bank & Notes'}
                        </span>
                      </span>
                      {showAdditional ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {showAdditional && (
                      <div className="border-t border-slate-800/80 p-3.5 space-y-3 animate-in fade-in duration-150">
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Credit Settings
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="credit_limit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Credit Limit (₹)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    className={INPUT_CLS}
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="credit_period"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Credit Period (days)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    className={INPUT_CLS}
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="opening_balance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Opening Balance (₹)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    className={INPUT_CLS}
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="opening_balance_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Balance Type</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className={INPUT_CLS}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                                      <SelectItem value="debit">Debit (You owe them)</SelectItem>
                                      <SelectItem value="credit">Credit (They owe you)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <p className="pt-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Bank Details
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="bank_details.bank_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Bank Name</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="Bank name" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bank_details.account_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Account Number</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="Account number" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bank_details.ifsc_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>IFSC Code</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="IFSC code" maxLength={11} {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bank_details.branch"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={LABEL_CLS}>Branch</FormLabel>
                                <FormControl>
                                  <Input className={INPUT_CLS} placeholder="Branch name" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px] text-rose-400" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_CLS}>Notes</FormLabel>
                              <FormControl>
                                <textarea
                                  className="min-h-[70px] w-full rounded-md border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus-visible:border-cyan-500 focus-visible:ring-cyan-500"
                                  placeholder="Additional notes..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-[11px] text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer (Pinned) */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/80 px-6 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="h-9 border-slate-700 bg-transparent px-4 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || fetching}
                className="h-9 bg-cyan-600 px-4 text-xs font-medium text-white shadow-sm transition-all hover:bg-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-400 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    <span>{isEditing ? 'Update Customer' : 'Save Customer'}</span>
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
