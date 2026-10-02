import { describe, expect, it } from 'vitest';
import {
  computeDropdownPlacement,
  highlightMatches,
  DROPDOWN_MAX_HEIGHT,
  type AnchorRect,
  type ViewportSize,
} from '../autocomplete-positioning';

const wide: ViewportSize = { width: 1920, height: 1080 };

function anchor(partial: Partial<AnchorRect>): AnchorRect {
  return { top: 400, bottom: 436, left: 120, width: 260, ...partial };
}

describe('computeDropdownPlacement', () => {
  it('opens below the field when there is room', () => {
    const placement = computeDropdownPlacement(anchor({}), wide);
    expect(placement.side).toBe('bottom');
    expect(placement.top).toBe(440);
    expect(placement.bottom).toBeUndefined();
    expect(placement.maxHeight).toBe(DROPDOWN_MAX_HEIGHT);
  });

  it('opens upward when the space below is too small', () => {
    const viewport = { width: 1600, height: 420 };
    const placement = computeDropdownPlacement(anchor({ top: 300, bottom: 336 }), viewport);
    expect(placement.side).toBe('top');
    expect(placement.top).toBeUndefined();
    expect(placement.bottom).toBe(viewport.height - 300 + 4);
    // Only the room above is available, so the list is shorter than its cap.
    expect(placement.maxHeight).toBeLessThan(DROPDOWN_MAX_HEIGHT);
    expect(placement.maxHeight).toBe(288);
  });

  it('keeps at least a usable height even in a very short viewport', () => {
    const placement = computeDropdownPlacement(anchor({ top: 60, bottom: 96 }), {
      width: 1280,
      height: 400,
    });
    expect(placement.maxHeight).toBeGreaterThanOrEqual(140);
    expect(placement.maxHeight).toBeLessThanOrEqual(400);
  });

  it('never grows taller than the configured maximum', () => {
    const placement = computeDropdownPlacement(anchor({ top: 10, bottom: 46 }), wide);
    expect(placement.maxHeight).toBe(DROPDOWN_MAX_HEIGHT);
  });

  it('widens a narrow field to the minimum dropdown width', () => {
    const placement = computeDropdownPlacement(anchor({ width: 224 }), wide);
    expect(placement.width).toBe(340);
  });

  it('shrinks to the viewport and stays inside it on small screens', () => {
    const viewport = { width: 700, height: 800 };
    const placement = computeDropdownPlacement(anchor({ left: 660, width: 400 }), viewport);
    expect(placement.width).toBeLessThanOrEqual(viewport.width - 16);
    expect(placement.left).toBeGreaterThanOrEqual(8);
    expect(placement.left + placement.width).toBeLessThanOrEqual(viewport.width - 8);
  });
});

describe('highlightMatches', () => {
  it('splits text into matched and unmatched segments', () => {
    expect(highlightMatches('Amul Butter', 'but')).toEqual([
      { text: 'Amul ', match: false },
      { text: 'But', match: true },
      { text: 'ter', match: false },
    ]);
  });

  it('is case insensitive and finds repeated matches', () => {
    expect(highlightMatches('Tata Salt', 'TA')).toEqual([
      { text: 'Ta', match: true },
      { text: 'ta', match: true },
      { text: ' Salt', match: false },
    ]);
  });

  it('returns the whole string when the query is empty', () => {
    expect(highlightMatches('Surf Excel', '   ')).toEqual([{ text: 'Surf Excel', match: false }]);
  });

  it('returns one unmatched segment when nothing matches', () => {
    expect(highlightMatches('Surf Excel', 'zzz')).toEqual([{ text: 'Surf Excel', match: false }]);
  });
});
