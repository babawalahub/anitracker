import React from 'react';
import { Filter, SlidersHorizontal, RotateCcw } from 'lucide-react';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
  'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2015, 2010, 2000];

const SORTS = [
  { label: 'Trending', value: 'TRENDING_DESC' },
  { label: 'Popularity', value: 'POPULARITY_DESC' },
  { label: 'Top Rated', value: 'SCORE_DESC' },
  { label: 'Newest', value: 'START_DATE_DESC' },
];

export default function Filters({
  filters,
  onChange,
  onReset,
  mediaType
}) {
  const formats = mediaType === 'ANIME' 
    ? ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']
    : ['MANGA', 'NOVEL', 'ONE_SHOT'];

  const hasActiveFilters = filters.genre || filters.season || filters.seasonYear || filters.format || filters.sort !== 'TRENDING_DESC';

  return (
    <div className="bg-[#151f2e] border border-[#1e293b] rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] mb-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-sky-400" />
          <span>Filters & Discovery</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        
        {/* Genre Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Genre
          </label>
          <select
            value={filters.genre || ''}
            onChange={(e) => onChange('genre', e.target.value)}
            className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            <option value="">Any Genre</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Format Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Format
          </label>
          <select
            value={filters.format || ''}
            onChange={(e) => onChange('format', e.target.value)}
            className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            <option value="">Any Format</option>
            {formats.map((f) => (
              <option key={f} value={f}>{f.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Season Selector (for Anime) */}
        {mediaType === 'ANIME' && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Season
            </label>
            <select
              value={filters.season || ''}
              onChange={(e) => onChange('season', e.target.value)}
              className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
            >
              <option value="">Any Season</option>
              {SEASONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Year Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Year
          </label>
          <select
            value={filters.seasonYear || ''}
            onChange={(e) => onChange('seasonYear', e.target.value)}
            className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            <option value="">Any Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Sort By
          </label>
          <select
            value={filters.sort || 'TRENDING_DESC'}
            onChange={(e) => onChange('sort', e.target.value)}
            className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}
