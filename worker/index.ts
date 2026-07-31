// LRCLIB (lrclib.net) is free, requires no API key, and is built specifically
// for FOSS music players — so it's the default. LYRICS_API_URL can still be
// set (in wrangler.jsonc "vars", or as a secret) to point at a different
// provider instead, as long as it accepts track_name/artist_name and returns
// { plainLyrics, syncedLyrics } in the same shape LRCLIB does.
interface LyricsEnv extends Env {
  LYRICS_API_URL?: string;
}

const DEFAULT_LYRICS_API_URL = "https://lrclib.net/api/get";

// LRCLIB's synced lyrics are LRC-formatted with a "[mm:ss.xx] " timestamp on
// each line. The client currently renders lyrics as plain scrolling text
// (no time-synced highlighting yet), so timestamps are stripped for display.
function stripLrcTimestamps(lrc: string): string {
  return lrc
    .split("\n")
    .map((line) => line.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, ""))
    .join("\n");
}

async function handleLyrics(request: Request, env: LyricsEnv): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const artist = searchParams.get("artist")?.trim();

  if (!title || !artist) {
    return Response.json({ error: "MISSING_TITLE_OR_ARTIST" }, { status: 400 });
  }

  try {
    const upstream = new URL(env.LYRICS_API_URL || DEFAULT_LYRICS_API_URL);
    upstream.searchParams.set("track_name", title);
    upstream.searchParams.set("artist_name", artist);

    const res = await fetch(upstream.toString(), {
      headers: { "User-Agent": "Aura Music App (https://github.com/PieJT/Jump)" },
    });

    // LRCLIB returns 404 when it just has no match for this track — that's a
    // normal "no lyrics found" outcome, not a real error.
    if (res.status === 404) {
      return Response.json({ lyrics: null, synced: false });
    }
    if (!res.ok) {
      return Response.json({ error: `Upstream lyrics provider returned ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as { plainLyrics?: string; syncedLyrics?: string };
    if (data.plainLyrics) {
      return Response.json({ lyrics: data.plainLyrics, synced: false });
    }
    if (data.syncedLyrics) {
      return Response.json({ lyrics: stripLrcTimestamps(data.syncedLyrics), synced: true });
    }
    return Response.json({ lyrics: null, synced: false });
  } catch (err) {
    console.error("[worker] lyrics fetch failed:", err);
    return Response.json({ error: "LYRICS_FETCH_FAILED" }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/lyrics" || url.pathname === "/api/lyrics") {
      return handleLyrics(request, env as LyricsEnv);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }
		return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;