export interface RecommendedPlaylist {
  title: string;
  query: string;
  /** Optional hardcoded thumbnail URL. If set, no search request is made just to fetch art for this tile. */
  thumb?: string;
}

export interface RecommendedArtist {
  name: string;
  /** Optional hardcoded thumbnail URL. If set, no search request is made just to fetch art for this tile. */
  thumb?: string;
}

// Each entry maps a friendly display title to a search query sent to the
// search Worker — no dedicated recommendations API exists, so this reuses
// the same /search endpoint with curated seed queries. Add a `thumb` to any
// entry to pin its artwork and skip fetching it entirely.
export const RECOMMENDED_PLAYLISTS: RecommendedPlaylist[] = [
  { title: "Late Night Lo-fi", query: "lofi chill beats" },
  { title: "Bedroom Pop Feels", query: "bedroom pop" },
  { title: "Throwback 2000s", query: "2000s pop hits" },
  { title: "Indie Rock Essentials", query: "indie rock essentials" },
  { title: "Deep Focus", query: "deep focus instrumental" },
  { title: "Workout Energy", query: "workout hype hip hop" },
];

export const RECOMMENDED_ARTISTS: RecommendedArtist[] = [
  { name: "Tame Impala" },
  { name: "Frank Ocean" },
  { name: "Daft Punk" },
  { name: "Billie Eilish" },
  { name: "Tyler, The Creator" },
  { name: "Radiohead" },
  { name: "SZA" },
  { name: "The Weeknd" },
];