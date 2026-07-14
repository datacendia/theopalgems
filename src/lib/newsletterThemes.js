// Seasonal theme calendar for the biweekly "Seasonal Edit" newsletter.
//
// Each theme owns a window of the year and the copy, decorative accent, and
// selection hints that shape an edition. `themeForDate` picks the active theme;
// `suggestPieces` auto-selects catalog pieces that fit it, spread across
// categories for variety (the owner can still swap any before send).
//
// Windows use md = month*100 + day and cover the whole year with no gaps.
// `hints.categories` is PRIORITY-ORDERED (most on-theme first) and lists all
// four so an edition can spread widely. `accent` drives the seasonal look:
//   motif = a small decorative symbol, color = seasonal accent color.

const GOLD = '#b4965a';

export const NEWSLETTER_THEMES = [
  {
    key: 'new-year', name: 'New Year Sparkle', start: 101, end: 120,
    subject: 'Begin the year in brilliance',
    headline: 'A brilliant start to the year',
    intro: 'New beginnings deserve a little sparkle. A few favorites to carry with you into the year ahead.',
    accent: { motif: '✦', color: GOLD },
    hints: { categories: ['necklaces', 'rings', 'earrings', 'bracelets'], keywords: ['solitaire', 'tennis', 'eternity', 'classic', 'stud'] },
  },
  {
    key: 'valentines', name: "Valentine's Day", start: 121, end: 214,
    subject: 'Something that says it better than words',
    headline: 'For the one who deserves brilliance',
    intro: 'With Valentine’s Day near, a selection of pieces made to be gifted — and treasured.',
    accent: { motif: '♡', color: '#b0526d' },
    hints: { categories: ['necklaces', 'rings', 'earrings', 'bracelets'], keywords: ['heart', 'pendant', 'solitaire', 'halo', 'pear', 'drop'] },
  },
  {
    key: 'late-winter', name: 'Everyday Brilliance', start: 215, end: 315,
    subject: 'Everyday pieces, extraordinary sparkle',
    headline: 'The pieces you’ll reach for daily',
    intro: 'The quiet luxuries — studs, hoops, and pendants that finish any look, all season long.',
    accent: { motif: '❉', color: '#7f93a6' },
    hints: { categories: ['earrings', 'necklaces', 'bracelets', 'rings'], keywords: ['stud', 'hoop', 'pendant', 'classic', 'huggie'] },
  },
  {
    key: 'spring', name: 'Spring Awakening', start: 316, end: 430,
    subject: 'Fresh brilliance for a new season',
    headline: 'Light, bright, and ready for spring',
    intro: 'As the season turns, a few pieces with the sparkle to match longer, brighter days.',
    accent: { motif: '✿', color: '#7a9a5b' },
    hints: { categories: ['necklaces', 'earrings', 'bracelets', 'rings'], keywords: ['pear', 'oval', 'drop', 'pendant', 'huggie'] },
  },
  {
    key: 'mothers-day', name: "Mother's Day", start: 501, end: 511,
    subject: 'A gift as remarkable as she is',
    headline: 'For the women who mean everything',
    intro: 'Mother’s Day is near. A curated selection of pieces made to say thank you, beautifully.',
    accent: { motif: '❀', color: '#c58aa0' },
    hints: { categories: ['necklaces', 'bracelets', 'earrings', 'rings'], keywords: ['pendant', 'bolo', 'tennis', 'station', 'heart', 'hoop'] },
  },
  {
    key: 'early-summer', name: 'Early Summer', start: 512, end: 620,
    subject: 'Warm-weather brilliance',
    headline: 'Effortless sparkle for warmer days',
    intro: 'Pieces that move from beach to dinner without missing a beat.',
    accent: { motif: '☀', color: '#c99a3f' },
    hints: { categories: ['earrings', 'bracelets', 'necklaces', 'rings'], keywords: ['hoop', 'huggie', 'tennis', 'pendant'] },
  },
  {
    key: 'summer', name: 'Summer Escapes', start: 621, end: 810,
    subject: 'Sun-soaked sparkle for summer',
    headline: 'Made for golden-hour moments',
    intro: 'A summer edit of pieces that catch the light — by the water, at dinner, wherever the season takes you.',
    accent: { motif: '☀', color: '#c99a3f' },
    hints: { categories: ['bracelets', 'earrings', 'necklaces', 'rings'], keywords: ['tennis', 'hoop', 'emerald', 'oval', 'pendant'] },
  },
  {
    key: 'late-summer', name: 'Late Summer', start: 811, end: 905,
    subject: 'One last summer sparkle',
    headline: 'Savor the last of summer',
    intro: 'The pieces to close out the season in style — layered, luminous, effortless.',
    accent: { motif: '❋', color: '#c99a3f' },
    hints: { categories: ['necklaces', 'bracelets', 'earrings', 'rings'], keywords: ['tennis', 'station', 'lariat', 'bolo', 'hoop'] },
  },
  {
    key: 'autumn', name: 'Autumn Luxe', start: 906, end: 1031,
    subject: 'Rich brilliance for the season ahead',
    headline: 'Statement pieces for cooler days',
    intro: 'As the light warms, a few pieces with the presence to match — bold cuts and quiet confidence.',
    accent: { motif: '❦', color: '#a9763f' },
    hints: { categories: ['rings', 'earrings', 'necklaces', 'bracelets'], keywords: ['emerald', 'halo', 'cushion', 'oval', 'statement'] },
  },
  {
    key: 'holiday', name: 'Holiday Gifting', start: 1101, end: 1231,
    subject: 'The gifts they’ll never forget',
    headline: 'Give brilliance this season',
    intro: 'Our holiday edit — the pieces most loved for gifting, ready to be unwrapped and adored.',
    accent: { motif: '❆', color: '#1f6b47' },
    hints: { categories: ['necklaces', 'earrings', 'bracelets', 'rings'], keywords: ['tennis', 'stud', 'hoop', 'pendant', 'emerald', 'solitaire'] },
  },
];

