// ---- VIDEO: the source's classification -----------------------------------------------------------
//
// A `video` field holds TWO possible things, and the app does not know which:
//   • a video HOSTED by the platform → the URL comes RESOLVED by the server (a signed HLS once the encoding
//     has finished; a presigned MP4 from R2 while it processes, or if the data already stored was discarded for lack of credit);
//   • an EXTERNAL LINK (YouTube/Vimeo) the app's owner pasted — free, but public.
//
// The SAME source changes type over the video's life (MP4 → HLS → MP4). That is why the classification is done at
// play time, and not written on the record.
export type VideoSource =
  | { kind: "hls"; url: string }        // Cloudflare Stream (adaptive quality)
  | { kind: "mp4"; url: string }        // the master on R2 (with no ABR) — the encoding is under way, or there is no credit
  | { kind: "youtube"; id: string; url: string }
  | { kind: "vimeo"; id: string; url: string }
  | { kind: "empty" };

/** It classifies a `video` field's value for the <VideoPlayer/>. Tolerant: an empty/invalid value → `empty`. */
export function videoSource(value: string | null | undefined): VideoSource {
  const v = (value || "").trim();
  if (!v) return { kind: "empty" };

  const yt = v.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return { kind: "youtube", id: yt[1], url: `https://www.youtube.com/embed/${yt[1]}` };

  const vm = v.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: "vimeo", id: vm[1], url: `https://player.vimeo.com/video/${vm[1]}` };

  // an `.m3u8` may come with a query string (the Stream's signed token is part of the PATH, but the URL may have params).
  if (/\.m3u8(\?|$)/i.test(v)) return { kind: "hls", url: v };
  return { kind: "mp4", url: v };
}
