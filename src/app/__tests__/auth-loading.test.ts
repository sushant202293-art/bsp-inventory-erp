// Guards against the "app reloads itself when I switch tabs" regression.
//
// ProtectedRoute renders a full-screen <Loader /> whenever `loading` is true.
// AuthContext used to set `loading = true` for the INITIAL_SESSION, SIGNED_IN
// *and* TOKEN_REFRESHED events. supabase-js revalidates the session when the
// tab regains visibility, so TOKEN_REFRESHED fired on every tab switch. That
// blanked the whole app for a full-screen loader, remounted every component and
// re-ran every page's queries - indistinguishable from a browser reload.
//
// None of `tsc`, `vite build` or a render test catch this: the effect that
// registers the listener never runs during SSR, and no test switches tabs. So
// this reads the source and asserts the branch structure instead.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join('src', 'contexts', 'AuthContext.tsx'), 'utf8');

/** Returns the source of the `if (event === '<event>')` branch. */
function branchFor(event: string): string {
  const start = src.indexOf(`event === '${event}'`);
  expect(start, `no branch found for ${event}`).toBeGreaterThan(-1);
  // Branches run to the next branch or the end of the listener callback.
  const rest = src.slice(start + event.length);
  const next = rest.search(/\n\s{6}if \(event ===/);
  return rest.slice(0, next === -1 ? undefined : next);
}

describe('auth loading gate', () => {
  it('does not treat a background token refresh as a loading state', () => {
    // The bug: TOKEN_REFRESHED shared a branch with the events that genuinely
    // need a loading state (first page load, explicit sign-in).
    const shared = /event === 'INITIAL_SESSION'[^\n]*TOKEN_REFRESHED/.test(src);
    expect(shared).toBe(false);
  });

  it('only flips loading inside the TOKEN_REFRESHED branch when the profile is stale', () => {
    const branch = branchFor('TOKEN_REFRESHED');
    expect(branch).toContain('profileUserIdRef.current !== session.user.id');
    // setLoading must sit within the staleness guard, so an ordinary refresh
    // leaves the already-rendered app alone.
    const guardIdx = branch.indexOf('profileUserIdRef.current !== session.user.id');
    const loadingIdx = branch.indexOf('setLoading(true)');
    expect(loadingIdx).toBeGreaterThan(-1);
    expect(loadingIdx).toBeGreaterThan(guardIdx);
  });

  it('still gates the initial load and explicit sign-in', () => {
    for (const event of ['INITIAL_SESSION', 'SIGNED_IN']) {
      expect(branchFor(event)).toContain('setLoading(true)');
    }
  });

  it('resets the cached profile user on sign-out so a later sign-in reloads it', () => {
    const branch = branchFor('SIGNED_OUT');
    expect(branch).toContain('profileUserIdRef.current = null');
  });
});
