import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { Building, Upload, Trash2, Loader2, ImageOff } from 'lucide-react';

export default function CompanySettingsPage() {
  const { company, loading, updateCompany, uploadLogo, removeLogo } = useCompany();
  const [form, setForm] = useState({ name: '', tagline: '', address: '', city: '', state: '', pin: '', country: 'India', phone: '', email: '', website: '', gstin: '', pan: '' });
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (company) {
      setForm({ name: company.name || '', tagline: company.tagline || '', address: company.address || '', city: company.city || '', state: company.state || '', pin: company.pin || '', country: company.country || 'India', phone: company.phone || '', email: company.email || '', website: company.website || '', gstin: company.gstin || '', pan: company.pan || '' });
    }
  }, [company]);

  // Release the previous object URL so repeated uploads do not leak blobs.
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // The persisted logo always wins once it lands; the local preview is only a
  // bridge while the upload is in flight.
  const persistedLogo = company?.logo_url ?? null;
  const displayLogo = persistedLogo || localPreview;
  const usingPersisted = Boolean(persistedLogo);

  useEffect(() => {
    setPreviewFailed(false);
  }, [displayLogo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCompany(form);
      toast({ title: 'Saved', description: 'Company profile updated successfully' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so selecting the same file twice still fires onChange.
    if (e.target) e.target.value = '';
    if (!file) return;

    setUploading(true);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setLocalPreview(objectUrl);

    try {
      await uploadLogo(file);
      // The context has already updated company.logo_url, so the persisted
      // image is displayed. Release the blob.
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setLocalPreview(null);
      toast({ title: 'Uploaded', description: 'Logo uploaded successfully' });
    } catch (err: any) {
      // Roll the preview back so a failed upload is never shown as saved.
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setLocalPreview(null);
      toast({ title: 'Upload failed', description: err?.message || 'Logo upload failed. Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setRemoving(true);
    try {
      await removeLogo();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setLocalPreview(null);
      toast({ title: 'Removed', description: 'Company logo removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  const hasLogo = Boolean(displayLogo) && !previewFailed;

  return (
    <div className="space-y-3">
      <div><h1 className="text-lg font-bold flex items-center gap-2"><Building className="h-4 w-4" /> Company Profile</h1><p className="text-sm text-muted-foreground">Manage your company information</p></div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Company Details</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Company Logo</CardTitle></CardHeader><CardContent className="flex flex-col items-center gap-3">
          <div className="flex h-40 w-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/40 p-4">
            {loading ? (
              <Skeleton className="h-24 w-24 rounded-md" />
            ) : hasLogo ? (
              <img
                src={displayLogo ?? undefined}
                alt="Company logo"
                className="max-h-full max-w-full object-contain"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                {previewFailed ? (
                  <ImageOff className="h-10 w-10" />
                ) : (
                  <Building className="h-10 w-10" />
                )}
                <p className="text-xs">{previewFailed ? 'Logo could not be loaded' : 'No logo uploaded'}</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogo}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {displayLogo ? 'Change Logo' : 'Upload Logo'}
                </>
              )}
            </Button>

            {usingPersisted && (
              <Button
                variant="ghost"
                onClick={handleRemoveLogo}
                disabled={uploading || removing || loading}
              >
                {removing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove Logo
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            PNG, JPG, JPEG or WEBP. Max 2 MB.
          </p>
        </CardContent></Card>
      </div>
    </div>
  );
}
