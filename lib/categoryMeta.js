// Category -> visual metadata (slug for CSS class, emoji icon, gradient colors)
// used to render CSS/emoji "thumbnail" banners instead of real photos.

const CATEGORY_META = {
  'Budget Destinations': { slug: 'budget', emoji: '🏖️', color: '#d9622b' },
  'Itineraries': { slug: 'itineraries', emoji: '🗺️', color: '#3461c1' },
  'Travel Tips': { slug: 'traveltips', emoji: '🚆', color: '#5f3fc4' },
  'Packing Guides': { slug: 'packing', emoji: '🎒', color: '#2f7a54' },
  'Local Food & Culture': { slug: 'food', emoji: '🍜', color: '#b5313b' },
};

const DEFAULT_META = { slug: 'default', emoji: '🧭', color: '#666666' };

// Fallback palette for categories added dynamically (not part of the 5 tuned above),
// styled to sit alongside the existing tuned colors.
const FALLBACK_COLORS = ['#1f7a8c', '#8c5e2a', '#6a4c93', '#a13d63', '#3c7a3e', '#c2542c'];
const FALLBACK_EMOJI = '🧳';

function slugifyName(name) {
  return name
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }
  return hash;
}

function getCategoryMeta(category) {
  if (CATEGORY_META[category]) return CATEGORY_META[category];
  if (!category) return DEFAULT_META;
  const idx = hashString(category) % FALLBACK_COLORS.length;
  return {
    slug: slugifyName(category) || 'default',
    emoji: FALLBACK_EMOJI,
    color: FALLBACK_COLORS[idx],
  };
}

module.exports = { CATEGORY_META, getCategoryMeta };
