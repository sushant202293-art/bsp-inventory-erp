import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { Building, Upload } from 'lucide-react';

export default function CompanySettingsPage() {
  const { company, updateCompany, uploadLogo } = useCompany();
  const [form, setForm] = useState({ name: '', tagline: '', address: '', city: '', state: '', pin: '', country: 'India', phone: '', email: '', website: '', gstin: '', pan: '' });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setForm({ name: company.name || '', tagline: company.tagline || '', address: company.address || '', city: company.city || '', state: company.state || '', pin: company.pin || '', country: company.country || 'India', phone: company.phone || '', email: company.email || '', website: company.website || '', gstin: company.gstin || '', pan: company.pan || '' });
      if (company.logo_url) setLogoPreview(company.logo_url);
    }
  }, [company]);

  async function handleSave() {
    try {
      await updateCompany(form);
      toast({ title: 'Saved', description: 'Company profile updated successfully' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoPreview(URL.createObjectURL(file));
      await uploadLogo(file);
      toast({ title: 'Uploaded', description: 'Logo uploaded successfully' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Building className="h-6 w-6" /> Company Profile</h1><p className="text-sm text-muted-foreground">Manage your company information</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Company Details</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Company Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="space-y-2"><Label>PIN</Label><Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div className="space-y-2"><Label>PAN</Label><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></div>
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Company Logo</CardTitle></CardHeader><CardContent className="flex flex-col items-center gap-4">
          <div className="h-32 w-32 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
            {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" /> : <Building className="h-12 w-12 text-muted-foreground" />}
          </div>
          <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handleLogo} /><Button variant="outline" asChild><span><Upload className="mr-2 h-4 w-4" /> Upload Logo</span></Button></label>
        </CardContent></Card>
      </div>
    </div>
  );
}
