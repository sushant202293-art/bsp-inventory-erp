import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings, Building, FileText, CreditCard, Landmark, Globe, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  const { company, settings, updateCompany, updateSettings } = useCompany();
  const { user, profile, updatePassword, updateProfile } = useAuth();
  const [companyData, setCompanyData] = useState({
    name: '', tagline: '', address: '', city: '', state: '', pin: '', country: 'India',
    phone: '', email: '', website: '', gstin: '', pan: '',
  });
  const [docSettings, setDocSettings] = useState({
    quotation_prefix: 'QT-', po_prefix: 'PO-', pi_prefix: 'PI-', sales_prefix: 'INV-',
    number_padding: 5, financial_year: new Date().getFullYear().toString(),
  });
  const [bankData, setBankData] = useState({ bank_name: '', account_name: '', account_number: '', ifsc: '', branch: '', upi: '' });

  // Account / credential fields. Kept separate from the company data above
  // because they write to auth.users and public.profiles, not to companies.
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (company) setCompanyData({ name: company.name || '', tagline: company.tagline || '', address: company.address || '', city: company.city || '', state: company.state || '', pin: company.pin || '', country: company.country || 'India', phone: company.phone || '', email: company.email || '', website: company.website || '', gstin: company.gstin || '', pan: company.pan || '' });
    if (settings?.bank_accounts?.[0]) setBankData(settings.bank_accounts[0]);
  }, [company, settings]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setNewEmail(user?.email || '');
  }, [profile, user]);

  async function saveCompany() {
    try {
      await updateCompany(companyData);
      toast({ title: 'Saved', description: 'Company settings updated' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  async function saveDocSettings() {
    try {
      await updateSettings({ document_settings: docSettings });
      toast({ title: 'Saved', description: 'Document settings updated' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  async function saveBank() {
    try {
      await updateSettings({ bank_accounts: [bankData] });
      toast({ title: 'Saved', description: 'Bank details updated' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  async function saveName() {
    setSavingProfile(true);
    const { error } = await updateProfile({ full_name: fullName });
    setSavingProfile(false);
    if (error) return toast({ title: 'Error', description: error, variant: 'destructive' });
    toast({ title: 'Saved', description: 'Your display name has been updated' });
  }

  async function saveEmail() {
    const target = newEmail.trim().toLowerCase();
    if (target === (user?.email || '').toLowerCase()) {
      return toast({ title: 'No change', description: 'That is already your email address' });
    }
    setSavingEmail(true);
    // Supabase sends a confirmation link to the new address; the change only
    // applies once that link is opened.
    const { error } = await supabase.auth.updateUser({ email: target });
    setSavingEmail(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({
      title: 'Confirmation sent',
      description: `Open the link in the email sent to ${target} to finish changing your email`,
    });
  }

  async function savePassword() {
    if (pw.next.length < 8) {
      return toast({ title: 'Too short', description: 'Use at least 8 characters', variant: 'destructive' });
    }
    if (pw.next !== pw.confirm) {
      return toast({ title: 'Mismatch', description: 'The two passwords do not match', variant: 'destructive' });
    }
    setSavingPw(true);
    const { error } = await updatePassword(pw.next);
    setSavingPw(false);
    if (error) return toast({ title: 'Error', description: error, variant: 'destructive' });
    setPw({ next: '', confirm: '' });
    toast({
      title: 'Password updated',
      description: 'Use your new password the next time you sign in',
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Application Settings</h1><p className="text-sm text-muted-foreground">Configure your application preferences</p></div>

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company"><Building className="mr-1 h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-1 h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="bank"><Landmark className="mr-1 h-4 w-4" /> Bank</TabsTrigger>
          <TabsTrigger value="tax"><CreditCard className="mr-1 h-4 w-4" /> Tax</TabsTrigger>
          <TabsTrigger value="general"><Globe className="mr-1 h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="account"><KeyRound className="mr-1 h-4 w-4" /> Account</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card><CardHeader><CardTitle>Company Information</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Company Name</Label><Input value={companyData.name} onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tagline</Label><Input value={companyData.tagline} onChange={(e) => setCompanyData({ ...companyData, tagline: e.target.value })} /></div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={companyData.address} onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })} rows={2} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={companyData.city} onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={companyData.state} onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })} /></div>
              <div className="space-y-2"><Label>PIN</Label><Input value={companyData.pin} onChange={(e) => setCompanyData({ ...companyData, pin: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={companyData.phone} onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={companyData.email} onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Website</Label><Input value={companyData.website} onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })} /></div>
              <div className="space-y-2"><Label>GSTIN</Label><Input value={companyData.gstin} onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value })} /></div>
              <div className="space-y-2"><Label>PAN</Label><Input value={companyData.pan} onChange={(e) => setCompanyData({ ...companyData, pan: e.target.value })} /></div>
            </div>
            <Button onClick={saveCompany}>Save Company Details</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card><CardHeader><CardTitle>Document Numbering</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Quotation Prefix</Label><Input value={docSettings.quotation_prefix} onChange={(e) => setDocSettings({ ...docSettings, quotation_prefix: e.target.value })} /></div>
              <div className="space-y-2"><Label>PO Prefix</Label><Input value={docSettings.po_prefix} onChange={(e) => setDocSettings({ ...docSettings, po_prefix: e.target.value })} /></div>
              <div className="space-y-2"><Label>PI Prefix</Label><Input value={docSettings.pi_prefix} onChange={(e) => setDocSettings({ ...docSettings, pi_prefix: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sales Invoice Prefix</Label><Input value={docSettings.sales_prefix} onChange={(e) => setDocSettings({ ...docSettings, sales_prefix: e.target.value })} /></div>
              <div className="space-y-2"><Label>Number Padding</Label><Input type="number" value={docSettings.number_padding} onChange={(e) => setDocSettings({ ...docSettings, number_padding: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Financial Year</Label><Input value={docSettings.financial_year} onChange={(e) => setDocSettings({ ...docSettings, financial_year: e.target.value })} /></div>
            </div>
            <Button onClick={saveDocSettings}>Save Document Settings</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card><CardHeader><CardTitle>Bank Details</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Bank Name</Label><Input value={bankData.bank_name} onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Account Name</Label><Input value={bankData.account_name} onChange={(e) => setBankData({ ...bankData, account_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Account Number</Label><Input value={bankData.account_number} onChange={(e) => setBankData({ ...bankData, account_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>IFSC</Label><Input value={bankData.ifsc} onChange={(e) => setBankData({ ...bankData, ifsc: e.target.value })} /></div>
              <div className="space-y-2"><Label>Branch</Label><Input value={bankData.branch} onChange={(e) => setBankData({ ...bankData, branch: e.target.value })} /></div>
              <div className="space-y-2"><Label>UPI ID</Label><Input value={bankData.upi} onChange={(e) => setBankData({ ...bankData, upi: e.target.value })} /></div>
            </div>
            <Button onClick={saveBank}>Save Bank Details</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card><CardHeader><CardTitle>Tax Settings (GST)</CardTitle></CardHeader><CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">GST rates are configured per product. Default rates: 0%, 5%, 12%, 18%, 28%</p>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-medium">Intra-State (Same State)</p>
              <p className="text-sm text-muted-foreground">CGST (Half of GST rate) + SGST (Half of GST rate)</p>
              <p className="font-medium mt-4">Inter-State (Different State)</p>
              <p className="text-sm text-muted-foreground">IGST (Full GST rate)</p>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="general">
          <Card><CardHeader><CardTitle>General Settings</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Date Format</Label><Input value="DD-MM-YYYY" disabled /></div>
              <div className="space-y-2"><Label>Currency</Label><Input value="INR (₹)" disabled /></div>
              <div className="space-y-2"><Label>Number Format</Label><Input value="Indian (1,25,000.00)" disabled /></div>
              <div className="space-y-2"><Label>Timezone</Label><Input value="Asia/Kolkata" disabled /></div>
            </div>
            <p className="text-xs text-muted-foreground">Date format, currency and number format follow Indian business conventions.</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{user?.email}</span>
                  {profile?.role ? <> &middot; role <span className="font-medium text-foreground">{profile.role.replace('_', ' ')}</span></> : null}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Display name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acctEmail">Email address</Label>
                    <Input id="acctEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveName} disabled={savingProfile}>Save name</Button>
                  <Button variant="outline" onClick={saveEmail} disabled={savingEmail}>Change email</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Changing your email sends a confirmation link to the new address; the change applies once you open it.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={pw.next}
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={pw.confirm}
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      placeholder="Repeat the new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button variant="neon" onClick={savePassword} disabled={savingPw}>
                  {savingPw ? 'Updating...' : 'Update password'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your new password takes effect immediately. Other devices stay signed in until they sign out.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
