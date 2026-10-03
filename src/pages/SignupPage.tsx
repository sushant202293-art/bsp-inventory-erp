import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { INDIAN_STATES } from '@/constants';
import { GST_STATE_CODES } from '@/config/app.config';

const MIN_PASSWORD_LENGTH = 8;

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [state, setState] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);

    // These land in auth.users.raw_user_meta_data, which is the only
    // metadata bucket a browser can write. handle_new_user()
    // (migration 007) reads them to provision the company and assign
    // this user as its admin.
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          company_state: state || null,
          company_state_code: GST_STATE_CODES[
            Object.keys(GST_STATE_CODES).find(
              (code) => GST_STATE_CODES[code] === state,
            ) ?? ''
          ] ?? null,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (err) {
      setError(
        err.message === 'User already registered'
          ? 'An account with that email already exists.'
          : err.message,
      );
      setLoading(false);
      return;
    }

    // When email confirmation is enabled there is no session yet; the
    // account (and its company) only exist after the link is clicked.
    if (!data.session) {
      setNotice(
        'Account created. Check your inbox for the confirmation link, then sign in.',
      );
      setLoading(false);
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  return (
    <div>
      <div className="mb-3 text-center">
        <h2 className="text-xl font-bold">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your company and start managing inventory
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="pl-8"
              required
              autoComplete="name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. BSP Traders"
              className="pl-8"
              required
              autoComplete="organization"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            We create this company and make you its administrator.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used to decide CGST/SGST vs IGST on your invoices.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="pl-8"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className="pl-8 pr-9"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2 rounded border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}

        <Button type="submit" variant="neon" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Creating account...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Account
            </span>
          )}
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
