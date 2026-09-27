import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';

const themePreviews: Record<string, { primary: string; secondary: string; accent: string }> = {
  'neon-blue': { primary: '#3b82f6', secondary: '#06b6d4', accent: '#8b5cf6' },
  'cyber-purple': { primary: '#8b5cf6', secondary: '#d946ef', accent: '#06b6d4' },
  'emerald': { primary: '#10b981', secondary: '#34d399', accent: '#059669' },
  'ocean': { primary: '#0ea5e9', secondary: '#38bdf8', accent: '#0284c7' },
  'sunset': { primary: '#f97316', secondary: '#fb923c', accent: '#ea580c' },
  'royal': { primary: '#7c3aed', secondary: '#a78bfa', accent: '#6d28d9' },
  'crimson': { primary: '#dc2626', secondary: '#f87171', accent: '#b91c1c' },
  'aurora': { primary: '#06b6d4', secondary: '#22d3ee', accent: '#8b5cf6' },
  'midnight': { primary: '#6366f1', secondary: '#818cf8', accent: '#4f46e5' },
  'light-professional': { primary: '#2563eb', secondary: '#3b82f6', accent: '#1d4ed8' },
};

export default function ThemesPage() {
  const { themeId, mode, setTheme, setMode } = useTheme();

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> Themes</h1><p className="text-sm text-muted-foreground">Customize the look and feel of your application</p></div>

      <Card>
        <CardHeader><CardTitle>Appearance Mode</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {([ { key: 'dark', label: 'Dark', icon: Moon }, { key: 'light', label: 'Light', icon: Sun }, { key: 'system', label: 'System', icon: Monitor } ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setMode(key)} className={`flex items-center gap-2 rounded-lg border-2 px-6 py-3 text-sm font-medium transition-all ${mode === key ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-primary/50'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Color Themes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Object.entries(themePreviews).map(([name, colors]) => (
              <button key={name} onClick={() => setTheme(name)} className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg ${themeId === name ? 'border-primary shadow-primary/20 ring-2 ring-primary/20' : 'border-muted hover:border-primary/50'}`}>
                <div className="flex gap-1 mb-3">
                  <div className="h-6 w-6 rounded-full" style={{ background: colors.primary }} />
                  <div className="h-6 w-6 rounded-full" style={{ background: colors.secondary }} />
                  <div className="h-6 w-6 rounded-full" style={{ background: colors.accent }} />
                </div>
                <p className="text-sm font-semibold capitalize">{name.replace(/-/g, ' ')}</p>
                {themeId === name && <Badge className="mt-2" variant="success">Active</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
