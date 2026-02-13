-- ============================================
-- FilthyStream Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE "SourceType" AS ENUM ('SPOTIFY', 'YOUTUBE');
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PLAYING', 'PLAYED', 'SKIPPED');

-- Stations table
CREATE TABLE "stations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "listen_key" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "listener_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "user_id" UUID NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stations_listen_key_key" ON "stations"("listen_key");
CREATE INDEX "stations_user_id_idx" ON "stations"("user_id");
CREATE INDEX "stations_listen_key_idx" ON "stations"("listen_key");
CREATE INDEX "stations_play_count_idx" ON "stations"("play_count" DESC);

-- Playlists table
CREATE TABLE "playlists" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "user_id" UUID NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "playlists_user_id_idx" ON "playlists"("user_id");

-- Tracks table
CREATE TABLE "tracks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "artist" VARCHAR(255),
    "album" VARCHAR(255),
    "duration" INTEGER,
    "image_url" TEXT,
    "source_type" "SourceType" NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracks_source_type_source_id_key" ON "tracks"("source_type", "source_id");
CREATE INDEX "tracks_source_type_source_id_idx" ON "tracks"("source_type", "source_id");

-- Playlist Tracks (many-to-many)
CREATE TABLE "playlist_tracks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "position" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "playlist_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,

    CONSTRAINT "playlist_tracks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "playlist_tracks_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE,
    CONSTRAINT "playlist_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "playlist_tracks_playlist_id_track_id_key" ON "playlist_tracks"("playlist_id", "track_id");
CREATE INDEX "playlist_tracks_playlist_id_idx" ON "playlist_tracks"("playlist_id");

-- Queue Items
CREATE TABLE "queue_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "position" INTEGER NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "station_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "queue_items_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE,
    CONSTRAINT "queue_items_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE
);

CREATE INDEX "queue_items_station_id_idx" ON "queue_items"("station_id");
CREATE INDEX "queue_items_station_id_position_idx" ON "queue_items"("station_id", "position");

-- Play History
CREATE TABLE "play_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "played_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ended_at" TIMESTAMPTZ,
    "station_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,

    CONSTRAINT "play_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "play_history_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE,
    CONSTRAINT "play_history_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE
);

CREATE INDEX "play_history_station_id_idx" ON "play_history"("station_id");
CREATE INDEX "play_history_station_id_played_at_idx" ON "play_history"("station_id", "played_at");

-- Saved Tracks (user library)
CREATE TABLE "saved_tracks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "user_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,

    CONSTRAINT "saved_tracks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saved_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "saved_tracks_user_id_track_id_key" ON "saved_tracks"("user_id", "track_id");
CREATE INDEX "saved_tracks_user_id_idx" ON "saved_tracks"("user_id");
CREATE INDEX "saved_tracks_saved_at_idx" ON "saved_tracks"("saved_at" DESC);

-- Listening History
CREATE TABLE "listening_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "played_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "user_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,

    CONSTRAINT "listening_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "listening_history_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE
);

CREATE INDEX "listening_history_user_id_idx" ON "listening_history"("user_id");
CREATE INDEX "listening_history_user_id_played_at_idx" ON "listening_history"("user_id", "played_at" DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stations_updated_at
    BEFORE UPDATE ON "stations"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER playlists_updated_at
    BEFORE UPDATE ON "playlists"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Done!
-- After running this, update your .env with the new Supabase credentials.
