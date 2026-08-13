import { useEffect, useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Dialog, DialogClose } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import {
  DEMO_VIDEO_TITLE,
  DEMO_VIDEO_SUBTITLE,
  youTubeEmbedUrl,
  thumbUrl,
  watchUrl,
} from '../../config/demoVideo.js';

/**
 * The demo player itself. Shows a poster frame first and only mounts the YouTube
 * iframe once the user hits play — so opening the popup costs no third-party
 * request, and nothing ever starts talking at someone unprompted.
 */
export function DemoVideoDialog({ open, onClose, videoId }) {
  const [playing, setPlaying] = useState(false);
  // maxresdefault is missing on plenty of uploads; hqdefault always exists.
  const [poster, setPoster] = useState(thumbUrl(videoId));

  // Closing unmounts the iframe (audio stops with it) — reset so the next open
  // starts from the poster rather than silently re-autoplaying.
  useEffect(() => {
    if (!open) setPlaying(false);
  }, [open]);

  useEffect(() => {
    setPoster(thumbUrl(videoId));
  }, [videoId]);

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl" labelledBy="demo-video-title">
      <DialogClose onClose={onClose} />

      <div className="p-5 pr-14 sm:p-6 sm:pr-16">
        <h2 id="demo-video-title" className="text-card-title font-semibold text-ink">
          {DEMO_VIDEO_TITLE}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{DEMO_VIDEO_SUBTITLE}</p>
      </div>

      <div className="relative aspect-video w-full overflow-hidden border-y border-line bg-black">
        {playing ? (
          <iframe
            src={youTubeEmbedUrl(videoId)}
            title={DEMO_VIDEO_TITLE}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center focus-ring"
            aria-label="Play the demo video"
          >
            <img
              src={poster}
              alt=""
              aria-hidden
              onError={() => setPoster(thumbUrl(videoId, 'hqdefault'))}
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-200 group-hover:opacity-85"
            />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-[#0A0A0A] shadow-pop transition-transform duration-150 ease-premium group-hover:scale-105">
              <Play className="ml-0.5 h-7 w-7 fill-current" />
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <a
          href={watchUrl(videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-ring"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Watch on YouTube
        </a>
        <Button size="md" onClick={onClose} className="sm:min-w-[160px]">
          Got it — let&apos;s go
        </Button>
      </div>
    </Dialog>
  );
}
