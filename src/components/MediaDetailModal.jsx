import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Star, Calendar, Clock, Tv, Film, BookOpen, Layers, 
  Play, Plus, Minus, Check, Trash2, Heart, Award, ExternalLink 
} from 'lucide-react';
import { TRACKING_STATUS, STATUS_LABELS, getEntry, upsertEntry, deleteEntry } from '../services/storage';
import { getMediaDetail } from '../services/anilistApi';
import AnimeVideoPlayer from './AnimeVideoPlayer';
import MediaComments from './MediaComments';

export default function MediaDetailModal({ mediaSummary, onClose, onUpdated, user, profile }) {
  const [media, setMedia] = useState(mediaSummary);
  const [loading, setLoading] = useState(true);
  const [userEntry, setUserEntry] = useState(getEntry(mediaSummary.id) || null);

  // Tracking Form State
  const [status, setStatus] = useState(userEntry?.status || TRACKING_STATUS.CURRENT);
  const [progress, setProgress] = useState(userEntry?.progress || 0);
  const [score, setScore] = useState(userEntry?.score || 0);
  const [notes, setNotes] = useState(userEntry?.notes || '');
  const [showTrailer, setShowTrailer] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sync state if userEntry updates
  useEffect(() => {
    const current = getEntry(mediaSummary.id);
    setUserEntry(current);
    if (current) {
      if (current.status) setStatus(current.status);
      if (current.progress !== undefined) setProgress(current.progress);
      if (current.score !== undefined) setScore(current.score);
      if (current.notes !== undefined) setNotes(current.notes);
    }
  }, [mediaSummary.id]);

  // Fetch full rich details (characters, relations, voice actors, trailer)
  useEffect(() => {
    let isMounted = true;
    async function loadFullDetails() {
      try {
        setLoading(true);
        const full = await getMediaDetail(mediaSummary.id);
        if (isMounted && full) {
          setMedia(full);
        }
      } catch (err) {
        console.warn("Could not load full detail, using summary data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFullDetails();
    return () => { isMounted = false; };
  }, [mediaSummary.id]);

  const maxUnits = media.type === 'ANIME' ? media.episodes : media.chapters;
  const unitLabel = media.type === 'ANIME' ? 'Episode' : 'Chapter';

  const handleSave = () => {
    const updated = upsertEntry(media, {
      status,
      progress: parseInt(progress, 10) || 0,
      score: parseFloat(score) || 0,
      notes,
      videoLinks: userEntry?.videoLinks,
      customVideoUrl: userEntry?.customVideoUrl
    });
    setUserEntry(updated);
    if (onUpdated) onUpdated();
  };

  const handleSaveVideoLinks = (linksMap, mainUrl) => {
    const updated = upsertEntry(media, {
      status,
      progress: parseInt(progress, 10) || 0,
      score: parseFloat(score) || 0,
      notes,
      videoLinks: linksMap,
      customVideoUrl: mainUrl
    });
    setUserEntry(updated);
    if (onUpdated) onUpdated();
  };

  const handleUpdateScore = (newScore) => {
    setScore(newScore);
    const updated = upsertEntry(media, {
      status,
      progress: parseInt(progress, 10) || 0,
      score: parseFloat(newScore) || 0,
      notes,
      videoLinks: userEntry?.videoLinks,
      customVideoUrl: userEntry?.customVideoUrl
    });
    setUserEntry(updated);
    if (onUpdated) onUpdated();
  };

  const handleUpdateProgress = (newEp) => {
    const epNum = parseInt(newEp, 10) || 0;
    setProgress(epNum);
    const isCompleted = Boolean(maxUnits && epNum >= maxUnits);
    const newStatus = isCompleted ? TRACKING_STATUS.COMPLETED : TRACKING_STATUS.CURRENT;
    setStatus(newStatus);

    const updated = upsertEntry(media, {
      status: newStatus,
      progress: epNum,
      score: parseFloat(score) || 0,
      notes,
      videoLinks: userEntry?.videoLinks,
      customVideoUrl: userEntry?.customVideoUrl
    });
    setUserEntry(updated);
    if (onUpdated) onUpdated();
  };

  const handleDelete = () => {
    if (confirm("Remove this title from your list?")) {
      deleteEntry(media.id);
      setUserEntry(null);
      if (onUpdated) onUpdated();
    }
  };

  const handleIncrement = () => {
    const next = Math.min((parseInt(progress, 10) || 0) + 1, maxUnits || 9999);
    setProgress(next);
  };

  const handleDecrement = () => {
    const next = Math.max((parseInt(progress, 10) || 0) - 1, 0);
    setProgress(next);
  };

  const titleEnglish = media.title?.english;
  const titleRomaji = media.title?.romaji;
  const titleNative = media.title?.native;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      
      <div 
        className="relative w-full max-w-4xl bg-[#0b1622] border border-[#1e293b] rounded-3xl overflow-hidden shadow-2xl my-8 text-slate-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top-Left Back Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs font-bold backdrop-blur transition-all shadow-lg hover:scale-105 border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Top-Right Close (X) Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur transition-all shadow-lg hover:scale-105 border border-white/10"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── 1. UPPER SECTION: ANIME NAME & BADGES ─── */}
        <div className="pt-14 px-6 sm:px-8 pb-5 bg-gradient-to-b from-[#111c2e] to-[#0e1724] border-b border-[#1e293b]">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {media.format || media.type}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#151f2e] text-slate-300 border border-[#1e293b]">
              {media.status}
            </span>
            {media.averageScore && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Star className="w-3.5 h-3.5 fill-emerald-400" />
                {media.averageScore}% Score
              </span>
            )}
            {media.seasonYear && (
              <span className="text-xs text-slate-400 font-semibold px-2 py-0.5">
                {media.season ? `${media.season} ` : ''}{media.seasonYear}
              </span>
            )}
          </div>

          {/* Anime Title in Upper */}
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            {titleEnglish || titleRomaji}
          </h1>
          {titleEnglish && titleRomaji && titleEnglish !== titleRomaji && (
            <p className="text-sm sm:text-base text-slate-400 font-medium mt-1">{titleRomaji}</p>
          )}
          {titleNative && (
            <p className="text-xs text-slate-500 font-normal mt-0.5">{titleNative}</p>
          )}

          {/* Genres */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {media.genres?.map((g) => (
              <span key={g} className="text-xs bg-[#151f2e] border border-[#1e293b] text-slate-300 px-2.5 py-1 rounded-lg">
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* ─── 2. ON THE NAME BOTTOM: ANIME IMAGES SHOWCASE ─── */}
        <div className="relative w-full bg-slate-950 overflow-hidden border-b border-[#1e293b] mb-6">
          <div className="relative h-56 sm:h-72 w-full overflow-hidden">
            {media.bannerImage ? (
              <img
                src={media.bannerImage}
                alt={`${titleRomaji} Banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1622] via-[#0b1622]/40 to-transparent" />

            {/* Poster / Cover Image at the bottom of the name */}
            <div className="absolute bottom-4 left-6 sm:left-8 flex items-end gap-4 z-10">
              <div className="w-28 sm:w-40 aspect-[3/4.2] flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-[#0b1622] bg-[#151f2e]">
                <img
                  src={media.coverImage?.extraLarge || media.coverImage?.large}
                  alt={titleRomaji}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="pb-2 hidden sm:block">
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                  Official Anime Cover Image
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Inner Content Area */}
        <div className="px-6 sm:px-8 space-y-6">

          {/* 1. PERSONAL VIDEO PLAYER & GOOGLE DRIVE STREAM (for Anime) */}
          {media.type === 'ANIME' && (
            <AnimeVideoPlayer
              media={media}
              userEntry={userEntry}
              onSaveLinks={handleSaveVideoLinks}
              onUpdateProgress={handleUpdateProgress}
              onUpdateScore={handleUpdateScore}
            />
          )}

          {/* 2. TRACKING EDITOR CARD */}
          <div className="bg-[#151f2e] border border-[#1e293b] rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e293b]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-400" />
                <span>Save to Personal Account</span>
              </h3>
              {userEntry && (
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> In Your List
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Status Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setStatus(newStatus);
                    if (newStatus === TRACKING_STATUS.COMPLETED && maxUnits) {
                      setProgress(maxUnits);
                    }
                  }}
                  className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                >
                  {Object.entries(TRACKING_STATUS).map(([key, val]) => (
                    <option key={key} value={val}>{STATUS_LABELS[val]}</option>
                  ))}
                </select>
              </div>

              {/* Episode / Chapter Stepper */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {unitLabel} Progress {maxUnits ? `(of ${maxUnits})` : ''}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-9 h-9 rounded-xl bg-[#0b1622] border border-[#1e293b] hover:border-sky-500 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={maxUnits || 9999}
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="flex-1 bg-[#0b1622] border border-[#1e293b] rounded-xl px-3 py-2 text-center text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-9 h-9 rounded-xl bg-[#0b1622] border border-[#1e293b] hover:border-sky-500 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Score (1-10 Slider) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Score Rating</span>
                  <span className="text-amber-400 font-extrabold">{score > 0 ? `${score} / 10 ★` : 'Not Rated'}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Personal Notes
              </label>
              <textarea
                rows="2"
                placeholder="Write your personal review, favorite quotes, or watch date..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e293b]">
              {userEntry ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove from List</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all hover:scale-102"
              >
                <Check className="w-4 h-4" />
                <span>Save to Account</span>
              </button>
            </div>

          </div>

          {/* 3. SYNOPSIS */}
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">
              Synopsis
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#151f2e] p-4 rounded-2xl border border-[#1e293b]">
              {media.description ? media.description.replace(/<[^>]*>?/gm, '') : 'No synopsis available.'}
            </p>
          </div>

          {/* 4. KEY INFO GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#151f2e] p-4 rounded-2xl border border-[#1e293b] text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Studio / Publisher</span>
              <span className="text-white font-bold text-sm">
                {media.studios?.nodes?.[0]?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Season / Release</span>
              <span className="text-white font-bold text-sm">
                {media.season ? `${media.season} ` : ''}{media.seasonYear || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">{unitLabel}s</span>
              <span className="text-white font-bold text-sm">
                {maxUnits || 'Ongoing'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Community Score</span>
              <span className="text-emerald-400 font-bold text-sm">
                {media.averageScore ? `${media.averageScore}%` : 'N/A'}
              </span>
            </div>
          </div>

          {/* 5. OFFICIAL TRAILER (if available) */}
          {media.trailer?.site === 'youtube' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-rose-500" />
                  <span>Official Trailer</span>
                </h3>
              </div>
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#1e293b]">
                <iframe
                  src={`https://www.youtube.com/embed/${media.trailer.id}`}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* 6. CHARACTERS & VOICE ACTORS */}
          {media.characters?.edges && media.characters.edges.length > 0 && (
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3">
                Characters & Voice Actors
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {media.characters.edges.map((edge, i) => {
                  const char = edge.node;
                  const va = edge.voiceActors?.[0];
                  return (
                    <div key={i} className="flex items-center justify-between bg-[#151f2e] border border-[#1e293b] p-2.5 rounded-xl">
                      {/* Character */}
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={char.image?.medium}
                          alt={char.name?.full}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{char.name?.full}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{edge.role}</p>
                        </div>
                      </div>

                      {/* Voice Actor */}
                      {va && (
                        <div className="flex items-center gap-2.5 text-right overflow-hidden">
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-300 truncate">{va.name?.full}</p>
                            <p className="text-[10px] text-slate-400">Japanese</p>
                          </div>
                          <img
                            src={va.image?.medium}
                            alt={va.name?.full}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. COMMENTS & COMMUNITY DISCUSSION SECTION */}
          <MediaComments
            media={media}
            user={user}
            profile={profile}
          />

          {/* Bottom Back Button */}
          <div className="pt-2 pb-6 border-t border-[#1e293b] flex justify-center">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#151f2e] hover:bg-[#1e293b] text-slate-300 hover:text-white font-bold text-xs border border-[#1e293b] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Browse</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
