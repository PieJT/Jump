// Optional var so a lyrics provider can be wired up without editing this file —
// set LYRICS_API_URL in wrangler.jsonc ("vars") or as a Worker secret. It's
// expected to accept ?title=&artist= and respond with { lyrics, synced }.
interface LyricsEnv extends Env {
  LYRICS_API_URL?: string;
}

async function handleLyrics(request: Request, env: LyricsEnv): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const artist = searchParams.get("artist")?.trim();

  if (!title || !artist) {
    return Response.json({ error: "MISSING_TITLE_OR_ARTIST" }, { status: 400 });
  }

  if (!env.LYRICS_API_URL) {
    return Response.json({ error: "LYRICS_API_URL not configured on this Worker" }, { status: 501 });
  }

  try {
    const upstream = new URL(env.LYRICS_API_URL);
    upstream.searchParams.set("title", title);
    upstream.searchParams.set("artist", artist);

    const res = await fetch(upstream.toString());
    if (!res.ok) {
      return Response.json({ error: `Upstream lyrics provider returned ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as { lyrics?: string; synced?: boolean };
    return Response.json({ lyrics: data.lyrics ?? null, synced: Boolean(data.synced) });
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