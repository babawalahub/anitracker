import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Settings, Globe, Languages, Sliders, RefreshCw, Upload, 
  Download, Check, Sparkles, AlertCircle, Headphones, 
  ExternalLink, MessageSquare, FastForward, Rewind, Eye, EyeOff
} from 'lucide-react';
import { 
  SUPPORTED_LANGUAGES, 
  parseSrtOrVtt, 
  autoFetchInternetSubtitles, 
  translateCues 
} from '../services/subtitleService';

export default function CustomVideoPlayer({
  src,
  poster,
  title,
  animeTitle,
  episodeNum,
  onEnded,
  onTimeUpdate
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const splitterRef = useRef(null);
  const mergerRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
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

  // Detect Google Drive file or stream
  const fileIdMatch = src ? (
    src.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/) || 
    src.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    src.match(/\/d\/([a-zA-Z0-9_-]+)/)
  ) : null;
  const isGoogleDrive = Boolean(fileIdMatch || (src && src.includes('drive.google.com')));
  const googleDriveEmbedUrl = fileIdMatch 
    ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview` 
    : (src && src.includes('drive.google.com') ? src : null);

  // Initialize Web Audio API for Dual Audio separation & Dialogue Boost
  const setupWebAudio = () => {
    if (!videoRef.current || audioContextRef.current || isGoogleDrive) return;
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
      console.warn("Web Audio API not supported on this stream:", err);
    }
  };

  // For Google Drive video stream, advance subtitle timer when playing
  useEffect(() => {
    let interval = null;
    if (isGoogleDrive && isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          const effectiveTime = next - subDelay;
          if (subtitlesEnabled && currentCues.length > 0) {
            const cue = currentCues.find(c => effectiveTime >= c.start && effectiveTime <= c.end);
            setActiveCueText(cue ? cue.text : '');
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGoogleDrive, isPlaying, subDelay, subtitlesEnabled, currentCues]);

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
        // Japanese: Route Left channel to both Left and Right speakers
        splitter.connect(merger, 0, 0);
        splitter.connect(merger, 0, 1);
      } else if (mode === 'right') {
        // English Dub: Route Right channel to both Left and Right speakers
        splitter.connect(merger, 1, 0);
        splitter.connect(merger, 1, 1);
      } else {
        // Normal Stereo: Left to Left, Right to Right
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

  // Video Time Update: Calculate Active Subtitle Cue
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);

    // Calculate buffer
    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    // Match active subtitle cue
    if (!subtitlesEnabled || currentCues.length === 0) {
      setActiveCueText('');
      return;
    }

    const effectiveTime = time - subDelay;
    const activeCue = currentCues.find(c => effectiveTime >= c.start && effectiveTime <= c.end);
    setActiveCueText(activeCue ? activeCue.text : '');
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    setupWebAudio();
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Seek Handler
  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume Handler
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
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts (Space, Arrow keys, F, M, C)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime += 5;
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime -= 5;
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
  }, [isPlaying, isMuted]);

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

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setControlsVisible(false); }}
      className="relative aspect-video w-full bg-black overflow-hidden select-none group flex items-center justify-center"
    >
      
      {/* ── Video Stream: Google Drive Embed or HTML5 Video ── */}
      {isGoogleDrive ? (
        <iframe
          src={googleDriveEmbedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={onEnded}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />
      )}

      {/* ── Real-Time Dynamic Subtitle Overlay ── */}
      {subtitlesEnabled && activeCueText && (
        <div className="absolute bottom-16 sm:bottom-20 left-4 right-4 z-20 flex justify-center pointer-events-none transition-all duration-150">
          <div className={`${fontClasses} ${colorClasses} font-black text-center bg-black/75 backdrop-blur-sm rounded-xl max-w-3xl leading-snug shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-100`}>
            {activeCueText}
          </div>
        </div>
      )}

      {/* ── Center Big Play / Pause Flash Button ── */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-2xl backdrop-blur transition-all hover:scale-110 hover:bg-sky-400 group-hover:flex"
        >
          <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
        </button>
      )}

      {/* ── Translation In-Progress Toast ── */}
      {isTranslating && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 text-sky-400 text-xs font-bold backdrop-blur border border-sky-500/40 shadow-lg animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Translating Subtitles ({translationProgress}%)...</span>
        </div>
      )}

      {/* ── Top Bar: Dual Audio & Subtitles Controls ── */}
      <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Anime & Episode Title */}
        <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-black truncate max-w-[60%]">
          <span className="px-2 py-0.5 rounded bg-sky-500/80 text-white text-[10px] font-extrabold uppercase">
            Pro Player
          </span>
          <span className="truncate">{title || animeTitle}</span>
        </div>

        {/* Top Controls: Audio Switcher & Subtitle Selector */}
        <div className="flex items-center gap-2">
          
          {/* Dual Audio Switcher Button */}
          <div className="relative">
            <button
              onClick={() => { setShowAudioMenu(!showAudioMenu); setShowSubMenu(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur transition-all border ${
                audioTrackMode !== 'stereo' || audioBoost
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                  : 'bg-black/60 text-slate-200 border-white/20 hover:bg-black/80'
              }`}
              title="Dual Audio Switcher (Japanese / English Dub)"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
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

          {/* Subtitles & Translation Menu Button */}
          <div className="relative">
            <button
              onClick={() => { setShowSubMenu(!showSubMenu); setShowAudioMenu(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur transition-all border ${
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

      {/* ── Bottom Controls Bar ── */}
      <div className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Progress / Scrub Bar */}
        <div 
          onClick={handleSeek}
          className="relative w-full h-1.5 sm:h-2 bg-slate-800/80 rounded-full cursor-pointer group/bar mb-3 overflow-hidden"
        >
          {/* Buffered Progress */}
          <div 
            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
            className="absolute top-0 bottom-0 left-0 bg-slate-600/60 rounded-full"
          />
          {/* Current Played Progress */}
          <div 
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            className="absolute top-0 bottom-0 left-0 bg-sky-500 rounded-full shadow-lg shadow-sky-500/50"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs sm:text-sm">
          
          <div className="flex items-center gap-3">
            {/* Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="p-1 hover:text-sky-400 transition-colors focus:outline-none"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            {/* Rewind 5s */}
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }}
              className="p-1 hover:text-sky-400 transition-colors"
              title="Rewind 5s (Left Arrow)"
            >
              <Rewind className="w-4 h-4" />
            </button>

            {/* Skip 5s */}
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }}
              className="p-1 hover:text-sky-400 transition-colors"
              title="Skip 5s (Right Arrow)"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Volume Control */}
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

            {/* Time Stamp */}
            <span className="text-slate-300 font-mono text-[11px] sm:text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Subtitles Quick Toggle */}
            <button
              onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                subtitlesEnabled ? 'text-sky-400' : 'text-slate-500'
              }`}
              title="Toggle Subtitles (C)"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Playback Speed */}
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

            {/* Fullscreen Button */}
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

    </div>
  );
}
