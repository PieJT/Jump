export interface RecommendedPlaylist {
  title: string;
  query: string;
}

// Each entry maps a friendly display title to a search query sent to the
// search Worker — no dedicated recommendations API exists, so this reuses
// the same /search endpoint with curated seed queries.
export const RECOMMENDED_PLAYLISTS: RecommendedPlaylist[] = [
  { title: "Late Night Lo-fi", query: "lofi chill beats" },
  { title: "Bedroom Pop Feels", query: "bedroom pop" },
  { title: "Throwback 2000s", query: "2000s pop hits" },
  { title: "Indie Rock Essentials", query: "indie rock essentials" },
  { title: "Deep Focus", query: "deep focus instrumental" },
  { title: "Workout Energy", query: "workout hype hip hop" },
];

export const RECOMMENDED_ARTISTS: string[] = [
  "Tame Impala",
  "Frank Ocean",
  "Daft Punk",
  "Billie Eilish",
  "Tyler, The Creator",
  "Radiohead",
  "SZA",
  "The Weeknd",
];