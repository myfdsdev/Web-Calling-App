/**
 * Shared shape + merge helper for the public agent page.
 *
 * The public page is nothing more than the chat/call widget, so these are the
 * only settings an owner can configure. (Older drafts may still carry hero /
 * footer / product keys from a previous design — they're simply ignored.)
 */

export const DEFAULT_PAGE_SETTINGS = {
  chatWidget: {
    image: '',
    name: '',
    role: '',
    description: '',

    // Page backdrop
    bgStart: '#1B1B3A',
    bgEnd: '#0B0B14',

    // "Start the conversation" button
    ctaLabel: '',
    ctaFrom: '#F97316',
    ctaTo: '#14B8A6',

    // "Start a voice call" button
    callLabel: '',
    callFrom: '#14B8A6',
    callTo: '#6366F1',
  },
};

/** Merge stored settings over the defaults so old/partial data still works. */
export function withPageDefaults(ps = {}) {
  const d = DEFAULT_PAGE_SETTINGS;
  ps = ps || {};
  return {
    chatWidget: { ...d.chatWidget, ...(ps.chatWidget || {}) },
  };
}

/** The shared page/widget backdrop built from the owner's two colours. */
export function widgetBackground(w = {}) {
  const start = w.bgStart || DEFAULT_PAGE_SETTINGS.chatWidget.bgStart;
  const end = w.bgEnd || DEFAULT_PAGE_SETTINGS.chatWidget.bgEnd;
  return { background: `radial-gradient(1100px 600px at 50% -10%, ${start}, ${end} 62%)` };
}

/** Left-to-right gradient for a configurable button. */
export function gradientStyle(from, to, fallbackFrom, fallbackTo) {
  return {
    backgroundImage: `linear-gradient(90deg, ${from || fallbackFrom}, ${to || fallbackTo})`,
  };
}

/** Ready-made styles for the two call-to-action buttons. */
export function ctaStyle(w = {}) {
  const d = DEFAULT_PAGE_SETTINGS.chatWidget;
  return gradientStyle(w.ctaFrom, w.ctaTo, d.ctaFrom, d.ctaTo);
}
export function callStyle(w = {}) {
  const d = DEFAULT_PAGE_SETTINGS.chatWidget;
  return gradientStyle(w.callFrom, w.callTo, d.callFrom, d.callTo);
}
