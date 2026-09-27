import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your email to receive a reset link</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
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
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Sending...' : <><Send className="mr-2 h-4 w-4" /> Send Reset Link</>}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
