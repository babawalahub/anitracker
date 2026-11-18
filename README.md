# AniTrack - Complete Anime & Manga Tracking Platform

A modern, responsive anime and manga tracking application inspired by **AniList**, built with React, Vite, Tailwind CSS, and Lucide Icons.

---

## 🚀 Quick Start

To start the website locally:

```bash
# Option 1: Double-click start.bat (on Windows)

# Option 2: Run in your terminal
npm run dev
```

Open your browser at: **[http://localhost:3000](http://localhost:3000)**

To create a production-optimized build:
```bash
npm run build
```

---

## 🌟 Key Features

1. **Live & Offline Data Integration**:
   - Connects in real-time to the official **AniList GraphQL API** (`https://graphql.anilist.co`) for live search, rankings, airing episodes, characters, voice actors, and YouTube trailers.
   - Includes a **built-in fallback seed dataset** (top anime & manga) so the website works immediately even if offline or network-throttled.
2. **Complete Tracking System**:
   - Statuses: **Watching / Reading**, **Completed**, **Plan to Watch**, **Paused**, **Dropped**.
   - Interactive progress stepper (`+` and `-` buttons) for episodes and chapters.
   - Auto-completion when reaching maximum episodes.
   - Rating score slider (0 - 10 with half-stars).
   - Personal notes and timestamps.
3. **AniList-Style "My List" View**:
   - Filterable tabs by status.
   - **Inline 1-Click `+` button** to update your current episode directly from your list.
   - Live search within your personal watchlist.
4. **User Statistics Dashboard**:
   - Total anime and manga tracked.
   - Total episodes watched & chapters read.
   - Total days spent watching anime (calculated automatically based on episode runtime).
   - Mean / average user score.
   - Visual status distribution bar.
   - Top favorite genres ranking.
5. **Backup & Restore (Import / Export)**:
   - Export your entire tracking history to a `.json` backup file.
   - Restore or import backup files anytime to transfer your data across browsers or computers.
6. **Filters & Discovery**:
   - Filter by format (`TV`, `Movie`, `OVA`, `Manga`, `Novel`, etc.).
   - Filter by season (`Winter`, `Spring`, `Summer`, `Fall`) and release year.
   - Filter by 18+ genres (`Action`, `Fantasy`, `Romance`, `Sci-Fi`, etc.).
   - Sort by Trending, Popularity, Top Rated, and Newest.

---

## 🛠️ Errors Encountered & How They Were Fixed

During the setup process, 3 key errors were encountered and resolved:

1. **PostCSS ES Module Syntax Error**:
   - *Error:* `[SyntaxError] Unexpected token 'export' in postcss.config.js`.
   - *Cause:* Node.js treated `postcss.config.js` as CommonJS because `package.json` lacked `"type": "module"`.
   - *Fix:* Added `"type": "module"` to `package.json` and converted all config files to standard ES Module syntax.

2. **Tailwind v4 PostCSS Plugin Separation**:
   - *Error:* `It looks like you're trying to use 'tailwindcss' directly as a PostCSS plugin... The PostCSS plugin has moved to a separate package`.
   - *Cause:* Tailwind CSS v4 separated its core engine into `@tailwindcss/postcss` and `@tailwindcss/oxide`.
   - *Fix:* Configured Tailwind CSS v3.4.17 with PostCSS and Autoprefixer, which provides maximum stability across Node 18+ on Windows.

3. **Node.js Engine Compatibility Warning**:
   - *Error:* `npm warn EBADENGINE Unsupported engine { package: '@tailwindcss/oxide@4.3.5', required: { node: '>= 20' } }`.
   - *Cause:* Node 18.20.8 was running, whereas Tailwind v4 oxide requires Node 20+.
   - *Fix:* Standardized on Tailwind v3.4.17, allowing clean zero-warning builds in under 5 seconds.
