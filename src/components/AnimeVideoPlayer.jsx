import React, { useState, useEffect } from 'react';
import { 
  Play, Plus, Check, Star, Link as LinkIcon, ExternalLink, 
  Trash2, AlertCircle, Sparkles, Film, ChevronRight, Layers, Search, 
  SkipForward, ChevronLeft
} from 'lucide-react';
import { formatEmbedUrl, parseMultipleEpisodeLinks } from '../services/videoHelper';

export default function AnimeVideoPlayer({
  media,
  userEntry,
  onSaveLinks,
  onUpdateProgress,
  onUpdateScore
}) {
  const maxEpisodes = media.episodes || userEntry?.maxEpisodes || 12;
  const initialLinks = userEntry?.videoLinks || (userEntry?.customVideoUrl ? { 1: userEntry.customVideoUrl } : {});

  const [videoLinks, setVideoLinks] = useState(initialLinks);
  const [currentEpisode, setCurrentEpisode] = useState(Math.max(1, userEntry?.progress || 1));
  const [singleLinkInput, setSingleLinkInput] = useState(videoLinks[currentEpisode] || '');
  const [bulkInput, setBulkInput] = useState('');
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [editorTab, setEditorTab] = useState('single'); // 'single' | 'bulk'
  const [hoverScore, setHoverScore] = useState(0);
  const [searchEp, setSearchEp] = useState('');
  const [activeChunk, setActiveChunk] = useState('all'); // 'all' or '1-25', '26-50', etc.

  // Sync state if userEntry changes
  useEffect(() => {
    const updated = userEntry?.videoLinks || (userEntry?.customVideoUrl ? { 1: userEntry.customVideoUrl } : {});
    setVideoLinks(updated);
  }, [userEntry]);

  // Sync single link input when episode changes
  useEffect(() => {
    setSingleLinkInput(videoLinks[currentEpisode] || '');
  }, [currentEpisode, videoLinks]);

  // Current active video url
  const activeUrl = videoLinks[currentEpisode] || (currentEpisode === 1 ? userEntry?.customVideoUrl : '') || '';
  const parsedVideo = activeUrl ? formatEmbedUrl(activeUrl) : null;

  const totalLinkedEpisodes = Object.keys(videoLinks).filter(k => Boolean(videoLinks[k])).length;

  const handleSaveSingleLink = (e) => {
    e.preventDefault();
    const updated = {
      ...videoLinks,
      [currentEpisode]: singleLinkInput.trim()
    };
    if (!singleLinkInput.trim()) {
      delete updated[currentEpisode];
    }
    setVideoLinks(updated);
    onSaveLinks(updated, updated[1] || singleLinkInput.trim());
    setShowLinkEditor(false);
  };

  const handleSaveBulkLinks = (e) => {
    e.preventDefault();
    const parsed = parseMultipleEpisodeLinks(bulkInput, 1);
    const updated = {
      ...videoLinks,
      ...parsed
    };
    setVideoLinks(updated);
    onSaveLinks(updated, updated[1] || '');
    setBulkInput('');
    setShowLinkEditor(false);
  };

  const handleClearEpisodeLink = (ep) => {
    const updated = { ...videoLinks };
    delete updated[ep];
    setVideoLinks(updated);
    onSaveLinks(updated, updated[1] || '');
  };

  const currentScore = userEntry?.score || 0;

  // Generate episode numbers array (e.g. 1 to 170 for Black Clover)
  const totalEpCount = Math.max(maxEpisodes || 12, ...Object.keys(videoLinks).map(Number), 1);
  const episodeList = Array.from({ length: totalEpCount }, (_, i) => i + 1);

  // Generate chunks if episode count > 25 (e.g., 1-25, 26-50, etc.)
  const CHUNK_SIZE = 25;
  const chunkRanges = [];
  if (totalEpCount > CHUNK_SIZE) {
    for (let i = 1; i <= totalEpCount; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, totalEpCount);
      chunkRanges.push({ label: `${i}-${end}`, start: i, end });
    }
  }

  // Filter episodes based on chunk selection and search query
  let displayedEpisodes = episodeList;
  if (searchEp.trim()) {
    displayedEpisodes = episodeList.filter(ep => String(ep).includes(searchEp.trim()));
  } else if (activeChunk !== 'all') {
    const range = chunkRanges.find(r => r.label === activeChunk);
    if (range) {
      displayedEpisodes = episodeList.filter(ep => ep >= range.start && ep <= range.end);
    }
  }

  const handleNextEpisode = () => {
    if (currentEpisode < totalEpCount) {
      const next = currentEpisode + 1;
      setCurrentEpisode(next);
      onUpdateProgress(next);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      setCurrentEpisode(currentEpisode - 1);
    }
  };

  return (
    <div className="bg-[#151f2e] border-2 border-sky-500/40 rounded-3xl overflow-hidden shadow-2xl mb-6">
      
      {/* Top Header Bar */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-sky-950 via-[#0e1724] to-[#151f2e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-sky-500/30">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <span>Google Drive & Video Player</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-extrabold border border-sky-500/30">
                Episode {currentEpisode} of {totalEpCount}
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              {totalLinkedEpisodes > 0 
                ? `✅ ${totalLinkedEpisodes} of ${totalEpCount} episodes have video links saved to your account` 
                : `Paste Google Drive or direct MP4 link below to play video for any episode (1-${totalEpCount})`}
            </p>
          </div>
        </div>

        {/* Right Action: Rate Anime & Link Button */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick Rating in player */}
          <div className="flex items-center gap-1 bg-[#0b1622] px-3 py-1.5 rounded-xl border border-[#1e293b]">
            <span className="text-[10px] font-bold text-slate-400 mr-1 hidden sm:inline">Rate:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverScore(star)}
                  onMouseLeave={() => setHoverScore(0)}
                  onClick={() => onUpdateScore(star)}
                  className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                  title={`Rate ${star} / 10 ★`}
                >
                  <Star 
                    className={`w-3.5 h-3.5 ${
                      (hoverScore || currentScore) >= star 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-600'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-black text-amber-400 ml-1.5 min-w-[28px]">
              {currentScore > 0 ? `${currentScore}★` : '-'}
            </span>
          </div>

          {/* Add / Edit Video Link Button */}
          <button
            onClick={() => setShowLinkEditor(!showLinkEditor)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-md ${
              showLinkEditor 
                ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/20' 
                : 'bg-sky-500/20 text-sky-400 border-sky-500/40 hover:bg-sky-500 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{activeUrl ? `Change Ep ${currentEpisode} Link` : `+ Add Google Drive Link`}</span>
          </button>

        </div>
      </div>

      {/* Link Editor Bar / Form */}
      {showLinkEditor && (
        <div className="p-4 bg-[#0b1622] border-b border-[#1e293b] animate-in fade-in duration-150">
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditorTab('single')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'single' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Episode {currentEpisode} Link
              </button>
              <button
                onClick={() => setEditorTab('bulk')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'bulk' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulk All Episodes ({totalEpCount})
              </button>
            </div>

            <span className="text-[11px] text-emerald-400 font-semibold hidden sm:inline">
              ⚡ Google Drive links automatically convert to player preview!
            </span>
          </div>

          {editorTab === 'single' ? (
            <form onSubmit={handleSaveSingleLink} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder={`Paste Google Drive link for Episode ${currentEpisode} (e.g. https://drive.google.com/file/d/.../view)...`}
                  value={singleLinkInput}
                  onChange={(e) => setSingleLinkInput(e.target.value)}
                  required
                  className="flex-1 bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
                  >
                    Save & Play Episode {currentEpisode}
                  </button>
                  {videoLinks[currentEpisode] && (
                    <button
                      type="button"
                      onClick={() => handleClearEpisodeLink(currentEpisode)}
                      className="p-2.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs transition-colors"
                      title="Remove link for this episode"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                You can paste Google Drive share links, direct MP4 links, YouTube videos, or Mega links. Saved to your personal account.
              </p>
            </form>
          ) : (
            <form onSubmit={handleSaveBulkLinks} className="space-y-2">
              <textarea
                rows={4}
                placeholder={"Paste links for multiple episodes, one per line:\nEpisode 1: https://drive.google.com/file/d/...\nEpisode 2: https://drive.google.com/file/d/...\n(or simply paste 1 link per line, starting from Episode 1)"}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkEditor(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#1e293b] text-slate-400 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Parse & Save All Episodes
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* Video Screen Area */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {parsedVideo ? (
          parsedVideo.type === 'video' ? (
            <video
              src={parsedVideo.embedUrl}
              controls
              autoPlay={false}
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              src={parsedVideo.embedUrl}
              title={`Episode ${currentEpisode}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )
        ) : (
          /* Empty State when no video link is set */
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-3 shadow-lg">
              <Play className="w-8 h-8 fill-sky-400 ml-1" />
            </div>
            <h4 className="text-white font-black text-base mb-1">
              No Video Link Set for Episode {currentEpisode}
            </h4>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Add your <strong>Google Drive link</strong> for this episode. It will play directly in this screen and be saved to your personal account.
            </p>
            <button
              onClick={() => { setShowLinkEditor(true); setEditorTab('single'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Google Drive Link (Episode {currentEpisode})</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Episode Selector & Episode Count Bar */}
      <div className="p-4 bg-[#0e1724] border-t border-[#1e293b]">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>All Episodes ({totalEpCount} Total)</span>
            </span>
            {totalLinkedEpisodes > 0 && (
              <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {totalLinkedEpisodes} Playable
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Prev / Next Episode Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevEpisode}
                disabled={currentEpisode <= 1}
                className="p-1.5 rounded-lg bg-[#151f2e] text-slate-300 hover:text-white border border-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1"
                title="Previous Episode"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                onClick={handleNextEpisode}
                disabled={currentEpisode >= totalEpCount}
                className="p-1.5 rounded-lg bg-[#151f2e] text-slate-300 hover:text-white border border-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1"
                title="Next Episode"
              >
                <span className="hidden sm:inline">Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Episode Jump Input */}
            {totalEpCount > 20 && (
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={totalEpCount}
                  placeholder="Jump Ep #"
                  value={searchEp}
                  onChange={(e) => setSearchEp(e.target.value)}
                  className="w-24 bg-[#151f2e] border border-[#1e293b] rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {/* Quick "Mark as Watched" */}
            <button
              onClick={() => onUpdateProgress(currentEpisode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                (userEntry?.progress || 0) >= currentEpisode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-[#151f2e] text-slate-300 border border-[#1e293b] hover:border-emerald-500 hover:text-emerald-400'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{(userEntry?.progress || 0) >= currentEpisode ? `Watched (Ep ${currentEpisode})` : `Mark Ep ${currentEpisode} Watched`}</span>
            </button>
          </div>
        </div>

        {/* Range Chunks for large anime (e.g. Black Clover with 170 episodes) */}
        {chunkRanges.length > 0 && !searchEp.trim() && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Range:</span>
            <button
              onClick={() => setActiveChunk('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                activeChunk === 'all'
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-[#0b1622] text-slate-400 border-[#1e293b] hover:text-white'
              }`}
            >
              All ({totalEpCount})
            </button>
            {chunkRanges.map((chunk) => (
              <button
                key={chunk.label}
                onClick={() => setActiveChunk(chunk.label)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  activeChunk === chunk.label
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-[#0b1622] text-slate-400 border-[#1e293b] hover:text-white'
                }`}
              >
                {chunk.label}
              </button>
            ))}
          </div>
        )}

        {/* Horizontal Episode Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {displayedEpisodes.map((epNum) => {
            const hasLink = Boolean(videoLinks[epNum]);
            const isCurrent = epNum === currentEpisode;
            const isWatched = (userEntry?.progress || 0) >= epNum;

            return (
              <button
                key={epNum}
                onClick={() => setCurrentEpisode(epNum)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20 scale-105'
                    : hasLink
                    ? 'bg-[#151f2e] text-slate-100 border-sky-500/40 hover:border-sky-400'
                    : 'bg-[#0b1622] text-slate-400 border-[#1e293b] hover:text-slate-200'
                }`}
              >
                <span>Ep {epNum}</span>
                {hasLink && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-emerald-400 animate-pulse'}`} />
                )}
                {isWatched && (
                  <Check className={`w-3 h-3 ${isCurrent ? 'text-white' : 'text-emerald-400'}`} />
                )}
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
}
