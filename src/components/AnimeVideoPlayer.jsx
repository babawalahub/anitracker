import React, { useState, useEffect } from 'react';
import { 
  Play, Plus, Check, Star, Link as LinkIcon, ExternalLink, 
  Trash2, AlertCircle, Sparkles, Film, ChevronRight, Layers, Search, 
  SkipForward, ChevronLeft, Folder, List, Edit2, Info, Eye, CheckCircle2,
  Tv, Sliders, RefreshCw
} from 'lucide-react';
import { 
  cleanUrl, 
  formatEmbedUrl, 
  parseMultipleVideoEntries,
  formatEpisodeTitle,
  getEpisodeVideoStream
} from '../services/videoHelper';
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
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'playable' | 'watched'

  // Modal / Editor State
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [editorTab, setEditorTab] = useState('drive'); // 'drive' | 'single' | 'bulk'
  
  // Drive Tab State
  const [driveMainLink, setDriveMainLink] = useState(initialFolder || '');
  const [driveEpCount, setDriveEpCount] = useState(maxEpisodes || 12);
  const [driveFileListText, setDriveFileListText] = useState('');

  // Single Tab State
  const [singleTitleInput, setSingleTitleInput] = useState('');
  const [singleLinkInput, setSingleLinkInput] = useState('');

  // Bulk Tab State
  const [bulkInput, setBulkInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [hoverScore, setHoverScore] = useState(0);

  const seriesName = media?.title?.english || media?.title?.romaji || media?.title?.native || 'Reincarnated as a Sword';

  // Sync state if userEntry changes
  useEffect(() => {
    const updatedLinks = userEntry?.videoLinks || (userEntry?.customVideoUrl ? { 1: userEntry.customVideoUrl } : {});
    const updatedTitles = userEntry?.videoTitles || {};
    const updatedFolder = userEntry?.googleDriveFolderUrl || '';
    setVideoLinks(updatedLinks);
    setVideoTitles(updatedTitles);
    setGoogleDriveFolderUrl(updatedFolder);
    if (updatedFolder && !driveMainLink) setDriveMainLink(updatedFolder);
  }, [userEntry]);

  // Sync editor inputs when currentEpisode changes
  useEffect(() => {
    setSingleLinkInput(videoLinks[currentEpisode] || '');
    setSingleTitleInput(videoTitles[currentEpisode] || formatEpisodeTitle(seriesName, currentEpisode));
  }, [currentEpisode, videoLinks, videoTitles, seriesName]);

  // Determine current active video URL & title
  const activeUrl = videoLinks[currentEpisode] || (currentEpisode === 1 ? userEntry?.customVideoUrl : '') || googleDriveFolderUrl || '';
  const currentTitle = videoTitles[currentEpisode] || formatEpisodeTitle(seriesName, currentEpisode);
  const totalLinkedEpisodes = Object.keys(videoLinks).filter(k => Boolean(videoLinks[k])).length;
  const currentScore = userEntry?.score || 0;

  // Generate full episode numbers list
  const totalEpCount = Math.max(maxEpisodes || 12, ...Object.keys(videoLinks).map(Number), ...Object.keys(videoTitles).map(Number), 1);
  const allEpisodeNumbers = Array.from({ length: totalEpCount }, (_, i) => i + 1);

  // Filter episodes list based on user selection & search
  const filteredEpisodes = allEpisodeNumbers.filter((ep) => {
    const title = (videoTitles[ep] || formatEpisodeTitle(seriesName, ep)).toLowerCase();
    const hasLink = Boolean(videoLinks[ep]) || Boolean(googleDriveFolderUrl);
    const isWatched = (userEntry?.progress || 0) >= ep;
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = !q || String(ep).includes(q) || title.includes(q);
    if (!matchesQuery) return false;

    if (filterMode === 'playable') return hasLink;
    if (filterMode === 'watched') return isWatched;
    return true;
  });

  // Handler 1: Generate All Episodes from Google Drive Link & File List
  const handleGenerateFromDrive = (e) => {
    e.preventDefault();
    const cleanedLink = cleanUrl(driveMainLink);
    const targetCount = parseInt(driveEpCount, 10) || totalEpCount || 12;

    const newLinks = { ...videoLinks };
    const newTitles = { ...videoTitles };

    // Check if filenames or links were pasted in the textarea
    if (driveFileListText.trim()) {
      const parsed = parseMultipleVideoEntries(driveFileListText, 1);
      
      // Copy extracted titles and links
      Object.entries(parsed.titles).forEach(([ep, t]) => {
        const epNum = parseInt(ep, 10);
        if (epNum) newTitles[epNum] = formatEpisodeTitle(seriesName, epNum, t);
      });
      Object.entries(parsed.links).forEach(([ep, l]) => {
        const epNum = parseInt(ep, 10);
        if (epNum && l && !l.includes('/folders/')) newLinks[epNum] = l;
      });

      // Fill in any remaining episodes up to targetCount
      for (let i = 1; i <= targetCount; i++) {
        if (!newTitles[i]) {
          newTitles[i] = formatEpisodeTitle(seriesName, i);
        }
      }
    } else {
      // Auto-generate based on series count with formatted padded name: S01E01 to S01E12
      for (let i = 1; i <= targetCount; i++) {
        newTitles[i] = formatEpisodeTitle(seriesName, i);
      }
    }

    setVideoLinks(newLinks);
    setVideoTitles(newTitles);
    if (cleanedLink) setGoogleDriveFolderUrl(cleanedLink);

    onSaveLinks(newLinks, newLinks[1] || '', newTitles, cleanedLink || googleDriveFolderUrl);
    setCurrentEpisode(1);
    setShowLinkEditor(false);
  };

  // Handler 2: Save Single Episode Link & Title
  const handleSaveSingle = (e) => {
    e.preventDefault();
    const cleaned = cleanUrl(singleLinkInput);

    const updatedLinks = { ...videoLinks };
    const updatedTitles = { ...videoTitles };

    if (cleaned) {
      updatedLinks[currentEpisode] = cleaned;
      if (singleTitleInput.trim()) {
        updatedTitles[currentEpisode] = formatEpisodeTitle(seriesName, currentEpisode, singleTitleInput.trim());
      }
    } else {
      delete updatedLinks[currentEpisode];
      delete updatedTitles[currentEpisode];
    }

    setVideoLinks(updatedLinks);
    setVideoTitles(updatedTitles);
    onSaveLinks(updatedLinks, updatedLinks[1] || cleaned, updatedTitles, googleDriveFolderUrl);
    setShowLinkEditor(false);
  };

  // Handler 3: Save Bulk Episodes with Titles
  const handleSaveBulk = (e) => {
    e.preventDefault();
    const { links: parsedLinks, titles: parsedTitles, folderUrl: parsedFolder } = parseMultipleVideoEntries(bulkInput, 1);
    
    const updatedLinks = { ...videoLinks };
    const updatedTitles = { ...videoTitles };

    Object.entries(parsedTitles).forEach(([ep, t]) => {
      const epNum = parseInt(ep, 10);
      if (epNum) updatedTitles[epNum] = formatEpisodeTitle(seriesName, epNum, t);
    });
    Object.entries(parsedLinks).forEach(([ep, l]) => {
      const epNum = parseInt(ep, 10);
      if (epNum && l && !l.includes('/folders/')) updatedLinks[epNum] = l;
    });

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
      
      {/* ── Top Header Navigation Bar ── */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-sky-950 via-[#0e1724] to-[#151f2e]">
        
        {/* Left: Player Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-sky-500/30">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <span>Integrated Video Player</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-extrabold border border-sky-500/30">
                Playing Ep {currentEpisode} of {totalEpCount}
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              {googleDriveFolderUrl 
                ? `📁 Drive connected (${totalEpCount} Episodes) • Playing in Pro Player with Subtitles & Dual Audio` 
                : 'Click Play to watch with Subtitles & Dual Audio, or add your Google Drive link'}
            </p>
          </div>
        </div>

        {/* Right Actions: Rate, Add Links */}
        <div className="flex flex-wrap items-center gap-2">
          
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
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Add Drive Link & Episodes</span>
          </button>

        </div>
      </div>

      {/* ── Link Editor Drawer (Drive Generator, Single, Bulk) ── */}
      {showLinkEditor && (
        <div className="p-4 bg-[#0b1622] border-b border-[#1e293b] animate-in fade-in duration-150">
          
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-[#151f2e] p-1 rounded-xl border border-[#1e293b]">
              <button
                type="button"
                onClick={() => setEditorTab('drive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  editorTab === 'drive' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate All Episodes</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'single' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Single Video (Ep {currentEpisode})
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('bulk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  editorTab === 'bulk' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulk All Videos
              </button>
            </div>

            <button
              onClick={() => setShowLinkEditor(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              ✕ Close
            </button>
          </div>

          {/* TAB 1: Auto-Generate All Episodes from Google Drive Link */}
          {editorTab === 'drive' && (
            <form onSubmit={handleGenerateFromDrive} className="space-y-3">
              <div className="bg-[#111c2e] p-3 rounded-2xl border border-sky-500/30 text-xs space-y-1.5 text-slate-300">
                <p className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>All episodes automatically play in your integrated player with subtitles!</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Paste your Google Drive link or folder below. All {totalEpCount} episodes will be created with titles (e.g. {seriesName} - S01E01 to S01E{totalEpCount < 10 ? '0' + totalEpCount : totalEpCount}).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Google Drive Link (Folder or File Link)
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/1ABCXYZ... or https://drive.google.com/file/d/..."
                    value={driveMainLink}
                    onChange={(e) => setDriveMainLink(e.target.value)}
                    required
                    className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Total Episodes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={driveEpCount}
                    onChange={(e) => setDriveEpCount(e.target.value)}
                    className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    Paste File Names or Episode Links (Optional, e.g. from your Drive)
                  </label>
                  <span className="text-[10px] text-slate-500">One per line</span>
                </div>
                <textarea
                  rows={4}
                  placeholder={
                    "Example:\n" +
                    `${seriesName} - S01E01.mkv\n` +
                    `${seriesName} - S01E02.mkv\n` +
                    `${seriesName} - S01E03.mkv\n` +
                    "(If left blank, it will auto-create Episode 1 through " + driveEpCount + ")"
                  }
                  value={driveFileListText}
                  onChange={(e) => setDriveFileListText(e.target.value)}
                  className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Generates all episodes in the playlist and immediately launches Episode 1 in the Integrated Player with Subtitles.</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkEditor(false)}
                    className="px-4 py-2 bg-[#1e293b] text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate All Episodes & Play Now</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Single Video with Title */}
          {editorTab === 'single' && (
            <form onSubmit={handleSaveSingle} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Video Title / Name
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${seriesName} - S01E${currentEpisode < 10 ? '0' + currentEpisode : currentEpisode}`}
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

              <div className="bg-[#111c2e] p-3 rounded-2xl border border-[#1e293b] text-xs space-y-1.5 text-slate-300">
                <p className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>How to play videos with Subtitles & Dual Audio:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  • <strong>Google Drive Folder:</strong> Paste your folder link in the Auto-Generate tab to link all episodes.<br />
                  • <strong>Direct Episode Video:</strong> Paste your episode file link (e.g. <code className="text-sky-300">https://drive.google.com/file/d/.../view</code>) in the box above so each episode plays in the integrated HD player with real-time subtitles and translation!
                </p>
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
                    "Format examples:\n" +
                    `${seriesName} - S01E01.mkv\n` +
                    `${seriesName} - S01E02.mkv\n` +
                    "or:\n" +
                    "Episode 1 - The Magic Knights: https://drive.google.com/file/d/1...\n" +
                    "Episode 2 - The Grimoire: https://drive.google.com/file/d/2..."
                  }
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400">
                  Episode numbers, titles, and links are automatically parsed!
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

      {/* ── Main Video Screen: Always The Integrated Pro Video Player ── */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <CustomVideoPlayer
          src={activeUrl}
          poster={media?.bannerImage || media?.coverImage?.extraLarge || media?.coverImage?.large}
          title={currentTitle}
          animeTitle={seriesName}
          episodeNum={currentEpisode}
          totalEpisodes={totalEpCount}
          media={media}
          episodesList={allEpisodeNumbers.map(ep => ({
            num: ep,
            title: videoTitles[ep] || formatEpisodeTitle(seriesName, ep),
            hasLink: Boolean(videoLinks[ep])
          }))}
          onSelectEpisode={(ep) => setCurrentEpisode(ep)}
          onEnded={handleNextEpisode}
        />
      </div>

      {/* Quick Episode Switcher Horizontal Bar */}
      <div className="p-3 bg-[#0a121e] border-t border-[#1e293b] flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex-shrink-0">
          Episodes ({totalEpCount}):
        </span>
        {allEpisodeNumbers.map((ep) => {
          const epTitle = videoTitles[ep] || formatEpisodeTitle(seriesName, ep);
          const shortTitle = epTitle.includes('-') ? epTitle.split('-').slice(1).join('-').trim() : `Ep ${ep}`;

          return (
            <button
              key={ep}
              onClick={() => setCurrentEpisode(ep)}
              className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                ep === currentEpisode
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30 scale-105'
                  : 'bg-[#151f2e] text-slate-300 border-[#1e293b] hover:border-sky-500/50 hover:text-white'
              }`}
              title={epTitle}
            >
              <span>Ep {ep}</span>
              <span className="text-[10px] opacity-80 max-w-[140px] truncate hidden sm:inline">
                {shortTitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Google Drive Status Bar */}
      {googleDriveFolderUrl && (
        <div className="mx-4 my-2.5 bg-sky-950/40 border border-sky-500/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-sky-200">
            <Folder className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>
              Google Drive Connected: <strong>{seriesName}</strong> ({totalEpCount} Episodes Ready).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              ⚡ Playing in Pro Player with Subtitles & Audio
            </span>
            <a
              href={googleDriveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold flex items-center gap-1 shadow"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── Now Playing & Navigation Bar ── */}
      <div className="p-4 bg-[#0e1724] border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        
        {/* Now Playing Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-black tracking-wider text-sky-400 block">
              Now Playing (Episode {currentEpisode} of {totalEpCount})
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

      {/* ── VIDEO & EPISODE PLAYLIST WITH TITLES (CLICK TO PLAY) ── */}
      <div className="p-5 bg-[#0b1622] border-t border-[#1e293b]">
        
        {/* Playlist Controls & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-black text-white uppercase tracking-wider">
              All Episodes ({totalEpCount} Episodes)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              {totalEpCount} Playable in Pro Player
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input for Video Titles */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search episode title..."
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
                Playable
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

        {/* Video List Items (Click any episode to immediately play in Integrated Player) */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
          {filteredEpisodes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No episodes matched your search.
            </div>
          ) : (
            filteredEpisodes.map((epNum) => {
              const hasLink = Boolean(videoLinks[epNum]) || Boolean(googleDriveFolderUrl);
              const title = videoTitles[epNum] || formatEpisodeTitle(seriesName, epNum);
              const isPlaying = epNum === currentEpisode;
              const isWatched = (userEntry?.progress || 0) >= epNum;

              return (
                <div
                  key={epNum}
                  onClick={() => setCurrentEpisode(epNum)}
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
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Playable
                        </span>
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
                        setSingleTitleInput(videoTitles[epNum] || formatEpisodeTitle(seriesName, epNum));
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
