import React from 'react';
import { Star, Plus, Check, Play, BookOpen } from 'lucide-react';
import { TRACKING_STATUS } from '../services/storage';

export default function MediaCard({ media, userEntry, onSelect, onQuickTrack }) {
  const title = media.title?.english || media.title?.romaji || media.title?.native || 'Unknown Title';
  const cover = media.coverImage?.large || media.coverImage?.medium || media.coverImage?.extraLarge || 'https://via.placeholder.com/300x450?text=No+Cover';
  const score = media.averageScore ? `${media.averageScore}%` : null;

  const isTracked = !!userEntry;
  const statusColor = {
    [TRACKING_STATUS.CURRENT]: 'bg-emerald-500 text-white',
    [TRACKING_STATUS.COMPLETED]: 'bg-sky-500 text-white',
    [TRACKING_STATUS.PLANNING]: 'bg-amber-500 text-white',
    [TRACKING_STATUS.PAUSED]: 'bg-orange-500 text-white',
    [TRACKING_STATUS.DROPPED]: 'bg-rose-500 text-white',
  }[userEntry?.status] || 'bg-slate-700 text-slate-300';

  const formatBadge = media.format || media.type;

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-[#151f2e] border border-[#1e293b] hover:border-sky-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-1">
      
      {/* Poster Image Container */}
      <div 
        onClick={() => onSelect(media)}
        className="relative aspect-[3/4.2] w-full overflow-hidden cursor-pointer bg-slate-900"
      >
        <img
          src={cover}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient Overlay on bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151f2e] via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
          {formatBadge && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur text-white tracking-wider">
              {formatBadge}
            </span>
          )}

          {score && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-black/60 backdrop-blur text-emerald-400">
              <Star className="w-3 h-3 fill-emerald-400" />
              {score}
            </span>
          )}
        </div>

        {/* Quick Tracking Status Pill */}
        {isTracked && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <div className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center justify-between shadow-lg ${statusColor}`}>
              <span className="truncate">
                {userEntry.status === 'CURRENT' 
                  ? (media.type === 'ANIME' ? `Ep ${userEntry.progress || 0}/${media.episodes || '?'}` : `Ch ${userEntry.progress || 0}/${media.chapters || '?'}`)
                  : userEntry.status.charAt(0) + userEntry.status.slice(1).toLowerCase()}
              </span>
              {userEntry.score > 0 && (
                <span className="text-[10px] opacity-90 font-extrabold">★ {userEntry.score}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        
        <div>
          <h3 
            onClick={() => onSelect(media)}
            title={title}
            className="font-bold text-sm text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {title}
          </h3>

          {/* Season / Year / Episodes */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 flex-wrap">
            {media.seasonYear && <span>{media.season ? `${media.season} ` : ''}{media.seasonYear}</span>}
            {media.episodes && (
              <>
                <span>•</span>
                <span>{media.episodes} eps</span>
              </>
            )}
            {media.chapters && (
              <>
                <span>•</span>
                <span>{media.chapters} chs</span>
              </>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/60">
          <div className="flex items-center gap-1 overflow-hidden">
            {media.genres?.slice(0, 2).map((g) => (
              <span key={g} className="text-[10px] text-slate-400 bg-[#1e293b] px-1.5 py-0.5 rounded truncate">
                {g}
              </span>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickTrack(media);
            }}
            title={isTracked ? "Edit tracking" : "Add to list"}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
              isTracked
                ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white'
                : 'bg-[#1e293b] text-slate-300 hover:bg-sky-500 hover:text-white'
            }`}
          >
            {isTracked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

    </div>
  );
}
