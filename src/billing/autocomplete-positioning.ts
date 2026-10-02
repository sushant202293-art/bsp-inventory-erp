/**
 * Pure positioning / presentation helpers for the product autocomplete.
 *
 * They live outside the component so they can be unit tested without a DOM
 * and so the component file stays a single-component module (fast refresh).
 */

/** How many rows are fetched - the dropdown shows up to this many at once. */
export const MAX_RESULTS = 8;
/** Rows are ~34px, so 8 rows + hint line fit comfortably in this height. */
export const DROPDOWN_MAX_HEIGHT = 300;
const DROPDOWN_MIN_WIDTH = 340;
const EDGE_GAP = 8;
const ANCHOR_GAP = 4;
const MIN_USEFUL_HEIGHT = 190;

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface DropdownPlacement {
  side: 'top' | 'bottom';
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

/**
 * Where the product list should sit so that it is never clipped: it is
 * rendered in a portal on `document.body` with `position: fixed`, so only the
 * viewport matters - no ancestor with `overflow: hidden/auto` (the scrolling
 * items table, `main`, the card) can cut it off.
 *
 * Opens below the field when there is room, above it when the space below is
 * too small for a useful list, and grows only as tall as the space available.
 */
export function computeDropdownPlacement(anchor: AnchorRect, viewport: ViewportSize): DropdownPlacement {
  const spaceBelow = viewport.height - anchor.bottom - ANCHOR_GAP - EDGE_GAP;
  const spaceAbove = anchor.top - ANCHOR_GAP - EDGE_GAP;
  const side: 'top' | 'bottom' =
    spaceBelow < MIN_USEFUL_HEIGHT && spaceAbove > spaceBelow ? 'top' : 'bottom';
  const available = Math.max(side === 'top' ? spaceAbove : spaceBelow, 140);
  const maxHeight = Math.round(Math.min(DROPDOWN_MAX_HEIGHT, available));
  const width = Math.round(
    Math.min(Math.max(anchor.width, DROPDOWN_MIN_WIDTH), Math.max(viewport.width - EDGE_GAP * 2, 160))
  );
  const left = Math.round(
    Math.max(EDGE_GAP, Math.min(anchor.left, viewport.width - width - EDGE_GAP))
  );

  return side === 'top'
    ? { side, bottom: Math.round(viewport.height - anchor.top + ANCHOR_GAP), left, width, maxHeight }
    : { side, top: Math.round(anchor.bottom + ANCHOR_GAP), left, width, maxHeight };
}

/** Case-insensitive match highlighting, split into plain / matched segments. */
export function highlightMatches(text: string, query: string): Array<{ text: string; match: boolean }> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];

  const haystack = text.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    if (at > cursor) parts.push({ text: text.slice(cursor, at), match: false });
    parts.push({ text: text.slice(at, at + needle.length), match: true });
    cursor = at + needle.length;
    at = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
