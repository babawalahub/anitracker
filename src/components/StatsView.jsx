import React from 'react';
import { 
  Tv, Film, BookOpen, Clock, Star, Flame, 
  BarChart3, CheckCircle2, Bookmark, PauseCircle, XCircle, ArrowLeft 
} from 'lucide-react';
import { computeUserStats, TRACKING_STATUS } from '../services/storage';

export default function StatsView({ onBackToBrowse }) {
  const stats = computeUserStats();

  const total = stats.totalEntries || 1;
  const statusPct = {
    CURRENT: Math.round((stats.statusBreakdown.CURRENT / total) * 100),
    COMPLETED: Math.round((stats.statusBreakdown.COMPLETED / total) * 100),
    PLANNING: Math.round((stats.statusBreakdown.PLANNING / total) * 100),
    PAUSED: Math.round((stats.statusBreakdown.PAUSED / total) * 100),
    DROPPED: Math.round((stats.statusBreakdown.DROPPED / total) * 100),
  };

  // Sort top genres
  const sortedGenres = Object.entries(stats.genreCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxGenreCount = sortedGenres[0]?.[1] || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Back button header */}
      {onBackToBrowse && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToBrowse}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#151f2e] hover:bg-sky-500 text-slate-300 hover:text-white border border-[#1e293b] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse</span>
          </button>
        </div>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Anime</span>
            <Film className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{stats.animeCount}</p>
        </div>

        <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Episodes</span>
            <Tv className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{stats.totalEpisodesWatched}</p>
        </div>

        <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Days Watched</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{stats.totalDaysWatched} <span className="text-xs font-normal text-slate-400">days</span></p>
        </div>

        <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Mean Score</span>
            <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.meanScore} <span className="text-xs font-normal text-slate-400">/ 10</span></p>
        </div>

        <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Manga</span>
            <BookOpen className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{stats.mangaCount}</p>
        </div>

        <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chapters</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{stats.totalChaptersRead}</p>
        </div>

      </div>

      {/* Status Breakdown Bar */}
      <div className="bg-[#151f2e] border border-[#1e293b] p-6 rounded-2xl">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span>Status Distribution</span>
        </h3>

        {/* Multi-colored Progress Bar */}
        <div className="h-4 w-full rounded-full bg-[#0b1622] overflow-hidden flex gap-0.5 p-0.5 border border-[#1e293b]">
          {statusPct.CURRENT > 0 && (
            <div style={{ width: `${statusPct.CURRENT}%` }} className="bg-emerald-500 rounded-l-full" title={`Watching: ${stats.statusBreakdown.CURRENT}`} />
          )}
          {statusPct.COMPLETED > 0 && (
            <div style={{ width: `${statusPct.COMPLETED}%` }} className="bg-sky-500" title={`Completed: ${stats.statusBreakdown.COMPLETED}`} />
          )}
          {statusPct.PLANNING > 0 && (
            <div style={{ width: `${statusPct.PLANNING}%` }} className="bg-amber-500" title={`Planning: ${stats.statusBreakdown.PLANNING}`} />
          )}
          {statusPct.PAUSED > 0 && (
            <div style={{ width: `${statusPct.PAUSED}%` }} className="bg-orange-500" title={`Paused: ${stats.statusBreakdown.PAUSED}`} />
          )}
          {statusPct.DROPPED > 0 && (
            <div style={{ width: `${statusPct.DROPPED}%` }} className="bg-rose-500 rounded-r-full" title={`Dropped: ${stats.statusBreakdown.DROPPED}`} />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">Watching / Reading</p>
              <p className="text-white font-bold">{stats.statusBreakdown.CURRENT} ({statusPct.CURRENT}%)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500 flex-shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">Completed</p>
              <p className="text-white font-bold">{stats.statusBreakdown.COMPLETED} ({statusPct.COMPLETED}%)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">Planning</p>
              <p className="text-white font-bold">{stats.statusBreakdown.PLANNING} ({statusPct.PLANNING}%)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">Paused</p>
              <p className="text-white font-bold">{stats.statusBreakdown.PAUSED} ({statusPct.PAUSED}%)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">Dropped</p>
              <p className="text-white font-bold">{stats.statusBreakdown.DROPPED} ({statusPct.DROPPED}%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Genres Breakdown */}
      <div className="bg-[#151f2e] border border-[#1e293b] p-6 rounded-2xl">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
          Favorite Genres
        </h3>

        {sortedGenres.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Track more titles to see your genre breakdown.</p>
        ) : (
          <div className="space-y-3">
            {sortedGenres.map(([genre, count]) => {
              const pct = Math.round((count / maxGenreCount) * 100);
              return (
                <div key={genre} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">{genre}</span>
                    <span className="text-slate-400">{count} titles</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#0b1622] overflow-hidden">
                    <div 
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
