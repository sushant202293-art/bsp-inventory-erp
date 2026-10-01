import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Landmark, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  loadBillingConfig,
  savePaymentMethods,
  saveBankAccounts,
} from '../billing-config.service';
import type { ConfiguredBankAccount, PaymentMethodConfig } from '@/types/database.types';

function blankAccount(): ConfiguredBankAccount {
  return {
    id: `bank-${Date.now()}`,
    display_name: '',
    bank_name: '',
    account_holder: '',
    account_number: '',
    ifsc: '',
    branch: '',
    account_type: 'savings',
    upi_id: '',
    is_active: true,
    is_default: false,
  };
}

/**
 * Settings -> Payments: which methods a document may be settled with, and the
 * bank accounts printed on invoices (and picked in the payment rows).
 */
export function PaymentMethodsSettings() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [accounts, setAccounts] = useState<ConfiguredBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMethods, setSavingMethods] = useState(false);
  const [savingAccounts, setSavingAccounts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadBillingConfig()
      .then((config) => {
        if (cancelled) return;
        setMethods(config.paymentMethods);
        setAccounts(config.bankAccounts);
      })
      .catch((error) => {
        if (!cancelled) {
          toast({
            title: 'Could not load payments settings',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patchMethod(index: number, partial: Partial<PaymentMethodConfig>) {
    setMethods((prev) => prev.map((row, i) => (i === index ? { ...row, ...partial } : row)));
  }

  function patchAccount(index: number, partial: Partial<ConfiguredBankAccount>) {
    setAccounts((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, ...partial } : row));
      // Only one account may be flagged as the default.
      if (partial.is_default) {
        return next.map((row, i) => ({ ...row, is_default: i === index }));
      }
      return next;
    });
  }

  async function persistMethods() {
    setSavingMethods(true);
    try {
      await savePaymentMethods(methods);
      toast({ title: 'Saved', description: 'Payment methods updated' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSavingMethods(false);
    }
  }

  async function persistAccounts() {
    setSavingAccounts(true);
    try {
      await saveBankAccounts(accounts);
      toast({ title: 'Saved', description: 'Bank accounts updated' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSavingAccounts(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Methods</CardTitle>
          <Button size="sm" onClick={persistMethods} disabled={savingMethods}>
            {savingMethods ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Save methods
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Enabled methods appear in the payment rows of every invoice. Bank Transfer and Cheque
            also ask which account the money landed in.
          </p>
          {methods.map((method, index) => (
            <div
              key={method.key}
              className="flex flex-wrap items-center gap-3 rounded border border-border px-3 py-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={method.enabled}
                  onChange={(e) => patchMethod(index, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                {method.label}
              </label>
              <Input
                value={method.label}
                onChange={(e) => patchMethod(index, { label: e.target.value })}
                className="h-8 w-40"
                aria-label={`Label for ${method.key}`}
              />
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                writes mode &ldquo;{method.key}&rdquo;
              </span>
              {method.requires_bank ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                  needs bank account
                </span>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4" /> Bank Accounts
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAccounts((prev) => [...prev, blankAccount()])}>
              <Plus className="mr-1 h-3 w-3" /> Add account
            </Button>
            <Button size="sm" onClick={persistAccounts} disabled={savingAccounts}>
              {savingAccounts ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
              Save accounts
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These are printed on invoices and offered in the payment rows. Account numbers are
            masked on the printed document.
          </p>

          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bank account configured yet.</p>
          ) : (
            accounts.map((account, index) => (
              <div key={account.id} className="space-y-3 rounded border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={account.is_active}
                      onChange={(e) => patchAccount(index, { is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-input"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="default-bank"
                      checked={account.is_default}
                      onChange={() => patchAccount(index, { is_default: true })}
                    />
                    Default account
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAccounts((prev) => prev.filter((_, i) => i !== index))}
                    title="Remove account"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Display name</Label>
                    <Input
                      value={account.display_name}
                      onChange={(e) => patchAccount(index, { display_name: e.target.value })}
                      placeholder="HDFC Current A/c"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bank name</Label>
                    <Input
                      value={account.bank_name}
                      onChange={(e) => patchAccount(index, { bank_name: e.target.value })}
                      placeholder="HDFC Bank"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account holder</Label>
                    <Input
                      value={account.account_holder}
                      onChange={(e) => patchAccount(index, { account_holder: e.target.value })}
                      placeholder="BSP Inventory Pvt Ltd"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account number</Label>
                    <Input
                      value={account.account_number}
                      onChange={(e) => patchAccount(index, { account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IFSC</Label>
                    <Input
                      value={account.ifsc}
                      onChange={(e) => patchAccount(index, { ifsc: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">UPI ID</Label>
                    <Input
                      value={account.upi_id}
                      onChange={(e) => patchAccount(index, { upi_id: e.target.value })}
                      placeholder="name@bank"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
