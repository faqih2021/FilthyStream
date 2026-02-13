# FilthyStream 🎵

Radio streaming platform yang memungkinkan Anda membuat stasiun radio dengan musik dari **Spotify** dan **YouTube** tanpa perlu upload file MP3 manual.

![FilthyStream](https://img.shields.io/badge/FilthyStream-Radio%20Streaming-purple)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-cyan)

## ✨ Fitur Utama

- **🔗 Stream dari URL** - Cukup paste link Spotify atau YouTube, tidak perlu upload file
- **📺 YouTube Integration** - Putar video YouTube sebagai audio stream
- **🎧 Spotify Integration** - Ambil metadata dan embed dari Spotify
- **📋 Queue Management** - Kelola antrian lagu dengan drag & drop
- **🔀 Mix Playlists** - Gabungkan lagu dari kedua platform dalam satu antrian
- **📻 Radio Stations** - Buat stasiun radio publik atau privat
- **🔴 Live Streaming** - Siarkan musik ke pendengar secara real-time

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Database**: PostgreSQL dengan Prisma ORM
- **Audio**: YouTube IFrame API

## 📦 Instalasi

### Prerequisites

- Node.js 18+
- PostgreSQL database
- (Opsional) Spotify API credentials
- (Opsional) YouTube Data API key

### Setup

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd filthystream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   
   Edit `.env` dengan konfigurasi Anda:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/filthystream"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Spotify API (opsional, untuk metadata)
   SPOTIFY_CLIENT_ID=""
   SPOTIFY_CLIENT_SECRET=""
   
   # YouTube API (opsional, untuk metadata)
   YOUTUBE_API_KEY=""
   ```

4. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

5. **Push database schema**
   ```bash
   npx prisma db push
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Buka browser**
   ```
   http://localhost:3000
   ```

## 🗄️ Database Schema

FilthyStream menggunakan **PostgreSQL** (SQL) karena:

- **Relasi yang jelas**: User → Stations → Queue → Tracks
- **ACID Transactions**: Penting untuk queue management yang reliable
- **Foreign Keys**: Menjaga integritas data
- **Complex Queries**: Support untuk join, aggregation, dan filtering

### Models

| Model | Deskripsi |
|-------|-----------|
| `User` | Akun pengguna |
| `Station` | Stasiun radio |
| `Playlist` | Koleksi lagu tersimpan |
| `Track` | Lagu individual (dari Spotify/YouTube) |
| `QueueItem` | Item dalam antrian stasiun |
| `PlayHistory` | Riwayat pemutaran |

## 📡 API Endpoints

### Tracks
- `POST /api/tracks` - Fetch metadata dari URL

### Stations
- `GET /api/stations` - List semua stasiun publik
- `POST /api/stations` - Buat stasiun baru
- `GET /api/stations/[id]` - Detail stasiun
- `PATCH /api/stations/[id]` - Update stasiun
- `DELETE /api/stations/[id]` - Hapus stasiun

### Queue
- `GET /api/stations/[id]/queue` - Get antrian stasiun
- `POST /api/stations/[id]/queue` - Tambah ke antrian
- `PATCH /api/stations/[id]/queue` - Reorder/skip
- `DELETE /api/stations/[id]/queue` - Hapus dari antrian

## 📱 Halaman

| Route | Deskripsi |
|-------|-----------|
| `/` | Homepage dengan fitur utama |
| `/stations` | Explore semua stasiun |
| `/stations/create` | Buat stasiun baru |
| `/stations/[id]` | Detail & kelola stasiun |

## 🎨 Struktur Folder

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── tracks/        # Track metadata API
│   │   └── stations/      # Stations CRUD API
│   ├── stations/          # Station pages
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── add-track-form.tsx # Form untuk tambah lagu
│   ├── player.tsx         # Audio player UI
│   ├── queue.tsx          # Queue management
│   ├── sidebar.tsx        # Navigation sidebar
│   ├── station-card.tsx   # Station card component
│   └── youtube-player.tsx # YouTube audio player
├── lib/                   # Utilities
│   ├── prisma.ts          # Prisma client
│   └── url-parser.ts      # URL parsing utilities
└── store/                 # State management
    └── player-store.ts    # Zustand store
```

## 🔧 Cara Kerja

### YouTube Playback
FilthyStream menggunakan YouTube IFrame Player API untuk memutar audio dari video YouTube. Player disembunyikan dari UI dan hanya audio yang diputar.

### Spotify Integration
Untuk Spotify, aplikasi mengambil metadata (judul, artist, album art) menggunakan Spotify Web API. Playback menggunakan Spotify embed atau mencari versi YouTube dari lagu tersebut.

### Queue Management
Antrian disimpan di database dan disinkronkan real-time. Mendukung:
- Drag & drop reordering
- Skip track
- Auto-play next track
- History tracking

## 🚀 Production Deployment

1. **Build aplikasi**
   ```bash
   npm run build
   ```

2. **Run production server**
   ```bash
   npm run start
   ```

**Rekomendasi hosting:**
- Vercel (optimal untuk Next.js)
- Railway/Render (dengan PostgreSQL)
- Docker container

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Silakan buat issue atau pull request.

---

Made with ❤️ by FilthyStream Team
