import { useEffect } from 'react';

/** Create-or-update a <meta> tag; returns a function that restores it. */
function upsertMeta(attr, key, value) {
  if (!value) return () => {};
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  let created = false;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
    created = true;
  }
  const previous = el.getAttribute('content');
  el.setAttribute('content', value);
  return () => {
    if (created) el.remove();
    else if (previous !== null) el.setAttribute('content', previous);
  };
}

/**
 * Set the page title + social meta for one route, restoring whatever was there
 * before when the component unmounts. Plain DOM APIs — no extra dependency.
 *
 * Note: most social crawlers (WhatsApp, Facebook) don't run JavaScript, so they
 * read the static tags in index.html. This keeps the browser tab, in-app shares
 * and JS-capable crawlers (e.g. Google) accurate.
 */
export function useDocumentMeta({ title, description, image, url }) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    const restores = [
      upsertMeta('name', 'description', description),
      upsertMeta('property', 'og:title', title),
      upsertMeta('property', 'og:description', description),
      upsertMeta('property', 'og:image', image),
      upsertMeta('property', 'og:url', url),
      upsertMeta('name', 'twitter:title', title),
      upsertMeta('name', 'twitter:description', description),
      upsertMeta('name', 'twitter:image', image),
    ];

    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
    };
  }, [title, description, image, url]);
}
