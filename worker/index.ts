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

// Cloudflare's endpoint for validating a Turnstile response token server-side.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileEnv extends Env {
  TURNSTILE_SECRET_KEY?: string;
}

interface TurnstileSiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

async function handleVerifyTurnstile(request: Request, env: TurnstileEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("[worker] TURNSTILE_SECRET_KEY is not configured");
    return Response.json({ success: false, error: "TURNSTILE_NOT_CONFIGURED" }, { status: 500 });
  }

  let token: string | undefined;
  try {
    const body = (await request.json()) as { token?: string };
    token = body.token;
  } catch {
    return Response.json({ success: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!token) {
    return Response.json({ success: false, error: "MISSING_TOKEN" }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) formData.append("remoteip", remoteIp);

  try {
    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: formData });
    const outcome = (await verifyRes.json()) as TurnstileSiteverifyResponse;

    if (!outcome.success) {
      return Response.json({ success: false, "error-codes": outcome["error-codes"] }, { status: 200 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error("[worker] Turnstile verification request failed:", err);
    return Response.json({ success: false, error: "VERIFY_REQUEST_FAILED" }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/lyrics" || url.pathname === "/api/lyrics") {
      return handleLyrics(request, env as LyricsEnv);
    }

    if (url.pathname === "/api/verify-turnstile") {
      return handleVerifyTurnstile(request, env as TurnstileEnv);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }
		return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;