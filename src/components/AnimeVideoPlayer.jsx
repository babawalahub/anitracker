import React, { useState, useEffect } from 'react';
import { 
  Play, Plus, Check, Star, Link as LinkIcon, ExternalLink, 
  Trash2, AlertCircle, Sparkles, Film, ChevronRight, Layers, Search, 
  SkipForward, ChevronLeft, Folder, List, Edit2, Info, Eye, CheckCircle2,
  Tv, Sliders
} from 'lucide-react';
import { cleanUrl, formatEmbedUrl, parseMultipleVideoEntries } from '../services/videoHelper';
import CustomVideoPlayer from './CustomVideoPlayer';

export default function AnimeVideoPlayer({
  media,
  userEntry,
  onSaveLinks,
  onUpdateProgress,
  onUpdateScore
}) {
  const maxEpisodes = media.episodes || userEntry?.maxEpisodes || 12;
  const initialLinks = userEntry?.videoLinks || (userEntry?.customVideoUrl ? { 1: userEntry.customVideoUrl } : {});
  const initialTitles = userEntry?.videoTitles || {};
  const initialFolder = userEntry?.googleDriveFolderUrl || '';

  const [videoLinks, setVideoLinks] = useState(initialLinks);
  const [videoTitles, setVideoTitles] = useState(initialTitles);
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState(initialFolder);

  const [currentEpisode, setCurrentEpisode] = useState(Math.max(1, userEntry?.progress || 1));
  const [playerViewMode, setPlayerViewMode] = useState(initialFolder && Object.keys(initialLinks).length === 0 ? 'folder' : 'video');
  const [playerEngine, setPlayerEngine] = useState('custom'); // 'custom' (Dual Audio & AI Subtitles) | 'iframe' (Drive Embed)
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'playable' | 'watched'

  // Modal / Editor State
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [editorTab, setEditorTab] = useState('single'); // 'single' | 'folder' | 'bulk'
  const [singleTitleInput, setSingleTitleInput] = useState('');
  const [singleLinkInput, setSingleLinkInput] = useState('');
  const [folderLinkInput, setFolderLinkInput] = useState(initialFolder);
  const [bulkInput, setBulkInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [hoverScore, setHoverScore] = useState(0);

  // Sync state if userEntry changes
  useEffect(() => {
    const updatedLinks = userEntry?.videoLinks || (userEntry?.customVideoUrl ? { 1: userEntry.customVideoUrl } : {});
    const updatedTitles = userEntry?.videoTitles || {};
    const updatedFolder = userEntry?.googleDriveFolderUrl || '';
    setVideoLinks(updatedLinks);
    setVideoTitles(updatedTitles);
    setGoogleDriveFolderUrl(updatedFolder);
  }, [userEntry]);

  // Sync editor inputs when currentEpisode changes
  useEffect(() => {
    setSingleLinkInput(videoLinks[currentEpisode] || '');
    setSingleTitleInput(videoTitles[currentEpisode] || `Episode ${currentEpisode}`);
  }, [currentEpisode, videoLinks, videoTitles]);

  // Determine current active video URL & parsed player object
  const activeUrl = videoLinks[currentEpisode] || (currentEpisode === 1 ? userEntry?.customVideoUrl : '') || '';
  const parsedVideo = activeUrl ? formatEmbedUrl(activeUrl) : null;
  const folderEmbed = googleDriveFolderUrl ? formatEmbedUrl(googleDriveFolderUrl) : null;

  const currentTitle = videoTitles[currentEpisode] || `Episode ${currentEpisode}`;
  const totalLinkedEpisodes = Object.keys(videoLinks).filter(k => Boolean(videoLinks[k])).length;
  const currentScore = userEntry?.score || 0;

  // Generate full episode numbers list
  const totalEpCount = Math.max(maxEpisodes || 12, ...Object.keys(videoLinks).map(Number), 1);
  const allEpisodeNumbers = Array.from({ length: totalEpCount }, (_, i) => i + 1);

  // Filter episodes list based on user selection & search
  const filteredEpisodes = allEpisodeNumbers.filter((ep) => {
    const title = (videoTitles[ep] || `Episode ${ep}`).toLowerCase();
    const hasLink = Boolean(videoLinks[ep]);
    const isWatched = (userEntry?.progress || 0) >= ep;
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = !q || String(ep).includes(q) || title.includes(q);
    if (!matchesQuery) return false;

    if (filterMode === 'playable') return hasLink;
    if (filterMode === 'watched') return isWatched;
    return true;
  });

  // Handler: Save Single Episode Link & Title
  const handleSaveSingle = (e) => {
    e.preventDefault();
    const cleaned = cleanUrl(singleLinkInput);

    // If user pasted a Google Drive folder URL here, save it as folder
    if (cleaned.includes('drive.google.com') && (cleaned.includes('/folders/') || cleaned.includes('folderview'))) {
      setGoogleDriveFolderUrl(cleaned);
      onSaveLinks(videoLinks, videoLinks[1] || '', videoTitles, cleaned);
      setPlayerViewMode('folder');
      setShowLinkEditor(false);
      return;
    }

    const updatedLinks = { ...videoLinks };
    const updatedTitles = { ...videoTitles };

    if (cleaned) {
      updatedLinks[currentEpisode] = cleaned;
      if (singleTitleInput.trim()) {
        updatedTitles[currentEpisode] = singleTitleInput.trim();
      }
    } else {
      delete updatedLinks[currentEpisode];
      delete updatedTitles[currentEpisode];
    }

    setVideoLinks(updatedLinks);
    setVideoTitles(updatedTitles);
    onSaveLinks(updatedLinks, updatedLinks[1] || cleaned, updatedTitles, googleDriveFolderUrl);
    setPlayerViewMode('video');
    setShowLinkEditor(false);
  };

  // Handler: Save Google Drive Folder Link
  const handleSaveFolder = (e) => {
    e.preventDefault();
    const cleaned = cleanUrl(folderLinkInput);
    if (!cleaned) return;
    setGoogleDriveFolderUrl(cleaned);
    onSaveLinks(videoLinks, videoLinks[1] || '', videoTitles, cleaned);
    setPlayerViewMode('folder');
    setShowLinkEditor(false);
  };

  // Handler: Save Bulk Episodes with Titles
  const handleSaveBulk = (e) => {
    e.preventDefault();
    const { links: parsedLinks, titles: parsedTitles, folderUrl: parsedFolder } = parseMultipleVideoEntries(bulkInput, 1);
    
    const updatedLinks = { ...videoLinks, ...parsedLinks };
    const updatedTitles = { ...videoTitles, ...parsedTitles };
    const finalFolder = parsedFolder || googleDriveFolderUrl;

    setVideoLinks(updatedLinks);
    setVideoTitles(updatedTitles);
    if (finalFolder) setGoogleDriveFolderUrl(finalFolder);

    onSaveLinks(updatedLinks, updatedLinks[1] || '', updatedTitles, finalFolder);
    setBulkInput('');
    setShowLinkEditor(false);
  };

  // Handler: Remove Episode Link
  const handleClearEpisode = (ep) => {
    const updatedLinks = { ...videoLinks };
    const updatedTitles = { ...videoTitles };
    delete updatedLinks[ep];
    delete updatedTitles[ep];
    setVideoLinks(updatedLinks);
    setVideoTitles(updatedTitles);
    onSaveLinks(updatedLinks, updatedLinks[1] || '', updatedTitles, googleDriveFolderUrl);
  };

  const handleNextEpisode = () => {
    if (currentEpisode < totalEpCount) {
      const next = currentEpisode + 1;
      setCurrentEpisode(next);
      setPlayerViewMode('video');
      onUpdateProgress(next);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      setCurrentEpisode(currentEpisode - 1);
      setPlayerViewMode('video');
    }
  };

  return (
    <div className="bg-[#151f2e] border-2 border-sky-500/40 rounded-3xl overflow-hidden shadow-2xl mb-6">
      
      {/* ── Top Header Navigation Bar ── */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-sky-950 via-[#0e1724] to-[#151f2e]">
        
        {/* Left: Player Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-sky-500/30">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <span>Google Drive Video Stream</span>
              {playerViewMode === 'video' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-extrabold border border-sky-500/30">
                  Ep {currentEpisode} / {totalEpCount}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-500/30 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5" /> Folder View
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-300">
              {totalLinkedEpisodes > 0 
                ? `✅ ${totalLinkedEpisodes} of ${totalEpCount} videos saved in your personal account` 
                : googleDriveFolderUrl
                ? '📁 Google Drive Folder linked to your account'
                : 'Paste Google Drive file or folder links to watch videos directly'}
            </p>
          </div>
        </div>

        {/* Right Actions: Mode Switch, Rate, Add Links */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Pro HTML5 Player (Dual Audio & AI Subs) vs Drive Embed Toggle */}
          <div className="flex items-center bg-[#0b1622] p-1 rounded-xl border border-[#1e293b]">
            <button
              type="button"
              onClick={() => { setPlayerEngine('custom'); setPlayerViewMode('video'); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                playerEngine === 'custom' && playerViewMode === 'video'
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Custom Pro Player with Dual Audio, Subtitles, and Translation"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pro Player (Dual Audio & Subs)</span>
            </button>
            <button
              type="button"
              onClick={() => { setPlayerEngine('iframe'); setPlayerViewMode('video'); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                playerEngine === 'iframe' && playerViewMode === 'video'
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Google Drive Embedded Player"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Drive Embed</span>
            </button>
          </div>

          {/* Switch to Folder View if folder is set */}
          {googleDriveFolderUrl && (
            <button
              onClick={() => setPlayerViewMode(playerViewMode === 'folder' ? 'video' : 'folder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                playerViewMode === 'folder'
                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                  : 'bg-[#0b1622] text-indigo-300 border-indigo-500/40 hover:bg-indigo-950'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>{playerViewMode === 'folder' ? 'Watch Episode Video' : 'Drive Folder'}</span>
            </button>
          )}

          {/* Quick Rating Stars */}
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

          {/* + Add / Edit Links Button */}
          <button
            onClick={() => setShowLinkEditor(!showLinkEditor)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-md ${
              showLinkEditor 
                ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/20' 
                : 'bg-sky-500/20 text-sky-400 border-sky-500/40 hover:bg-sky-500 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>+ Add Google Drive Link</span>
          </button>

        </div>
      </div>

      {/* ── Link Editor Drawer (Single, Folder, Bulk) ── */}
      {showLinkEditor && (
        <div className="p-4 bg-[#0b1622] border-b border-[#1e293b] animate-in fade-in duration-150">
          
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-[#151f2e] p-1 rounded-xl border border-[#1e293b]">
              <button
                type="button"
                onClick={() => setEditorTab('single')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'single' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Single Video (Ep {currentEpisode})
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('folder')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'folder' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                📁 Google Drive Folder
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('bulk')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'bulk' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulk All Videos ({totalEpCount})
              </button>
            </div>

            <span className="text-[11px] text-emerald-400 font-semibold hidden md:inline">
              ⚡ Google Drive links automatically convert to embedded video player!
            </span>
          </div>

          {/* TAB 1: Single Video with Title */}
          {editorTab === 'single' && (
            <form onSubmit={handleSaveSingle} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Video Title / Name
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. Episode ${currentEpisode} - The Magic Knights`}
                    value={singleTitleInput}
                    onChange={(e) => setSingleTitleInput(e.target.value)}
                    className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Google Drive or Video URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/file/d/1ABCXYZ.../view?usp=sharing"
                    value={singleLinkInput}
                    onChange={(e) => setSingleLinkInput(e.target.value)}
                    required
                    className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-400">
                  Tip: In Google Drive, click Share ➔ <strong>"Anyone with the link can view"</strong> so it plays smoothly.
                </p>
                <div className="flex items-center gap-2">
                  {videoLinks[currentEpisode] && (
                    <button
                      type="button"
                      onClick={() => handleClearEpisode(currentEpisode)}
                      className="px-3 py-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Link
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLinkEditor(false)}
                    className="px-4 py-2 bg-[#1e293b] text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    Save & Play Episode {currentEpisode}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Google Drive Folder */}
          {editorTab === 'folder' && (
            <form onSubmit={handleSaveFolder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Google Drive Folder URL (Containing All Series Videos)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/1ABCXYZ... or https://drive.google.com/drive/u/0/folders/..."
                  value={folderLinkInput}
                  onChange={(e) => setFolderLinkInput(e.target.value)}
                  required
                  className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                📁 Linking your Google Drive folder embeds Google Drive's full folder view directly inside this app, showing all video files, filenames, and clickable players!
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLinkEditor(false)}
                  className="px-4 py-2 bg-[#1e293b] text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Folder className="w-4 h-4" /> Save & Open Folder
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Bulk All Videos with Titles */}
          {editorTab === 'bulk' && (
            <form onSubmit={handleSaveBulk} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Paste Multiple Videos with Titles (One per line)
                </label>
                <textarea
                  rows={5}
                  placeholder={
                    "Format examples (any of these work):\n" +
                    "Episode 1 - The Magic Knights: https://drive.google.com/file/d/1...\n" +
                    "Episode 2 - The Grimoire: https://drive.google.com/file/d/2...\n" +
                    "or:\n" +
                    "Black Clover 01.mp4 | https://drive.google.com/file/d/1...\n" +
                    "or simply paste links in order:\n" +
                    "https://drive.google.com/file/d/1...\n" +
                    "https://drive.google.com/file/d/2..."
                  }
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400">
                  Episode numbers, titles, and Google Drive links will all be automatically recognized!
                </span>
                <div className="flex items-center gap-2">
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
                    Parse & Save All Videos
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      )}

      {/* ── Main Video Screen Area ── */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        
        {playerViewMode === 'folder' && folderEmbed ? (
          /* Google Drive Folder Embed View */
          <div className="relative w-full h-full bg-slate-900">
            <iframe
              src={folderEmbed.embedUrl}
              title="Google Drive Folder View"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <a
                href={folderEmbed.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur border border-white/20 flex items-center gap-1.5 shadow-lg"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : parsedVideo ? (
          /* Single Episode Video Screen */
          playerEngine === 'custom' ? (
            <CustomVideoPlayer
              src={
                parsedVideo.type === 'video'
                  ? parsedVideo.embedUrl
                  : (parsedVideo.fileId ? `https://drive.google.com/uc?export=download&id=${parsedVideo.fileId}` : parsedVideo.originalUrl)
              }
              poster={media?.bannerImage || media?.coverImage?.extraLarge || media?.coverImage?.large}
              title={currentTitle}
              animeTitle={media?.title?.english || media?.title?.romaji || 'Anime'}
              episodeNum={currentEpisode}
              onEnded={handleNextEpisode}
            />
          ) : (
            <div className="relative w-full h-full">
              <iframe
                src={parsedVideo.embedUrl}
                title={`Episode ${currentEpisode} - ${currentTitle}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
              <div className="absolute top-3 right-3 z-10 flex gap-2">
                <a
                  href={parsedVideo.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur border border-white/20 flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
                  title="If Google Drive video does not play inside the page, click to open directly in Google Drive"
                >
                  <span>Open in Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )
        ) : (
          /* Empty State when no video link is set for current episode */
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-3 shadow-lg">
              <Play className="w-8 h-8 fill-sky-400 ml-1" />
            </div>
            <h4 className="text-white font-black text-base mb-1">
              No Video Link Set for Episode {currentEpisode}
            </h4>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Add your <strong>Google Drive file link</strong> or connect your <strong>Google Drive Folder</strong> to play all anime videos with titles.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => { setShowLinkEditor(true); setEditorTab('single'); }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>Add Video Link (Ep {currentEpisode})</span>
              </button>
              <button
                onClick={() => { setShowLinkEditor(true); setEditorTab('folder'); }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#151f2e] hover:bg-[#1e293b] text-slate-200 font-extrabold text-xs border border-[#1e293b] transition-all hover:scale-105"
              >
                <Folder className="w-4 h-4 text-indigo-400" />
                <span>Connect Drive Folder</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Now Playing & Episode Navigation Bar ── */}
      <div className="p-4 bg-[#0e1724] border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        
        {/* Now Playing Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-black tracking-wider text-sky-400 block">
              Now Playing
            </span>
            <h4 className="text-sm font-black text-white truncate">
              {currentTitle}
            </h4>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Previous Episode */}
          <button
            onClick={handlePrevEpisode}
            disabled={currentEpisode <= 1}
            className="px-3 py-1.5 rounded-xl bg-[#151f2e] text-slate-300 hover:text-white border border-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1"
            title="Previous Episode"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Next Episode */}
          <button
            onClick={handleNextEpisode}
            disabled={currentEpisode >= totalEpCount}
            className="px-3 py-1.5 rounded-xl bg-[#151f2e] text-slate-300 hover:text-white border border-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1"
            title="Next Episode"
          >
            <span className="hidden sm:inline">Next</span>
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Mark as Watched */}
          <button
            onClick={() => onUpdateProgress(currentEpisode)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
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

      {/* ── VIDEO & EPISODE PLAYLIST WITH TITLES ── */}
      <div className="p-5 bg-[#0b1622] border-t border-[#1e293b]">
        
        {/* Playlist Controls & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-black text-white uppercase tracking-wider">
              Videos & Episodes List
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#151f2e] text-slate-300 border border-[#1e293b] font-bold">
              {totalEpCount} Episodes
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input for Video Titles */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search video title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-52 bg-[#151f2e] border border-[#1e293b] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-[#151f2e] p-1 rounded-xl border border-[#1e293b] text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMode === 'all' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('playable')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMode === 'playable' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Playable ({totalLinkedEpisodes})
              </button>
              <button
                onClick={() => setFilterMode('watched')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMode === 'watched' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Watched
              </button>
            </div>

          </div>
        </div>

        {/* Video List Items (Click to Play Video) */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
          {filteredEpisodes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No episodes matched your search.
            </div>
          ) : (
            filteredEpisodes.map((epNum) => {
              const hasLink = Boolean(videoLinks[epNum]);
              const title = videoTitles[epNum] || `Episode ${epNum}`;
              const isPlaying = epNum === currentEpisode && playerViewMode === 'video';
              const isWatched = (userEntry?.progress || 0) >= epNum;

              return (
                <div
                  key={epNum}
                  onClick={() => {
                    setCurrentEpisode(epNum);
                    setPlayerViewMode('video');
                  }}
                  className={`group flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-sky-500/15 border-sky-400 shadow-md shadow-sky-500/10'
                      : hasLink
                      ? 'bg-[#111c2e] border-[#1e293b] hover:border-sky-500/50 hover:bg-[#15233a]'
                      : 'bg-[#0e1724] border-[#1e293b]/60 hover:border-[#1e293b] opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isPlaying
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-105'
                        : hasLink
                        ? 'bg-[#151f2e] text-sky-400 group-hover:bg-sky-500 group-hover:text-white'
                        : 'bg-[#080f18] text-slate-500'
                    }`}>
                      <Play className={`w-4 h-4 ${isPlaying ? 'fill-white' : ''} ml-0.5`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${isPlaying ? 'text-sky-300' : 'text-white'}`}>
                          Episode {epNum}
                        </span>
                        {hasLink && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Google Drive
                          </span>
                        )}
                        {isPlaying && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500 text-white animate-pulse">
                            ▶ Playing Now
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 truncate font-medium mt-0.5">
                        {title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {isWatched && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" /> Watched
                      </span>
                    )}

                    {/* Quick Edit Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentEpisode(epNum);
                        setSingleLinkInput(videoLinks[epNum] || '');
                        setSingleTitleInput(videoTitles[epNum] || `Episode ${epNum}`);
                        setShowLinkEditor(true);
                        setEditorTab('single');
                      }}
                      className="p-2 rounded-xl bg-[#0b1622] hover:bg-[#1e293b] text-slate-400 hover:text-white border border-[#1e293b] transition-colors"
                      title="Edit Title or Link"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
