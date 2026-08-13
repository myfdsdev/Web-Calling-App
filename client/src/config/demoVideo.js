/**
 * Product demo video — shown in a popup the first time someone signs in, and
 * re-openable any time from "Watch demo" in the sidebar.
 *
 * ── HOW TO SET IT ──────────────────────────────────────────────────────────
 * Paste the YouTube link into DEMO_VIDEO_URL below (watch / youtu.be / shorts /
 * embed / live links all parse), or set VITE_DEMO_VIDEO_URL in client/.env to
 * point different environments at different cuts.
 *
 * Leave it EMPTY to switch the whole feature off: no popup, no sidebar entry.
 * That is the deliberate default so an unconfigured build never shows a broken
 * player — DEMO_VIDEO_ID resolves to '' and every consumer renders nothing.
 */
export const DEMO_VIDEO_URL =
  import.meta.env.VITE_DEMO_VIDEO_URL || 'https://youtu.be/GuA3tzi03oA?si=5GTCKqM9vqLTKyOJ';

/** Copy shown above/below the player. */
export const DEMO_VIDEO_TITLE = 'Welcome to ringwebai';
export const DEMO_VIDEO_SUBTITLE =
  'A quick tour of how to build a web voice  voice agent, share it, and turn every conversation into a lead.';

/**
 * Pull the 11-character video id out of any YouTube URL shape. Returns '' for
 * anything that isn't one, which is what disables the feature — a typo'd link
 * degrades to "no demo" instead of an embed that 404s inside the dialog.
 */
export function youTubeId(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  // Someone pasted the bare id instead of a link.
  if (/^[\w-]{11}$/.test(raw)) return raw;
  const match = raw.match(/(?:youtu\.be\/|\/(?:embed|shorts|live|v)\/|[?&]v=)([\w-]{11})/);
  return match ? match[1] : '';
}

/** Resolved once at module load — import this rather than re-parsing the URL. */
export const DEMO_VIDEO_ID = youTubeId(DEMO_VIDEO_URL);

/**
 * Player URL for the in-app iframe. youtube-nocookie.com so watching inside the
 * app doesn't drop tracking cookies on our own users.
 */
export function youTubeEmbedUrl(id, { autoplay = true } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0', // keep the "up next" grid to this channel
    modestbranding: '1',
    playsinline: '1', // iOS: play in the dialog instead of hijacking fullscreen
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Poster frame. maxres doesn't exist for every upload — see the onError fallback. */
export const thumbUrl = (id, quality = 'maxresdefault') => `https://i.ytimg.com/vi/${id}/${quality}.jpg`;

/** Escape hatch for anyone who'd rather watch on YouTube itself. */
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
