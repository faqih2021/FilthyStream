-- =============================================
-- FilthyStream Database Schema for Supabase
-- Copy paste ini ke SQL Editor di Supabase Dashboard
-- NOTE: Authentication ditangani oleh Supabase Auth (auth.users)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. STATIONS TABLE (Radio Stations)
-- =============================================
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_live BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    listen_key UUID UNIQUE DEFAULT uuid_generate_v4(),
    play_count INTEGER DEFAULT 0,
    listener_count INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stations_user_id ON stations(user_id);
CREATE INDEX IF NOT EXISTS idx_stations_listen_key ON stations(listen_key);
CREATE INDEX IF NOT EXISTS idx_stations_is_public ON stations(is_public);
CREATE INDEX IF NOT EXISTS idx_stations_play_count ON stations(play_count DESC);

-- =============================================
-- 2. TRACKS TABLE (Lagu dari Spotify/YouTube)
-- =============================================
DO $$ BEGIN
    CREATE TYPE source_type AS ENUM ('SPOTIFY', 'YOUTUBE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    album VARCHAR(255),
    duration INTEGER, -- dalam detik
    image_url TEXT,
    source_type source_type NOT NULL,
    source_id VARCHAR(100) NOT NULL, -- Spotify track ID atau YouTube video ID
    source_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source_type, source_id);

-- =============================================
-- 3. PLAYLISTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);

-- =============================================
-- 4. PLAYLIST_TRACKS TABLE (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS playlist_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);

-- =============================================
-- 5. QUEUE_ITEMS TABLE (Antrian Station)
-- =============================================
DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('PENDING', 'PLAYING', 'PLAYED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status queue_status DEFAULT 'PENDING',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_station ON queue_items(station_id);
CREATE INDEX IF NOT EXISTS idx_queue_position ON queue_items(station_id, position);

-- =============================================
-- 6. PLAY_HISTORY TABLE (Riwayat Pemutaran)
-- =============================================
CREATE TABLE IF NOT EXISTS play_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_history_station ON play_history(station_id);
CREATE INDEX IF NOT EXISTS idx_history_played_at ON play_history(station_id, played_at);

-- =============================================
-- 7. UPDATE TRIGGER (auto update updated_at)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger ke tables yang punya updated_at
CREATE TRIGGER update_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;

-- Stations: publik bisa dibaca semua, private hanya owner
CREATE POLICY "Public stations are viewable" ON stations
    FOR SELECT USING (is_public = true OR auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own stations" ON stations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own stations" ON stations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own stations" ON stations
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Playlists: sama seperti stations
CREATE POLICY "Public playlists are viewable" ON playlists
    FOR SELECT USING (is_public = true OR auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own playlists" ON playlists
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Queue: bisa diakses jika station public atau owner
CREATE POLICY "Queue accessible for public stations" ON queue_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stations 
            WHERE stations.id = queue_items.station_id 
            AND (stations.is_public = true OR auth.uid()::text = stations.user_id::text)
        )
    );

CREATE POLICY "Station owner can manage queue" ON queue_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stations 
            WHERE stations.id = queue_items.station_id 
            AND auth.uid()::text = stations.user_id::text
        )
    );

-- Tracks: semua orang bisa baca dan insert
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are viewable by everyone" ON tracks
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert tracks" ON tracks
    FOR INSERT WITH CHECK (true);

-- =============================================
-- SELESAI! Database siap digunakan
-- =============================================
