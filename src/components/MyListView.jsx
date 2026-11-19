import React, { useState } from 'react';
import { 
  Plus, Minus, Check, Star, Search, Trash2, Edit3, 
  Film, BookOpen, Layers, ArrowLeft, ExternalLink, 
  LayoutGrid, Table as TableIcon, Trophy, CheckCircle2, Play 
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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (visual cards with images) | 'table'

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

  const getMediaPayload = (entry) => ({
    id: entry.mediaId,
    mediaId: entry.mediaId,
    type: entry.type,
    title: entry.title,
    coverImage: entry.coverImage,
    format: entry.format,
    episodes: entry.maxEpisodes,
    chapters: entry.maxChapters,
    maxEpisodes: entry.maxEpisodes,
    maxChapters: entry.maxChapters,
    duration: entry.duration,
    genres: entry.genres,
    status: entry.status,
    videoLinks: entry.videoLinks,
    customVideoUrl: entry.customVideoUrl
  });

  const handleIncrement = (entry) => {
    const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
    const currentProg = parseInt(entry.progress, 10) || 0;
    const nextProgress = currentProg + 1;
    
    let newStatus = entry.status;
    if (entry.status === TRACKING_STATUS.PLANNING || entry.status === TRACKING_STATUS.PAUSED) {
      newStatus = TRACKING_STATUS.CURRENT;
    }
    if (max && nextProgress >= max) {
      newStatus = TRACKING_STATUS.COMPLETED;
    }

    upsertEntry(getMediaPayload(entry), {
      status: newStatus,
      progress: max ? Math.min(nextProgress, max) : nextProgress,
      score: entry.score,
      notes: entry.notes,
      videoLinks: entry.videoLinks,
      customVideoUrl: entry.customVideoUrl
    });

    if (onUpdated) onUpdated();
  };

  const handleDecrement = (entry) => {
    const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
    const currentProg = parseInt(entry.progress, 10) || 0;
    const nextProgress = Math.max(0, currentProg - 1);
    
    let newStatus = entry.status;
    if (entry.status === TRACKING_STATUS.COMPLETED && (!max || nextProgress < max)) {
      newStatus = TRACKING_STATUS.CURRENT;
    }

    upsertEntry(getMediaPayload(entry), {
      status: newStatus,
      progress: nextProgress,
      score: entry.score,
      notes: entry.notes,
      videoLinks: entry.videoLinks,
      customVideoUrl: entry.customVideoUrl
    });

    if (onUpdated) onUpdated();
  };

  const handleProgressInput = (entry, val) => {
    const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
    const parsed = parseInt(val, 10);
    const prog = isNaN(parsed) ? 0 : Math.max(0, max ? Math.min(parsed, max) : parsed);
    
    let newStatus = entry.status;
    if (max && prog >= max) {
      newStatus = TRACKING_STATUS.COMPLETED;
    } else if (entry.status === TRACKING_STATUS.COMPLETED && max && prog < max) {
      newStatus = TRACKING_STATUS.CURRENT;
    }

    upsertEntry(getMediaPayload(entry), {
      status: newStatus,
      progress: prog,
      score: entry.score,
      notes: entry.notes,
      videoLinks: entry.videoLinks,
      customVideoUrl: entry.customVideoUrl
    });

    if (onUpdated) onUpdated();
  };

  // When marking as Completed, auto-fill all episodes to maximum!
  const handleStatusChange = (entry, newStatus) => {
    const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
    let newProgress = entry.progress;
    
    if (newStatus === TRACKING_STATUS.COMPLETED && max) {
      newProgress = max; // Auto-fill full episodes!
    }

    upsertEntry(getMediaPayload(entry), {
      status: newStatus,
      progress: newProgress,
      score: entry.score,
      notes: entry.notes,
      videoLinks: entry.videoLinks,
      customVideoUrl: entry.customVideoUrl
    });

    if (onUpdated) onUpdated();
  };

  const handleScoreChange = (entry, newScore) => {
    upsertEntry(getMediaPayload(entry), {
      status: entry.status,
      progress: entry.progress,
      score: parseFloat(newScore) || 0,
      notes: entry.notes,
      videoLinks: entry.videoLinks,
      customVideoUrl: entry.customVideoUrl
    });

    if (onUpdated) onUpdated();
  };

  const handleDelete = (entry) => {
    const title = entry.title?.english || entry.title?.romaji || 'this item';
    if (window.confirm(`Remove "${title}" from your list?`)) {
      deleteEntry(entry.mediaId);
      if (onUpdated) onUpdated();
    }
  };

  // Compute Completed Stats
  const completedEntries = allEntries.filter(e => e.status === TRACKING_STATUS.COMPLETED);
  const completedAnime = completedEntries.filter(e => e.type === 'ANIME');
  const completedManga = completedEntries.filter(e => e.type === 'MANGA');

  const totalEpisodesWatched = completedAnime.reduce((sum, e) => sum + (parseInt(e.progress, 10) || e.maxEpisodes || 0), 0);
  const totalChaptersRead = completedManga.reduce((sum, e) => sum + (parseInt(e.progress, 10) || e.maxChapters || 0), 0);

  const statusCounts = {
    ALL: allEntries.length,
    CURRENT: allEntries.filter(e => e.status === TRACKING_STATUS.CURRENT).length,
    COMPLETED: completedEntries.length,
    PLANNING: allEntries.filter(e => e.status === TRACKING_STATUS.PLANNING).length,
    PAUSED: allEntries.filter(e => e.status === TRACKING_STATUS.PAUSED).length,
    DROPPED: allEntries.filter(e => e.status === TRACKING_STATUS.DROPPED).length,
  };

  return (
    <div className="space-y-6">
      
      {/* 1. COMPLETED SHOWCASE HERO BANNER (shown when Completed tab is clicked) */}
      {activeStatusTab === 'COMPLETED' && (
        <div className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-r from-emerald-950 via-[#151f2e] to-sky-950 border border-emerald-500/30 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Completed Showcase
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                All Completed Anime & Manga
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                You have completely watched <strong className="text-emerald-400">{completedAnime.length} Anime</strong> ({totalEpisodesWatched} episodes full) & read <strong className="text-pink-400">{completedManga.length} Manga</strong> ({totalChaptersRead} chapters).
              </p>
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex items-center gap-2 bg-[#0b1622] p-1.5 rounded-2xl border border-[#1e293b]">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'ALL' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({completedEntries.length})
              </button>
              <button
                onClick={() => setFilterType('ANIME')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'ANIME' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Anime ({completedAnime.length})</span>
              </button>
              <button
                onClick={() => setFilterType('MANGA')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'MANGA' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manga ({completedManga.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HEADER CONTROLS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
        
        {/* Left: Back button + Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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
                  ? st === 'COMPLETED' 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                    : 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-[#0b1622] text-slate-400 hover:text-white border border-[#1e293b]'
              }`}
            >
              {st === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{st === 'ALL' ? 'All' : STATUS_LABELS[st]}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeStatusTab === st ? 'bg-black/30 text-white' : 'bg-[#1e293b] text-slate-400'
              }`}>
                {statusCounts[st] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Media Type selector, View Toggle (Grid vs Table), and Search */}
        <div className="flex items-center gap-2">
          
          {/* Anime / Manga Selector */}
          <div className="bg-[#0b1622] p-1 rounded-xl border border-[#1e293b] flex items-center">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'ALL' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('ANIME')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'ANIME' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Anime</span>
            </button>
            <button
              onClick={() => setFilterType('MANGA')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'MANGA' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Manga</span>
            </button>
          </div>

          {/* Grid vs Table View Toggle */}
          <div className="bg-[#0b1622] p-1 rounded-xl border border-[#1e293b] flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Show Cover Images & Cards Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Show Table List View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0b1622] border border-[#1e293b] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-32 sm:w-44"
            />
          </div>

        </div>

      </div>

      {/* 3. CONTENT AREA */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#151f2e] border border-[#1e293b] rounded-3xl">
          <Layers className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white">No items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {allEntries.length === 0
              ? "You haven't tracked any anime or manga yet. Click 'Browse' to add titles to your list!"
              : activeStatusTab === 'COMPLETED'
              ? "You have not completed any anime or manga yet. Finish watching or reading titles to see them showcase here!"
              : "No titles match your selected status and filters."}
          </p>
          {onBackToBrowse && (
            <button
              onClick={onBackToBrowse}
              className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Browse Catalog</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        
        /* ─── VISUAL CARDS GRID (SHOWCASING ANIME NAME & IMAGE) ─── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in duration-200">
          {filtered.map((entry) => {
            const title = entry.title?.english || entry.title?.romaji || 'Unknown Title';
            const cover = entry.coverImage?.large || entry.coverImage?.medium || 'https://via.placeholder.com/300x450?text=No+Cover';
            const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
            const unit = entry.type === 'ANIME' ? 'eps' : 'chs';
            const isCompleted = entry.status === TRACKING_STATUS.COMPLETED;
            const progressNum = parseInt(entry.progress, 10) || 0;
            const pct = max ? Math.min(100, Math.round((progressNum / max) * 100)) : 100;

            return (
              <div
                key={entry.mediaId}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#151f2e] border border-[#1e293b] hover:border-sky-500/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              >
                
                {/* Poster Cover Image */}
                <div
                  onClick={() => onSelectMedia(getMediaPayload(entry))}
                  className="relative aspect-[3/4.2] w-full overflow-hidden cursor-pointer bg-slate-900"
                >
                  <img
                    src={cover}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151f2e] via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Top Badges: Format & Score */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur text-white tracking-wider">
                      {entry.format || entry.type}
                    </span>

                    {entry.score > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {entry.score}★
                      </span>
                    )}
                  </div>

                  {/* Bottom Status / Completion Pill */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center justify-between shadow-lg ${
                      isCompleted ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'
                    }`}>
                      <span className="flex items-center gap-1 truncate">
                        {isCompleted && <Check className="w-3 h-3" />}
                        {isCompleted 
                          ? `COMPLETED (${progressNum}/${max || '?'} ${unit})` 
                          : `${STATUS_LABELS[entry.status]} (${progressNum}/${max || '?'})`}
                      </span>
                      {max && <span>{pct}%</span>}
                    </div>
                  </div>
                </div>

                {/* Info & Title */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => onSelectMedia(getMediaPayload(entry))}
                      title={title}
                      className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
                    >
                      {title}
                    </h3>
                    {entry.title?.english && entry.title?.romaji && entry.title.english !== entry.title.romaji && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{entry.title.romaji}</p>
                    )}
                  </div>

                  {/* Progress Bar (Full for Completed) */}
                  <div>
                    <div className="h-1.5 w-full rounded-full bg-[#0b1622] overflow-hidden mb-2">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                        }`}
                      />
                    </div>

                    {/* Stepper & Action Controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#1e293b]/60">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDecrement(entry)}
                          disabled={progressNum <= 0}
                          className="p-1 rounded-md bg-[#0b1622] hover:bg-[#1e293b] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          title="Decrement (-1)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] font-black text-white px-1">
                          {progressNum}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(entry)}
                          disabled={Boolean(max && progressNum >= max)}
                          className="p-1 rounded-md bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-30 disabled:bg-slate-800 transition-colors"
                          title="Increment (+1)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onSelectMedia(getMediaPayload(entry))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-[#0b1622] transition-colors"
                        title="Open Details & Video Player"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (

        /* ─── CLASSIC TABLE LIST VIEW ─── */
        <div className="bg-[#151f2e] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1622] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Title & Poster Image</th>
                  <th className="py-3 px-4 w-36 text-center">Status</th>
                  <th className="py-3 px-4 w-44 text-center">All Episodes</th>
                  <th className="py-3 px-4 w-28 text-center">Score</th>
                  <th className="py-3 px-4 w-24 text-center">Format</th>
                  <th className="py-3 px-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] text-xs">
                {filtered.map((entry, index) => {
                  const title = entry.title?.english || entry.title?.romaji || 'Unknown';
                  const max = entry.type === 'ANIME' ? entry.maxEpisodes : entry.maxChapters;
                  const unit = entry.type === 'ANIME' ? 'ep' : 'ch';
                  const isMaxReached = Boolean(max && entry.progress >= max);
                  const isCompleted = entry.status === TRACKING_STATUS.COMPLETED;

                  return (
                    <tr 
                      key={entry.mediaId}
                      className="hover:bg-[#1a2638] transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* Title & Cover Image */}
                      <td className="py-3 px-4">
                        <div 
                          onClick={() => onSelectMedia(getMediaPayload(entry))}
                          className="flex items-center gap-3 cursor-pointer group/title"
                        >
                          <img
                            src={entry.coverImage?.medium || entry.coverImage?.large}
                            alt={title}
                            className="w-12 h-16 rounded-xl object-cover bg-slate-800 shadow flex-shrink-0 group-hover/title:scale-105 transition-transform"
                          />
                          <div className="overflow-hidden">
                            <span className="font-bold text-sm text-slate-100 group-hover/title:text-sky-400 transition-colors line-clamp-1">
                              {title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                                {entry.type}
                              </span>
                              {isCompleted && (
                                <span className="text-emerald-400 font-extrabold flex items-center gap-0.5 text-[10px]">
                                  <Check className="w-3 h-3" /> Full Watched
                                </span>
                              )}
                              {entry.notes && (
                                <span className="italic text-slate-500 truncate max-w-xs">"{entry.notes}"</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4 text-center">
                        <select
                          value={entry.status}
                          onChange={(e) => handleStatusChange(entry, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-xl border border-[#1e293b] cursor-pointer focus:outline-none transition-colors ${
                            entry.status === 'CURRENT' ? 'bg-sky-500/20 text-sky-300' :
                            entry.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 font-extrabold' :
                            entry.status === 'PLANNING' ? 'bg-amber-500/20 text-amber-300' :
                            entry.status === 'PAUSED' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {Object.entries(TRACKING_STATUS).map(([key, val]) => (
                            <option key={key} value={val} className="bg-[#0b1622] text-white">
                              {STATUS_LABELS[val]}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Interactive Progress: [-] [ Input ] [+] */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-[#0b1622] p-1 rounded-xl border border-[#1e293b]">
                          <button
                            type="button"
                            onClick={() => handleDecrement(entry)}
                            title="Decrement (-1)"
                            disabled={entry.progress <= 0}
                            className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            max={max || 9999}
                            value={entry.progress || 0}
                            onChange={(e) => handleProgressInput(entry, e.target.value)}
                            className="w-12 text-center bg-transparent font-black text-sm text-white focus:outline-none focus:bg-[#151f2e] rounded"
                          />

                          <span className="text-slate-400 text-xs pr-1">/ {max || '?'}</span>

                          <button
                            type="button"
                            onClick={() => handleIncrement(entry)}
                            title="Increment progress (+1)"
                            disabled={isMaxReached}
                            className={`p-1 rounded-lg transition-all ${
                              isMaxReached
                                ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sm hover:scale-105'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Score Selector */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#0b1622] px-2 py-1 rounded-xl border border-[#1e293b]">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
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

                      {/* Format Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 bg-[#0b1622] px-2 py-0.5 rounded-lg border border-[#1e293b]">
                          {entry.format || entry.type}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectMedia(getMediaPayload(entry))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-[#0b1622] transition-colors"
                            title="Open Details & Player"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-[#0b1622] transition-colors"
                            title="Delete from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
