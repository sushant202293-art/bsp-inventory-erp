import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Users, Plus, Search, Shield, Edit, UserX, UserCheck, Key } from 'lucide-react';

export default function UserListPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', contact: '', role: 'viewer', department: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editUser) {
        await supabase.from('profiles').update({ full_name: formData.full_name, contact: formData.contact, role: formData.role, department: formData.department }).eq('id', editUser.id);
        toast({ title: 'Updated', description: 'User updated successfully' });
      } else {
        const { data: authData, error } = await supabase.auth.signUp({ email: formData.email, password: 'TempPassword123!' });
        if (error) throw error;
        if (authData.user) {
          await supabase.from('profiles').insert({ id: authData.user.id, full_name: formData.full_name, email: formData.email, contact: formData.contact, role: formData.role, department: formData.department, is_active: true });
        }
        toast({ title: 'Created', description: 'User created. Temporary password sent to email.' });
      }
      setShowForm(false); setEditUser(null);
      loadUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  function openEdit(user: any) {
    setEditUser(user);
    setFormData({ full_name: user.full_name, email: user.email, contact: user.contact || '', role: user.role, department: user.department || '' });
    setShowForm(true);
  }

  async function toggleActive(user: any) {
    try {
      await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
      toast({ title: user.is_active ? 'Deactivated' : 'Reactivated', description: `User ${user.is_active ? 'deactivated' : 'reactivated'}` });
      loadUsers();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  const filtered = users.filter((u) => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleColors: Record<string, string> = {
    super_admin: 'destructive', admin: 'warning', manager: 'info', sales: 'success',
    purchase: 'secondary', accounts: 'secondary', inventory: 'secondary', viewer: 'outline',
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> User Management</h1><p className="text-sm text-muted-foreground">{users.length} registered users</p></div>
        <Button onClick={() => { setEditUser(null); setFormData({ full_name: '', email: '', contact: '', role: 'viewer', department: '' }); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" /></div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="p-3 text-left font-medium">Name</th><th className="p-3 text-left font-medium">Email</th><th className="p-3 text-left font-medium">Role</th><th className="p-3 text-left font-medium">Department</th><th className="p-3 text-center font-medium">Status</th><th className="p-3 text-left font-medium">Last Login</th><th className="p-3 text-center font-medium">Actions</th></tr></thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{user.full_name}</td>
                    <td className="p-3 text-muted-foreground">{user.email}</td>
                    <td className="p-3"><Badge variant={(roleColors[user.role] as any) || 'secondary'}>{user.role}</Badge></td>
                    <td className="p-3 text-muted-foreground">{user.department || '-'}</td>
                    <td className="p-3 text-center"><Badge variant={user.is_active ? 'success' : 'destructive'}>{user.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="p-3 text-muted-foreground">{user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(user)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(user)}>
                          {user.is_active ? <UserX className="h-3 w-3 text-red-500" /> : <UserCheck className="h-3 w-3 text-green-500" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required /></div>
            {!editUser && <div className="space-y-2"><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>}
            <div className="space-y-2"><Label>Contact</Label><Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} /></div>
            <div className="space-y-2"><Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales">Sales User</SelectItem>
                  <SelectItem value="purchase">Purchase User</SelectItem>
                  <SelectItem value="accounts">Accounts User</SelectItem>
                  <SelectItem value="inventory">Inventory User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Department</Label><Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></div>
            <div className="flex gap-2"><Button type="submit">{editUser ? 'Update' : 'Create'}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
