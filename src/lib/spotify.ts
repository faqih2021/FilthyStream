// Spotify API utilities for fetching playlist and track metadata

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
  };
  external_urls: {
    spotify: string;
  };
}

interface SpotifyPlaylistTrack {
  track: SpotifyTrack | null;
  added_at: string;
}

export interface ParsedSpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  durationFormatted: string;
  image: string | null;
  spotifyUrl: string;
}

export interface ParsedSpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  image: string | null;
  owner: string;
  totalTracks: number;
  tracks: ParsedSpotifyTrack[];
  spotifyUrl: string;
}

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data: SpotifyToken = await response.json();
  
  // Cache token (expire 1 minute early to be safe)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

/**
 * Format duration from milliseconds to mm:ss
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Extract Spotify ID from URL or return as-is if already an ID
 */
export function extractSpotifyId(input: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  // Handle full URLs
  const urlMatch = input.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return { type: urlMatch[1] as 'track' | 'playlist' | 'album', id: urlMatch[2] };
  }

  // Handle spotify: URIs
  const uriMatch = input.match(/spotify:(track|playlist|album):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return { type: uriMatch[1] as 'track' | 'playlist' | 'album', id: uriMatch[2] };
  }

  return null;
}

/**
 * Get single track metadata
 */
export async function getSpotifyTrack(trackId: string): Promise<ParsedSpotifyTrack> {
  const token = await getAccessToken();
  
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch track: ${response.statusText}`);
  }

  const track: SpotifyTrack = await response.json();

  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    duration: Math.floor(track.duration_ms / 1000),
    durationFormatted: formatDuration(track.duration_ms),
    image: track.album.images[0]?.url || null,
    spotifyUrl: track.external_urls.spotify,
  };
}

/**
 * Get playlist metadata with all tracks
 */
export async function getSpotifyPlaylist(playlistId: string): Promise<ParsedSpotifyPlaylist> {
  const token = await getAccessToken();
  
  // Get playlist info
  const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!playlistResponse.ok) {
    throw new Error(`Failed to fetch playlist: ${playlistResponse.statusText}`);
  }

  const playlist = await playlistResponse.json();
  
  // Fetch all tracks (handle pagination)
  const tracks: ParsedSpotifyTrack[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) break;

    const tracksData: { items: SpotifyPlaylistTrack[]; next: string | null } = await resp.json();
    
    for (const item of tracksData.items) {
      if (item.track) {
        tracks.push({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          album: item.track.album.name,
          duration: Math.floor(item.track.duration_ms / 1000),
          durationFormatted: formatDuration(item.track.duration_ms),
          image: item.track.album.images[0]?.url || null,
          spotifyUrl: item.track.external_urls.spotify,
        });
      }
    }

    nextUrl = tracksData.next;
  }

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description || '',
    image: playlist.images[0]?.url || null,
    owner: playlist.owner.display_name,
    totalTracks: playlist.tracks.total,
    tracks,
    spotifyUrl: playlist.external_urls.spotify,
  };
}

/**
 * Get album metadata with all tracks
 */
export async function getSpotifyAlbum(albumId: string): Promise<ParsedSpotifyPlaylist> {
  const token = await getAccessToken();
  
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch album: ${response.statusText}`);
  }

  const album = await response.json();
  
  const tracks: ParsedSpotifyTrack[] = album.tracks.items.map((track: SpotifyTrack) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.map((a: SpotifyArtist) => a.name).join(', '),
    album: album.name,
    duration: Math.floor(track.duration_ms / 1000),
    durationFormatted: formatDuration(track.duration_ms),
    image: album.images[0]?.url || null,
    spotifyUrl: track.external_urls.spotify,
  }));

  return {
    id: album.id,
    name: album.name,
    description: `Album by ${album.artists.map((a: SpotifyArtist) => a.name).join(', ')}`,
    image: album.images[0]?.url || null,
    owner: album.artists.map((a: SpotifyArtist) => a.name).join(', '),
    totalTracks: album.total_tracks,
    tracks,
    spotifyUrl: album.external_urls.spotify,
  };
}
