// Seasonal theme calendar for the biweekly "Seasonal Edit" newsletter.
//
// Each theme owns a window of the year and the copy + selection hints that
// shape an edition. `themeForDate` picks the active theme; `suggestPieces`
// auto-selects catalog pieces that fit it (the owner can swap any before send).
//
// Windows use md = month*100 + day and cover the whole year with no gaps.

export const NEWSLETTER_THEMES = [
  {
    key: 'new-year', name: 'New Year Sparkle', start: 101, end: 120,
    subject: 'Begin the year in brilliance',
    headline: 'A brilliant start to the year',
    intro: 'New beginnings deserve a little sparkle. A few favorites to carry with you into the year ahead.',
    hints: { categories: ['necklaces', 'rings'], keywords: ['solitaire', 'tennis', 'eternity', 'classic'] },
  },
  {
    key: 'valentines', name: "Valentine's Day", start: 121, end: 214,
    subject: 'Something that says it better than words',
    headline: 'For the one who deserves brilliance',
    intro: 'With Valentine’s Day near, a selection of pieces made to be gifted — and treasured.',
    hints: { categories: ['necklaces', 'rings'], keywords: ['heart', 'pendant', 'solitaire', 'halo', 'pear'] },
  },
  {
    key: 'late-winter', name: 'Everyday Brilliance', start: 215, end: 315,
    subject: 'Everyday pieces, extraordinary sparkle',
    headline: 'The pieces you’ll reach for daily',
    intro: 'The quiet luxuries — studs, hoops, and pendants that finish any look, all season long.',
    hints: { categories: ['earrings', 'necklaces'], keywords: ['stud', 'hoop', 'pendant', 'classic'] },
  },
  {
    key: 'spring', name: 'Spring Awakening', start: 316, end: 430,
    subject: 'Fresh brilliance for a new season',
    headline: 'Light, bright, and ready for spring',
    intro: 'As the season turns, a few pieces with the sparkle to match longer, brighter days.',
    hints: { categories: ['necklaces', 'earrings'], keywords: ['pear', 'oval', 'drop', 'pendant', 'huggie'] },
  },
  {
    key: 'mothers-day', name: "Mother's Day", start: 501, end: 511,
    subject: 'A gift as remarkable as she is',
    headline: 'For the women who mean everything',
    intro: 'Mother’s Day is near. A curated selection of pieces made to say thank you, beautifully.',
    hints: { categories: ['necklaces', 'bracelets'], keywords: ['pendant', 'bolo', 'tennis', 'station'] },
  },
  {
    key: 'early-summer', name: 'Early Summer', start: 512, end: 620,
    subject: 'Warm-weather brilliance',
    headline: 'Effortless sparkle for warmer days',
    intro: 'Pieces that move from beach to dinner without missing a beat.',
    hints: { categories: ['earrings', 'bracelets'], keywords: ['hoop', 'huggie', 'tennis'] },
  },
  {
    key: 'summer', name: 'Summer Escapes', start: 621, end: 810,
    subject: 'Sun-soaked sparkle for summer',
    headline: 'Made for golden-hour moments',
    intro: 'A summer edit of pieces that catch the light — by the water, at dinner, wherever the season takes you.',
    hints: { categories: ['bracelets', 'earrings'], keywords: ['tennis', 'hoop', 'emerald', 'oval'] },
  },
  {
    key: 'late-summer', name: 'Late Summer', start: 811, end: 905,
    subject: 'One last summer sparkle',
    headline: 'Savor the last of summer',
    intro: 'The pieces to close out the season in style — layered, luminous, effortless.',
    hints: { categories: ['necklaces', 'bracelets'], keywords: ['tennis', 'station', 'lariat', 'bolo'] },
  },
  {
    key: 'autumn', name: 'Autumn Luxe', start: 906, end: 1031,
    subject: 'Rich brilliance for the season ahead',
    headline: 'Statement pieces for cooler days',
    intro: 'As the light warms, a few pieces with the presence to match — bold cuts and quiet confidence.',
    hints: { categories: ['rings', 'earrings'], keywords: ['emerald', 'halo', 'cushion', 'oval'] },
  },
  {
    key: 'holiday', name: 'Holiday Gifting', start: 1101, end: 1231,
    subject: 'The gifts they’ll never forget',
    headline: 'Give brilliance this season',
    intro: 'Our holiday edit — the pieces most loved for gifting, ready to be unwrapped and adored.',
    hints: { categories: ['necklaces', 'earrings', 'bracelets'], keywords: ['tennis', 'stud', 'hoop', 'pendant', 'emerald'] },
  },
];

// Fallback used only if no window matches (shouldn't happen — windows are gapless).
export const DEFAULT_THEME = {
  key: 'new-arrivals', name: 'New Arrivals', start: 0, end: 0,
  subject: 'New arrivals at Opal Gems',
  headline: 'Just arrived',
  intro: 'A few new favorites we thought you’d love.',
  hints: { categories: ['necklaces', 'rings', 'earrings', 'bracelets'], keywords: [] },
};

export function themeForDate(date = new Date()) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  return NEWSLETTER_THEMES.find((t) => md >= t.start && md <= t.end) || DEFAULT_THEME;
}

export function themeByKey(key) {
  return NEWSLETTER_THEMES.find((t) => t.key === key) || DEFAULT_THEME;
}

const priceOf = (p) => {
  const n = Number(String(p.price ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
};

/**
 * Auto-suggest pieces that fit a theme. Scores by category + keyword match,
 * keeps only priced pieces with an image, de-dupes by description for variety,
 * and skips anything in `excludeNames` (recently featured) so each edition
 * looks fresh. Returns up to `count` pieces.
 */
export function suggestPieces(theme, catalog, { count = 4, excludeNames = [], maxPerCategory = 2 } = {}) {
  const exclude = new Set(excludeNames);
  const hints = theme.hints || { categories: [], keywords: [] };
  const scored = catalog
    .filter((p) => (p.link || p.image) && priceOf(p) != null && !exclude.has(p.name))
    .map((p) => {
      const desc = (p.description || '').toLowerCase();
      let score = 0;
      if (hints.categories.includes(p.category)) score += 2;
      for (const kw of hints.keywords) if (desc.includes(kw)) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const seenDesc = new Set();
  const catCount = {};
  // First pass: de-dupe by description AND cap per category, so an edition
  // spreads across piece types instead of showing four near-identical items.
  for (const { p } of scored) {
    const key = (p.description || p.name).toLowerCase();
    if (seenDesc.has(key)) continue;
    if ((catCount[p.category] || 0) >= maxPerCategory) continue;
    seenDesc.add(key);
    catCount[p.category] = (catCount[p.category] || 0) + 1;
    picked.push(p);
    if (picked.length >= count) break;
  }
  // Second pass (only if the cap left us short): relax the category cap.
  if (picked.length < count) {
    for (const { p } of scored) {
      const key = (p.description || p.name).toLowerCase();
      if (seenDesc.has(key)) continue;
      seenDesc.add(key);
      picked.push(p);
      if (picked.length >= count) break;
    }
  }
  return picked;
}
