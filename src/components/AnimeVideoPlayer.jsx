import React, { useState, useEffect } from 'react';
import { 
  Play, Plus, Check, Star, Link, ExternalLink, 
  Trash2, AlertCircle, Sparkles, Film, ChevronRight, Layers 
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
  const activeUrl = videoLinks[currentEpisode] || '';
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

  // Generate episode numbers array
  const totalEpCount = Math.max(maxEpisodes || 12, ...Object.keys(videoLinks).map(Number), 1);
  const episodeList = Array.from({ length: totalEpCount }, (_, i) => i + 1);

  return (
    <div className="bg-[#151f2e] border border-[#1e293b] rounded-3xl overflow-hidden shadow-xl mb-6">
      
      {/* Top Header Bar */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 bg-[#0e1724]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Play className="w-4 h-4 fill-sky-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>Personal Player & Stream</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                Episode {currentEpisode}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {totalLinkedEpisodes > 0 
                ? `${totalLinkedEpisodes} episode link${totalLinkedEpisodes > 1 ? 's' : ''} saved in your account` 
                : 'Supports Google Drive, direct MP4, YouTube, & stream links'}
            </p>
          </div>
        </div>

        {/* Right Action: Rate Anime & Link Button */}
        <div className="flex items-center gap-3">
          
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
                  title={`Rate ${star} / 10`}
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              showLinkEditor 
                ? 'bg-sky-500 text-white border-sky-400' 
                : 'bg-[#0b1622] text-slate-300 border-[#1e293b] hover:border-sky-500 hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>{activeUrl ? 'Edit Link' : '+ Add Video Link'}</span>
          </button>

        </div>
      </div>

      {/* Link Editor Dropdown / Form */}
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
                Bulk Multi-Episode Links
              </button>
            </div>

            <span className="text-[10px] text-slate-400">
              Paste Google Drive, Mega, MP4, or embed links
            </span>
          </div>

          {editorTab === 'single' ? (
            <form onSubmit={handleSaveSingleLink} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder={`Paste Google Drive / Video link for Episode ${currentEpisode}...`}
                value={singleLinkInput}
                onChange={(e) => setSingleLinkInput(e.target.value)}
                className="flex-1 bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
                >
                  Save Episode {currentEpisode} Link
                </button>
                {videoLinks[currentEpisode] && (
                  <button
                    type="button"
                    onClick={() => handleClearEpisodeLink(currentEpisode)}
                    className="p-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs transition-colors"
                    title="Remove link for this episode"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveBulkLinks} className="space-y-2">
              <textarea
                rows={3}
                placeholder={"Paste multiple episode links, one per line:\nEpisode 1: https://drive.google.com/file/d/...\nEpisode 2: https://drive.google.com/file/d/...\n(or simply paste 1 URL per line)"}
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
            <div className="w-14 h-14 rounded-2xl bg-[#151f2e] border border-[#1e293b] flex items-center justify-center text-slate-500 mx-auto mb-3 shadow-inner">
              <Film className="w-7 h-7 text-sky-400 opacity-60" />
            </div>
            <h4 className="text-white font-bold text-sm mb-1">
              No play link added for Episode {currentEpisode}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              You can attach your Google Drive video link, direct MP4 file, or any web stream link. It will be saved permanently to your personal account.
            </p>
            <button
              onClick={() => { setShowLinkEditor(true); setEditorTab('single'); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach Google Drive / Video Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Episode Quick Switcher Bar */}
      <div className="p-4 bg-[#0e1724] border-t border-[#1e293b]">
        
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Episodes ({episodeList.length})
            </span>
            {totalLinkedEpisodes > 0 && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {totalLinkedEpisodes} available to play
              </span>
            )}
          </div>

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

        {/* Episode Pills List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {episodeList.map((epNum) => {
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
                    ? 'bg-[#151f2e] text-slate-200 border-sky-500/40 hover:border-sky-400'
                    : 'bg-[#0b1622] text-slate-500 border-[#1e293b] hover:text-slate-300'
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
