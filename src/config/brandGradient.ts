/**
 * IPM brand gradient — the purple → blue gradient used on every primary
 * gradient button. Figma: linear-gradient(90deg, #E257E4 0%, #084D92 70.35%).
 *
 * These are explicit hex values (never theme/dark-mode tokens), so the
 * gradient looks identical in light and dark mode. Always horizontal.
 *
 * Usage:  <LinearGradient {...BRAND_GRADIENT} style={...} />
 */
export const BRAND_GRADIENT = {
  colors: ['#E257E4', '#084D92'],
  start: {x: 0, y: 0},
  end: {x: 1, y: 0},
  locations: [0, 0.7035],
};

// Disabled look for gradient buttons: the brand gradient pre-blended with
// white (50%) as fixed colors, instead of `opacity: 0.5`, so it can't pick
// up whatever is behind it (or a dark-mode tint). Same direction + stops.
export const BRAND_GRADIENT_DISABLED = {
  ...BRAND_GRADIENT,
  colors: ['#F0ABF1', '#83A6C8'],
};
