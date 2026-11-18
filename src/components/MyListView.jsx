import React, { useState } from 'react';
import { 
  Plus, Minus, Check, Star, Search, Trash2, Edit3, 
  ExternalLink, Film, BookOpen, Layers, ArrowLeft 
} from 'lucide-react';
import { TRACKING_STATUS, STATUS_LABELS, upsertEntry, deleteEntry } from '../services/storage';

export default function MyListView({
  lists,
  onSelectMedia,
  onUpdated,
  onBackToBrowse
}) {
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL'); // ALL, ANIME, MANGA
  const [searchQuery, setSearchQuery] = useState('');

  const allEntries = Object.values(lists);

  // Filter entries
  const filtered = allEntries.filter(entry => {
    if (activeStatusTab !== 'ALL' && entry.status !== activeStatusTab) return false;
    if (filterType !== 'ALL' && entry.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleEng = (entry.title?.english || '').toLowerCase();
      const titleRom = (entry.title?.romaji || '').toLowerCase();
      return titleEng.includes(q) || titleRom.includes(q);
    }
    return true;
  });

  const handleIncrement = (entry) => {
    const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
    const nextProgress = (entry.progress || 0) + 1;
    
    upsertEntry({
      id: entry.mediaId,
      type: entry.type,
      title: entry.title,
      coverImage: entry.coverImage,
      format: entry.format,
      episodes: entry.maxEpisodes,
      chapters: entry.maxChapters,
      duration: entry.duration,
      genres: entry.genres
    }, {
      status: (max && nextProgress >= max) ? TRACKING_STATUS.COMPLETED : entry.status,
      progress: max ? Math.min(nextProgress, max) : nextProgress,
      score: entry.score,
      notes: entry.notes
    });

    if (onUpdated) onUpdated();
  };

  const handleScoreChange = (entry, newScore) => {
    upsertEntry({
      id: entry.mediaId,
      type: entry.type,
      title: entry.title,
      coverImage: entry.coverImage,
      format: entry.format,
      episodes: entry.maxEpisodes,
      chapters: entry.maxChapters,
      duration: entry.duration,
      genres: entry.genres
    }, {
      status: entry.status,
      progress: entry.progress,
      score: parseFloat(newScore) || 0,
      notes: entry.notes
    });

    if (onUpdated) onUpdated();
  };

  const statusCounts = {
    ALL: allEntries.length,
    CURRENT: allEntries.filter(e => e.status === TRACKING_STATUS.CURRENT).length,
    COMPLETED: allEntries.filter(e => e.status === TRACKING_STATUS.COMPLETED).length,
    PLANNING: allEntries.filter(e => e.status === TRACKING_STATUS.PLANNING).length,
    PAUSED: allEntries.filter(e => e.status === TRACKING_STATUS.PAUSED).length,
    DROPPED: allEntries.filter(e => e.status === TRACKING_STATUS.DROPPED).length,
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
        
        {/* Left Side: Back button + Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {onBackToBrowse && (
            <button
              onClick={onBackToBrowse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0b1622] hover:bg-sky-500 text-slate-300 hover:text-white border border-[#1e293b] transition-all flex-shrink-0"
              title="Back to Browse"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {['ALL', 'CURRENT', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED'].map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatusTab(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeStatusTab === st
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-[#0b1622] text-slate-400 hover:text-white border border-[#1e293b]'
              }`}
            >
              <span>{st === 'ALL' ? 'All' : STATUS_LABELS[st]}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeStatusTab === st ? 'bg-black/30 text-white' : 'bg-[#1e293b] text-slate-400'
              }`}>
                {statusCounts[st] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filter & Search Controls */}
        <div className="flex items-center gap-2">
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Media</option>
            <option value="ANIME">Anime Only</option>
            <option value="MANGA">Manga Only</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0b1622] border border-[#1e293b] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 sm:w-48"
            />
          </div>

        </div>

      </div>

      {/* List Table / Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#151f2e] border border-[#1e293b] rounded-2xl">
          <Layers className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white">No items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {allEntries.length === 0
              ? "You haven't tracked any anime or manga yet. Search or browse and click '+ Add to List' to start!"
              : "No titles match your selected filters."}
          </p>
        </div>
      ) : (
        <div className="bg-[#151f2e] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1622] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 w-32 text-center">Score</th>
                  <th className="py-3 px-4 w-44 text-center">Progress</th>
                  <th className="py-3 px-4 w-32 text-center">Type</th>
                  <th className="py-3 px-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] text-xs">
                {filtered.map((entry, index) => {
                  const title = entry.title?.english || entry.title?.romaji || 'Unknown';
                  const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
                  const unit = entry.type === 'ANIME' ? 'ep' : 'ch';

                  return (
                    <tr 
                      key={entry.mediaId}
                      className="hover:bg-[#1a2638] transition-colors group"
                    >
                      
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* Title & Cover */}
                      <td className="py-3 px-4">
                        <div 
                          onClick={() => onSelectMedia({ id: entry.mediaId, title: entry.title, coverImage: entry.coverImage, type: entry.type })}
                          className="flex items-center gap-3 cursor-pointer group/title"
                        >
                          <img
                            src={entry.coverImage?.medium || entry.coverImage?.large}
                            alt={title}
                            className="w-10 h-14 rounded-lg object-cover bg-slate-800 shadow"
                          />
                          <div>
                            <span className="font-bold text-sm text-slate-100 group-hover/title:text-sky-400 transition-colors line-clamp-1">
                              {title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                entry.status === 'CURRENT' ? 'bg-emerald-500/20 text-emerald-400' :
                                entry.status === 'COMPLETED' ? 'bg-sky-500/20 text-sky-400' :
                                entry.status === 'PLANNING' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {STATUS_LABELS[entry.status]}
                              </span>
                              {entry.notes && (
                                <span className="italic text-slate-500 truncate max-w-xs">"{entry.notes}"</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score Selector */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#0b1622] px-2 py-1 rounded-xl border border-[#1e293b]">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <select
                            value={entry.score || 0}
                            onChange={(e) => handleScoreChange(entry, e.target.value)}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                          >
                            <option value="0" className="bg-[#0b1622]">-</option>
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((s) => (
                              <option key={s} value={s} className="bg-[#0b1622]">{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Quick Inline Progress + Button */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">
                            {entry.progress || 0}
                          </span>
                          <span className="text-slate-400">/ {max || '?'} {unit}</span>

                          {/* Quick Increment button */}
                          <button
                            type="button"
                            onClick={() => handleIncrement(entry)}
                            title="Increment progress (+1)"
                            disabled={max && entry.progress >= max}
                            className={`p-1 rounded-lg transition-all ${
                              max && entry.progress >= max
                                ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sm hover:scale-105'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Type & Format */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] font-bold text-slate-400 bg-[#0b1622] px-2.5 py-1 rounded-lg border border-[#1e293b]">
                          {entry.format || entry.type}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onSelectMedia({ id: entry.mediaId, title: entry.title, coverImage: entry.coverImage, type: entry.type })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-[#0b1622] transition-colors"
                          title="Edit details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
