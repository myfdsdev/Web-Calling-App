/** Shared shape + merge helper for the public-page builder settings. */

export const DEFAULT_PAGE_SETTINGS = {
  hero: {
    enabled: true,
    storeLogo: '',
    heroSideImage: '',
    alignment: 'right',
    badge: '',
    headline: '',
    subtitle: '',
    primaryCta: '',
    secondaryCta: '',
    background: 'gradient',
    startColor: '#6C5CE7',
    endColor: '#0A0A0A',
    backgroundImage: '',
    opacity: 100,
  },
  products: { enabled: true, title: 'Featured Deals' },
  testimonials: { enabled: false },
  faq: { enabled: false },
  customBoxes: { enabled: false },
  customBanner: { enabled: false },
  trustBadges: { enabled: false },
  footer: {
    enabled: true,
    text: '© 2025 Your Store. All rights reserved.',
    logo: '',
    social: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '', tiktok: '' },
  },
  customCode: { headCode: '', bodyCode: '' },
};

/** Deep-merge stored settings over the defaults so old/partial data still works. */
export function withPageDefaults(ps = {}) {
  const d = DEFAULT_PAGE_SETTINGS;
  ps = ps || {};
  return {
    hero: { ...d.hero, ...(ps.hero || {}) },
    products: { ...d.products, ...(ps.products || {}) },
    testimonials: { ...d.testimonials, ...(ps.testimonials || {}) },
    faq: { ...d.faq, ...(ps.faq || {}) },
    customBoxes: { ...d.customBoxes, ...(ps.customBoxes || {}) },
    customBanner: { ...d.customBanner, ...(ps.customBanner || {}) },
    trustBadges: { ...d.trustBadges, ...(ps.trustBadges || {}) },
    footer: { ...d.footer, ...(ps.footer || {}), social: { ...d.footer.social, ...((ps.footer || {}).social || {}) } },
    customCode: { ...d.customCode, ...(ps.customCode || {}) },
  };
}
