import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setSent(true);
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold">Reset Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email to receive a reset link</p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <div>
            <p className="font-medium">Reset link sent</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If an account exists for {email}, a password reset link has been sent.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="pl-10" required autoComplete="email" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="neon" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Sending...' : <><Send className="mr-2 h-4 w-4" /> Send Reset Link</>}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
          </Button>
        </form>
      )}
    </div>
  );
}
