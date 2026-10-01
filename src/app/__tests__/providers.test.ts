// Guards against a provider being exported but never mounted.
//
// The app shipped with <Toaster /> rendered in main.tsx and 22 components
// calling useToast(), while providers.tsx mounted five other providers and
// omitted ToastProvider. useToast() throws when its context is missing, so the
// very first render threw and the whole app showed the error boundary:
//
//   "useToast must be used within a ToastProvider"
//
// That is a load-time crash, yet it passed `tsc`, `vite build` and the existing
// suite, because none of them mount the component tree. This test reads the
// source instead: any context module that defines a hook throwing "must be
// used within a <Name>Provider" must have that provider mounted in
// providers.tsx, otherwise the app cannot render.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ToastProvider, useToast } from '@/components/ui/use-toast';

const SRC = 'src';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const files = walk(SRC).filter(
  (f) => !/(^|[\\/])(__tests__|tests?)[\\/]/.test(f) && !/\.(test|spec)\.[tj]sx?$/.test(f),
);

// name of the hook -> name of the provider it demands
const demands = new Map<string, string>();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // throw new Error("useToast must be used within a ToastProvider")
  for (const m of src.matchAll(
    /throw new Error\(\s*['"][^'"]*must be used within an? (\w+Provider)['"]/g,
  )) {
    demands.set(relative(SRC, file).replace(/\\/g, '/'), m[1]);
  }
}

describe('provider wiring', () => {
  it('finds the guarding hooks (sanity check on the pattern)', () => {
    expect(demands.size).toBeGreaterThanOrEqual(6);
  });

  it('mounts every provider that a hook demands', () => {
    const providersFile = join(SRC, 'app', 'providers.tsx');
    expect(existsSync(providersFile)).toBe(true);
    const tree = readFileSync(providersFile, 'utf8');

    const missing = [...demands.entries()]
      .filter(([, provider]) => !new RegExp(`<${provider}[\\s/>]`).test(tree))
      .map(([file, provider]) => `${file} needs <${provider}> in app/providers.tsx`);
    expect(missing).toEqual([]);
  });

  it('renders Toaster inside Providers in main.tsx', () => {
    // Toaster calls useToast(), so it must sit below the provider tree rather
    // than alongside it.
    const src = readFileSync(join(SRC, 'main.tsx'), 'utf8');
    expect(src).toMatch(/<Toaster\s*\/>/);
    expect(src).toMatch(/<Providers>[\s\S]*<Toaster\s*\/>[\s\S]*<\/Providers>/);
  });
});

describe('useToast at runtime', () => {
  // Source scanning cannot prove the hook actually works, so execute it.
  // renderToString needs no DOM, which suits the "node" test environment.
  function Probe() {
    const { toasts, toast, dismiss } = useToast();
    return createElement(
      'span',
      null,
      `${toasts.length}:${typeof toast}:${typeof dismiss}`,
    );
  }

  it('resolves the context when ToastProvider is mounted', () => {
    const html = renderToStaticMarkup(
      createElement(ToastProvider, null, createElement(Probe)),
    );
    expect(html).toContain('0:function:function');
  });

  it('reproduces the original crash without ToastProvider', () => {
    // Guards the assertion above: if useToast stopped throwing when the
    // provider is absent, this test would fail and the check would be
    // measuring nothing.
    expect(() => renderToStaticMarkup(createElement(Probe))).toThrow(
      /must be used within a ToastProvider/,
    );
  });
});