export const DEFAULT_THEME = {
  key: 'new-arrivals', name: 'New Arrivals', start: 0, end: 0,
  subject: 'New arrivals at Opal Gems',
  headline: 'Just arrived',
  intro: 'A few new favorites we thought you’d love.',
  accent: { motif: '✦', color: GOLD },
  hints: { categories: ['necklaces', 'earrings', 'bracelets', 'rings'], keywords: [] },
};

// Fixed fallback order for any categories a theme didn't prioritize.
const ALL_CATEGORIES = ['necklaces', 'earrings', 'bracelets', 'rings'];

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
 * Auto-suggest pieces for a theme, SPREAD ACROSS CATEGORIES for variety.
 * Scores every priced piece by category priority + keyword match, groups by
 * category (de-duped by description), then round-robins across categories in
 * the theme's priority order — so a 4-piece edition pulls from up to 4
 * different categories instead of clustering on one. Skips `excludeNames`.
 */
export function suggestPieces(theme, catalog, { count = 4, excludeNames = [], renderOnly = false } = {}) {
  const exclude = new Set(excludeNames);
  const hints = theme.hints || { categories: [], keywords: [] };

  const scored = catalog
    // renderOnly keeps the newsletter's photos uniform: only the clean
    // floating-on-black renders (/assets/kira-black/), not the display-bust shots.
    .filter((p) => (p.link || p.image) && priceOf(p) != null && !exclude.has(p.name)
      && (!renderOnly || /\/assets\/kira-black\//.test(p.link || p.image || '')))
    .map((p) => {
      const desc = (p.description || '').toLowerCase();
      let score = 0;
      const ci = hints.categories.indexOf(p.category);
      if (ci >= 0) score += (hints.categories.length - ci); // earlier = more on-theme
      for (const kw of hints.keywords) if (desc.includes(kw)) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  // Group by category, de-duping by description within each category.
  const byCat = {};
  for (const { p } of scored) {
    const c = p.category;
    if (!byCat[c]) byCat[c] = [];
    const dkey = (p.description || p.name).toLowerCase();
    if (byCat[c].some((x) => (x.description || x.name).toLowerCase() === dkey)) continue;
    byCat[c].push(p);
  }

  // Category visit order: theme priority first, then any remaining present.
  const order = [
    ...hints.categories.filter((c) => byCat[c]),
    ...ALL_CATEGORIES.filter((c) => byCat[c] && !hints.categories.includes(c)),
  ];

  // Round-robin: take the best remaining piece from each category in turn.
  const picked = [];
  for (let round = 0; picked.length < count; round++) {
    let addedThisRound = false;
    for (const c of order) {
      if (byCat[c][round]) {
        picked.push(byCat[c][round]);
        addedThisRound = true;
        if (picked.length >= count) break;
      }
    }
    if (!addedThisRound) break;
  }
  return picked;
}
