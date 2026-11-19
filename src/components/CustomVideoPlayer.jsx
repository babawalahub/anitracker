import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Settings, Globe, Languages, Sliders, RefreshCw, Upload, 
  Download, Check, Sparkles, AlertCircle, Headphones, 
  ExternalLink, MessageSquare, FastForward, Rewind, Eye, EyeOff,
  ChevronDown, Folder, Tv, Link as LinkIcon
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  parseSrtOrVtt,
  autoFetchInternetSubtitles,
  translateCues
} from '../services/subtitleService';
import {
  formatEpisodeTitle,
  formatEmbedUrl,
  cleanUrl
} from '../services/videoHelper';

export default function CustomVideoPlayer({
  src,
  poster,
  title,
  animeTitle,
  episodeNum = 1,
  totalEpisodes = 12,
  episodesList = [],
  media = null,
  googleDriveFolderUrl = '',
  onSelectEpisode,
  onSaveEpisodeLink,
  onEnded,
  onTimeUpdate
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const splitterRef = useRef(null);
  const mergerRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Quick In-Player Link Input State
  const [quickLinkInput, setQuickLinkInput] = useState('');
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [viewingFolderEmbed, setViewingFolderEmbed] = useState(false);

  // Playback State (for direct HTML5 video)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showEpDropdown, setShowEpDropdown] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // Dual Audio State
  const [audioTrackMode, setAudioTrackMode] = useState('stereo'); // 'stereo' | 'left' (Japanese) | 'right' (English Dub)
  const [audioBoost, setAudioBoost] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Subtitle State
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [currentCues, setCurrentCues] = useState([]);
  const [originalCues, setOriginalCues] = useState([]);
  const [activeCueText, setActiveCueText] = useState('');
  const [selectedLang, setSelectedLang] = useState('original');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [subDelay, setSubDelay] = useState(0); // In seconds
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subFontSize, setSubFontSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const [subColor, setSubColor] = useState('yellow'); // 'yellow' | 'white' | 'cyan'

  // Parse what kind of video link the user provided
  const embedInfo = formatEmbedUrl(src);

  // Display title formatted with series name & episode number
  const formattedEpTitle = title || formatEpisodeTitle(animeTitle, episodeNum);

  // Quick save link handler (when user pastes link right inside player)
  const handleQuickSaveLink = (e) => {
    e.preventDefault();
    const cleaned = cleanUrl(quickLinkInput);
    if (cleaned && onSaveEpisodeLink) {
      onSaveEpisodeLink(episodeNum, cleaned);
      setQuickLinkInput('');
      setShowQuickInput(false);
    }
  };

  // Initialize Web Audio API for direct video Dual Audio separation & Dialogue Boost
  const setupWebAudio = () => {
    if (!videoRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(videoRef.current);
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const gainNode = ctx.createGain();

      source.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(merger, 1, 1);
      merger.connect(gainNode);
      gainNode.connect(ctx.destination);

      audioContextRef.current = ctx;
      splitterRef.current = splitter;
      mergerRef.current = merger;
      gainNodeRef.current = gainNode;
    } catch (err) {
      console.warn("Web Audio API setup:", err);
    }
  };

  // Switch Dual Audio Channels (Stereo vs Left [Japanese] vs Right [English Dub])
  const setAudioChannel = (mode) => {
    setAudioTrackMode(mode);
    if (!audioContextRef.current || !splitterRef.current || !mergerRef.current) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const splitter = splitterRef.current;
      const merger = mergerRef.current;
      splitter.disconnect();

      if (mode === 'left') {
        splitter.connect(merger, 0, 0);
        splitter.connect(merger, 0, 1);
      } else if (mode === 'right') {
        splitter.connect(merger, 1, 0);
        splitter.connect(merger, 1, 1);
      } else {
        splitter.connect(merger, 0, 0);
        splitter.connect(merger, 1, 1);
      }
    } catch (err) {
      console.warn("Could not route audio channels:", err);
    }
  };

  // Toggle Dialogue Boost
  const toggleAudioBoost = () => {
    const next = !audioBoost;
    setAudioBoost(next);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = next ? 1.8 : 1.0;
    }
  };

  // Auto-fetch Internet Subtitles on Mount or Episode Change
  useEffect(() => {
    let isMounted = true;
    async function loadSubs() {
      try {
        const cues = await autoFetchInternetSubtitles(animeTitle || title, episodeNum || 1);
        if (isMounted && cues && cues.length > 0) {
          setOriginalCues(cues);
          setCurrentCues(cues);
        }
      } catch (err) {
        console.warn("Could not auto-fetch subtitles:", err);
      }
    }
    loadSubs();
    return () => { isMounted = false; };
  }, [animeTitle, title, episodeNum]);

  // Translate Subtitles in real time when selectedLang changes
  const handleLanguageChange = async (targetLang) => {
    setSelectedLang(targetLang);
    if (targetLang === 'original') {
      setCurrentCues(originalCues);
      return;
    }

    try {
      setIsTranslating(true);
      setTranslationProgress(10);
      const translated = await translateCues(originalCues, targetLang, (p) => {
        setTranslationProgress(p);
      });
      setCurrentCues(translated);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-Find Subtitle from Internet button handler
  const handleAutoFindSubtitles = async () => {
    try {
      setIsTranslating(true);
      const cues = await autoFetchInternetSubtitles(animeTitle || title, episodeNum || 1);
      setOriginalCues(cues);
      if (selectedLang !== 'original') {
        const trans = await translateCues(cues, selectedLang);
        setCurrentCues(trans);
      } else {
        setCurrentCues(cues);
      }
      setSubtitlesEnabled(true);
    } finally {
      setIsTranslating(false);
    }
  };

  // Upload Custom .SRT / .VTT file
  const handleUploadSubtitleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const parsed = parseSrtOrVtt(text);
        if (parsed.length > 0) {
          setOriginalCues(parsed);
          setCurrentCues(parsed);
          setSelectedLang('original');
          setSubtitlesEnabled(true);
          setShowSubMenu(false);
        } else {
          alert("Could not parse subtitle format. Please upload a valid .srt or .vtt file.");
        }
      }
    };
    reader.readAsText(file);
  };

  // Video Time Update (for HTML5 video)
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);

    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    if (!subtitlesEnabled || currentCues.length === 0) {
      setActiveCueText('');
      return;
    }

    const effectiveTime = time - subDelay;
    const activeCue = currentCues.find(c => effectiveTime >= c.start && effectiveTime <= c.end);
    setActiveCueText(activeCue ? activeCue.text : '');
  };

  // Play / Pause Toggle for HTML5 video
  const togglePlay = () => {
    if (!videoRef.current) return;
    setupWebAudio();
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn("Play error:", err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Seek Handler for HTML5 video
  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume Handler for HTML5 video
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  // Keyboard Shortcuts (Space, Arrow keys, F, M, C)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space' && embedInfo?.type === 'video') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && videoRef.current) {
        e.preventDefault();
        videoRef.current.currentTime += 5;
      } else if (e.code === 'ArrowLeft' && videoRef.current) {
        e.preventDefault();
        videoRef.current.currentTime -= 5;
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        setSubtitlesEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, embedInfo]);

  // Hide Controls on Inactivity
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3000);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const fontClasses = {
    small: 'text-xs sm:text-sm py-1 px-2.5',
    medium: 'text-sm sm:text-lg py-1.5 px-4',
    large: 'text-base sm:text-2xl py-2 px-5'
  }[subFontSize];

  const colorClasses = {
    yellow: 'text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
    white: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
    cyan: 'text-sky-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
  }[subColor];

  const isDirectVideo = embedInfo?.type === 'video';
  const isGoogleDriveFile = embedInfo?.type === 'drive_file';
  const driveFolderId = embedInfo?.folderId || 
    (googleDriveFolderUrl ? (googleDriveFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] || googleDriveFolderUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]) : null);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setControlsVisible(false); }}
      className="relative aspect-video w-full bg-black overflow-hidden select-none group flex items-center justify-center"
    >

      {/* ── CASE 1: USER IS VIEWING GOOGLE DRIVE FOLDER FILES ── */}
      {viewingFolderEmbed && driveFolderId ? (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={`https://drive.google.com/embeddedfolderview?id=${driveFolderId}#list`}
            title={formattedEpTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0 pt-11 pb-16"
          />

          {/* Bottom Quick-Input Bar while browsing Drive folder */}
          <div className="absolute bottom-2 left-2 right-2 z-30 bg-[#0b1622]/95 border border-sky-500/50 backdrop-blur rounded-2xl p-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span className="truncate">Right-click video for <strong>Episode {episodeNum}</strong> in Drive ➔ Copy link ➔ Paste here:</span>
            </span>
            <form onSubmit={handleQuickSaveLink} className="flex items-center gap-1.5 flex-1 max-w-md">
              <input
                type="text"
                placeholder="https://drive.google.com/file/d/.../view"
                value={quickLinkInput}
                onChange={(e) => setQuickLinkInput(e.target.value)}
                required
                className="flex-1 bg-[#151f2e] border border-[#1e293b] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl shadow transition-all flex items-center gap-1 flex-shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Ep {episodeNum}</span>
              </button>
            </form>
          </div>
        </div>
      ) : isGoogleDriveFile ? (
        /* ── CASE 2: GOOGLE DRIVE SINGLE FILE LINK (Direct File Plays in Drive Player Online) ── */
        <div className="relative w-full h-full bg-black">
          <iframe
            src={embedInfo.embedUrl}
            title={formattedEpTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : embedInfo && (embedInfo.type === 'youtube' || embedInfo.type === 'iframe') ? (
        /* ── CASE 3: YOUTUBE OR EXTERNAL IFRAME STREAM ── */
        <div className="relative w-full h-full bg-black">
          <iframe
            src={embedInfo.embedUrl}
            title={formattedEpTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : embedInfo && isDirectVideo ? (
        /* ── CASE 4: DIRECT HTML5 VIDEO (.mp4, .webm, etc.) ── */
        <>
          <video
            ref={videoRef}
            src={embedInfo.embedUrl}
            poster={poster}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={onEnded}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-2xl backdrop-blur transition-all hover:scale-110 hover:bg-sky-400 group-hover:flex"
            >
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
            </button>
          )}
        </>
      ) : (
        /* ── CASE 5: READY TO PLAY EPISODE (Interactive Episode Deck) ── */
        <div className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden">
          {/* Blurred Backdrop of the Anime */}
          {poster && (
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-20 scale-110"
              style={{ backgroundImage: `url(${poster})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-[#0b1622]/90" />

          {/* Interactive Card */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-lg bg-[#0b1622]/95 border border-[#1e293b] rounded-3xl shadow-2xl backdrop-blur-md">
            
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3 border border-sky-500/30 shadow-lg shadow-sky-500/20">
              <Play className="w-7 h-7 fill-sky-400 ml-1 text-sky-400" />
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-black border border-sky-500/30 uppercase tracking-wide">
                Episode {episodeNum} of {totalEpisodes}
              </span>
              {googleDriveFolderUrl && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Folder className="w-3 h-3 text-emerald-400" />
                  <span>Drive Folder Connected</span>
                </span>
              )}
            </div>

            <h4 className="text-white font-black text-base sm:text-lg mb-1 truncate max-w-full">
              {formattedEpTitle}
            </h4>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Paste your Google Drive link or video URL below to stream Episode {episodeNum} online:
            </p>

            <form onSubmit={handleQuickSaveLink} className="w-full flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder="https://drive.google.com/file/d/1ABCXYZ.../view"
                value={quickLinkInput}
                onChange={(e) => setQuickLinkInput(e.target.value)}
                required
                className="flex-1 bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono shadow-inner"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Video Online</span>
              </button>
            </form>

            {/* Quick Actions if Google Drive Folder is connected */}
            {googleDriveFolderUrl && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-[#1e293b] w-full text-xs">
                <a
                  href={googleDriveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#151f2e] hover:bg-[#1e293b] text-sky-400 hover:text-white rounded-xl font-bold flex items-center gap-1.5 border border-[#1e293b] transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Folder in Drive to Copy Link</span>
                </a>
                {driveFolderId && (
                  <button
                    type="button"
                    onClick={() => setViewingFolderEmbed(true)}
                    className="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500 text-sky-300 hover:text-white rounded-xl font-bold flex items-center gap-1.5 border border-sky-500/30 transition-all"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>View Folder Files Inside</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Real-Time Dynamic Subtitle Overlay ── */}
      {subtitlesEnabled && activeCueText && (
        <div className="absolute bottom-16 sm:bottom-20 left-4 right-4 z-20 flex justify-center pointer-events-none transition-all duration-150">
          <div className={`${fontClasses} ${colorClasses} font-black text-center bg-black/75 backdrop-blur-sm rounded-xl max-w-3xl leading-snug shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-100`}>
            {activeCueText}
          </div>
        </div>
      )}

      {/* ── Translation In-Progress Toast ── */}
      {isTranslating && (
        <div className="absolute top-14 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 text-sky-400 text-xs font-bold backdrop-blur border border-sky-500/40 shadow-lg animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Translating Subtitles ({translationProgress}%)...</span>
        </div>
      )}

      {/* ── Top Bar: Episode Switcher (Where Episode 12 is written) & Controls ── */}
      <div className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex flex-wrap items-center justify-between gap-2 z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Left: Episode Title & Dropdown Switcher */}
        <div className="flex items-center gap-2 max-w-[65%]">
          <span className="px-2 py-0.5 rounded bg-sky-500/80 text-white text-[10px] font-extrabold uppercase flex-shrink-0 flex items-center gap-1">
            {viewingFolderEmbed ? '📁 Drive Folder' : isGoogleDriveFile ? '📁 Drive Video' : embedInfo?.type === 'youtube' ? '▶ YouTube' : isDirectVideo ? '⚡ Video' : googleDriveFolderUrl ? '📁 Drive Series' : '▶ Video Player'}
          </span>

          {/* Episode Switcher Dropdown (Where Episode 12 is written) */}
          <div className="relative">
            <button
              onClick={() => { setShowEpDropdown(!showEpDropdown); setShowAudioMenu(false); setShowSubMenu(false); }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 hover:bg-black text-white text-xs sm:text-sm font-black border border-white/20 transition-all hover:border-sky-400 max-w-full shadow-lg"
              title="Click to switch episode and view all names"
            >
              <span className="truncate max-w-[180px] sm:max-w-[320px]">
                {formattedEpTitle}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            </button>

            {/* Dropdown with all episodes and full titles */}
            {showEpDropdown && episodesList && episodesList.length > 0 && (
              <div className="absolute left-0 top-9 w-72 sm:w-96 bg-[#0b1622] border border-[#1e293b] rounded-2xl p-2.5 shadow-2xl z-50 text-slate-200 animate-in fade-in duration-150 max-h-72 overflow-y-auto scrollbar-thin">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 mb-1.5 border-b border-[#1e293b] flex items-center justify-between">
                  <span>All Episodes ({episodesList.length})</span>
                  <span className="text-sky-400 font-extrabold">Click to Play</span>
                </div>
                {episodesList.map((ep) => (
                  <button
                    key={ep.num}
                    onClick={() => {
                      if (onSelectEpisode) onSelectEpisode(ep.num);
                      setShowEpDropdown(false);
                      setViewingFolderEmbed(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left mb-1 ${
                      ep.num === episodeNum
                        ? 'bg-sky-500 text-white shadow'
                        : 'hover:bg-[#151f2e] text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-2">{ep.title || `Episode ${ep.num}`}</span>
                    {ep.num === episodeNum && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Drive Files Toggle, Quick Link Button, Open Link, Dual Audio, Subtitles */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* If Google Drive Folder exists: Toggle between Episode Video and Drive Files List */}
          {driveFolderId && (
            <button
              onClick={() => setViewingFolderEmbed(!viewingFolderEmbed)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur border transition-all ${
                viewingFolderEmbed 
                  ? 'bg-sky-500 text-white border-sky-400 shadow' 
                  : 'bg-black/60 hover:bg-black text-slate-200 border-white/20'
              }`}
              title="Toggle between Episode Video Player and Drive Folder View"
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{viewingFolderEmbed ? 'Play Video' : 'Drive Files'}</span>
            </button>
          )}

          {/* Quick Edit/Paste Link Button */}
          <button
            onClick={() => setShowQuickInput(!showQuickInput)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-500/80 hover:bg-sky-500 text-white text-xs font-bold backdrop-blur border border-sky-400/50 shadow transition-all hover:scale-105"
            title="Paste link for this episode"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Set Link</span>
          </button>

          {/* External Link Button */}
          {(src || googleDriveFolderUrl) && (
            <a
              href={src || googleDriveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black text-slate-200 hover:text-white text-xs font-bold backdrop-blur border border-white/20 transition-all hover:scale-105"
              title="Open link in Google Drive"
            >
              <span>Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Dual Audio Switcher Button (Direct Video Only) */}
          {isDirectVideo && (
            <div className="relative">
              <button
                onClick={() => { setShowAudioMenu(!showAudioMenu); setShowSubMenu(false); }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur transition-all border ${
                  audioTrackMode !== 'stereo' || audioBoost
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-black/60 text-slate-200 border-white/20 hover:bg-black/80'
                }`}
                title="Dual Audio Switcher (Japanese / English Dub)"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {audioTrackMode === 'left' ? '🇯🇵 Japanese' : audioTrackMode === 'right' ? '🇺🇸 English Dub' : 'Dual Audio'}
                </span>
              </button>

              {/* Audio Dropdown Menu */}
              {showAudioMenu && (
                <div className="absolute right-0 top-10 w-64 bg-[#0b1622] border border-[#1e293b] rounded-2xl p-3 shadow-2xl z-40 text-slate-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e293b]">
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <Headphones className="w-4 h-4 text-indigo-400" />
                      <span>Dual Audio Tracks</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold">Web Audio</span>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => setAudioChannel('stereo')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        audioTrackMode === 'stereo' ? 'bg-indigo-600 text-white' : 'hover:bg-[#151f2e] text-slate-300'
                      }`}
                    >
                      <span>Balanced Stereo</span>
                      {audioTrackMode === 'stereo' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setAudioChannel('left')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        audioTrackMode === 'left' ? 'bg-indigo-600 text-white' : 'hover:bg-[#151f2e] text-slate-300'
                      }`}
                    >
                      <span>🇯🇵 Japanese Track (Audio 1)</span>
                      {audioTrackMode === 'left' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setAudioChannel('right')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        audioTrackMode === 'right' ? 'bg-indigo-600 text-white' : 'hover:bg-[#151f2e] text-slate-300'
                      }`}
                    >
                      <span>🇺🇸 English Dub Track (Audio 2)</span>
                      {audioTrackMode === 'right' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Vocal Dialogue Boost */}
                  <div className="pt-2 mt-2 border-t border-[#1e293b]">
                    <button
                      onClick={toggleAudioBoost}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        audioBoost ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-[#151f2e] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Dialogue Vocal Boost</span>
                      <span>{audioBoost ? 'ON (+6dB)' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtitles & Translation Menu Button */}
          <div className="relative">
            <button
              onClick={() => { setShowSubMenu(!showSubMenu); setShowAudioMenu(false); }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur transition-all border ${
                subtitlesEnabled
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                  : 'bg-black/60 text-slate-400 border-white/20 hover:bg-black/80'
              }`}
              title="Subtitles & Real-Time Language Translation"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>
                {selectedLang === 'original' ? 'Subtitles (CC)' : SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name || 'Translate'}
              </span>
            </button>

            {/* Subtitles & Translation Dropdown */}
            {showSubMenu && (
              <div className="absolute right-0 top-10 w-80 bg-[#0b1622] border border-[#1e293b] rounded-2xl p-4 shadow-2xl z-40 text-slate-200 animate-in fade-in duration-150 max-h-[85vh] overflow-y-auto scrollbar-thin">

                {/* Header with Subtitle Toggle */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e293b]">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-sky-400" />
                    <span>Subtitles & Translation</span>
                  </h4>
                  <button
                    onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      subtitlesEnabled ? 'bg-emerald-500 text-white' : 'bg-[#1e293b] text-slate-400'
                    }`}
                  >
                    {subtitlesEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Translate into Any Language Selector */}
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Translate Subtitles to:
                  </label>
                  <select
                    value={selectedLang}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-bold cursor-pointer"
                  >
                    <option value="original">Original Subtitle Track</option>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto Find from Internet & Upload Subtitle */}
                <div className="space-y-2 mb-3">
                  <button
                    onClick={handleAutoFindSubtitles}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white font-bold text-xs border border-sky-500/40 transition-all shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Fetch Subtitles from Internet</span>
                  </button>

                  <label className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#151f2e] hover:bg-[#1e293b] text-slate-300 hover:text-white font-bold text-xs border border-[#1e293b] transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .SRT or .VTT File</span>
                    <input
                      type="file"
                      accept=".srt,.vtt,.txt"
                      onChange={handleUploadSubtitleFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Subtitle Timing Sync (+/- Delay) */}
                <div className="mb-3 p-2.5 rounded-xl bg-[#151f2e] border border-[#1e293b]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-300">Timing Delay Sync:</span>
                    <span className="font-black text-sky-400">{subDelay > 0 ? `+${subDelay}s` : `${subDelay}s`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSubDelay(d => Math.round((d - 0.5) * 10) / 10)}
                      className="flex-1 py-1 bg-[#0b1622] hover:bg-sky-500 hover:text-white text-slate-300 text-xs font-bold rounded-lg border border-[#1e293b]"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => setSubDelay(0)}
                      className="px-2 py-1 bg-[#0b1622] text-slate-400 text-xs font-bold rounded-lg border border-[#1e293b]"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setSubDelay(d => Math.round((d + 0.5) * 10) / 10)}
                      className="flex-1 py-1 bg-[#0b1622] hover:bg-sky-500 hover:text-white text-slate-300 text-xs font-bold rounded-lg border border-[#1e293b]"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>

                {/* Subtitle Appearance */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Font Size
                    </label>
                    <select
                      value={subFontSize}
                      onChange={(e) => setSubFontSize(e.target.value)}
                      className="w-full bg-[#151f2e] border border-[#1e293b] rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Font Color
                    </label>
                    <select
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-full bg-[#151f2e] border border-[#1e293b] rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="yellow">Yellow</option>
                      <option value="white">White</option>
                      <option value="cyan">Cyan</option>
                    </select>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Overlay Popover: Quick Paste Link for Current Episode ── */}
      {showQuickInput && (
        <div className="absolute top-16 right-4 z-40 w-80 sm:w-96 bg-[#0b1622] border border-sky-500/50 rounded-2xl p-4 shadow-2xl animate-in fade-in duration-150 text-slate-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e293b]">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Paste Video Link for Episode {episodeNum}</span>
            </h4>
            <button
              onClick={() => setShowQuickInput(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleQuickSaveLink} className="space-y-2">
            <input
              type="text"
              placeholder="Paste Google Drive link, MP4, or video URL..."
              value={quickLinkInput}
              onChange={(e) => setQuickLinkInput(e.target.value)}
              required
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowQuickInput(false)}
                className="px-3 py-1.5 rounded-lg bg-[#151f2e] text-slate-400 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-black shadow flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Play Now</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Bottom Controls Bar (Direct HTML5 Video Only) ── */}
      {isDirectVideo && (
        <div className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

          {/* Progress / Scrub Bar */}
          <div
            onClick={handleSeek}
            className="relative w-full h-1.5 sm:h-2 bg-slate-800/80 rounded-full cursor-pointer group/bar mb-3 overflow-hidden"
          >
            <div
              style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
              className="absolute top-0 bottom-0 left-0 bg-slate-600/60 rounded-full"
            />
            <div
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              className="absolute top-0 bottom-0 left-0 bg-sky-500 rounded-full shadow-lg shadow-sky-500/50"
            />
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between text-white text-xs sm:text-sm">

            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1 hover:text-sky-400 transition-colors focus:outline-none"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }}
                className="p-1 hover:text-sky-400 transition-colors"
                title="Rewind 5s (Left Arrow)"
              >
                <Rewind className="w-4 h-4" />
              </button>

              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }}
                className="p-1 hover:text-sky-400 transition-colors"
                title="Skip 5s (Right Arrow)"
              >
                <FastForward className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="hover:text-sky-400 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 accent-sky-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <span className="text-slate-300 font-mono text-[11px] sm:text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">

              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  subtitlesEnabled ? 'text-sky-400' : 'text-slate-500'
                }`}
                title="Toggle Subtitles (C)"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <select
                value={playbackRate}
                onChange={(e) => {
                  const r = parseFloat(e.target.value);
                  setPlaybackRate(r);
                  if (videoRef.current) videoRef.current.playbackRate = r;
                }}
                className="bg-black/60 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white cursor-pointer focus:outline-none"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>

              <button
                onClick={toggleFullscreen}
                className="p-1 hover:text-sky-400 transition-colors focus:outline-none"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
