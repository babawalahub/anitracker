import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Filters from './components/Filters';
import MediaCard from './components/MediaCard';
import MediaDetailModal from './components/MediaDetailModal';
import MyListView from './components/MyListView';
import StatsView from './components/StatsView';
import ImportExportModal from './components/ImportExportModal';
import CommunityView from './components/CommunityView';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';

import { searchMedia } from './services/anilistApi';
import { FALLBACK_ANIME, FALLBACK_MANGA } from './services/fallbackData';
import { getStoredLists, upsertEntry, TRACKING_STATUS } from './services/storage';
import { onAuthStateChange, getCurrentUser, getProfile } from './services/auth';
import { pushLocalListToCloud, pullCloudListToLocal, upsertCloudEntry } from './services/database';
import { Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'mylist' | 'community' | 'stats'
  const [mediaType, setMediaType] = useState('ANIME'); // 'ANIME' | 'MANGA'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    genre: '',
    format: '',
    season: '',
    seasonYear: '',
    sort: 'TRENDING_DESC',
  });

  const [page, setPage] = useState(1);
  const [mediaItems, setMediaItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, total: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Active Modals
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // User & Auth State
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Stored Tracking Lists
  const [userLists, setUserLists] = useState(getStoredLists());

  // Reload user lists when changed
  const reloadLists = useCallback(() => {
    setUserLists(getStoredLists());
  }, []);

  // Listen to Auth state and sync lists
  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const p = await getProfile(currentUser.id);
          setProfile(p);
          // Sync lists from cloud
          const cloudLists = await pullCloudListToLocal(currentUser.id);
          if (cloudLists && Object.keys(cloudLists).length > 0) {
            setUserLists(cloudLists);
          } else {
            // Push local to cloud if cloud is empty
            await pushLocalListToCloud(currentUser.id);
          }
        }
      } catch (e) {
        console.warn("Auth initialization note:", e);
      }
    }
    initAuth();

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const p = await getProfile(u.id);
        setProfile(p);
        const cloudLists = await pullCloudListToLocal(u.id);
        if (cloudLists && Object.keys(cloudLists).length > 0) {
          setUserLists(cloudLists);
        } else {
          await pushLocalListToCloud(u.id);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleStorageUpdate = (e) => {
      setUserLists(e.detail || getStoredLists());
    };
    window.addEventListener('anitrack:lists-updated', handleStorageUpdate);
    return () => window.removeEventListener('anitrack:lists-updated', handleStorageUpdate);
  }, []);

  // Browser History Navigation (Browser Back & Forward button integration)
  useEffect(() => {
    const handlePopState = (e) => {
      const state = e.state;
      if (state && state.modal === 'media' && state.mediaId) {
        // Media modal
      } else if (state && state.modal === 'backup') {
        setShowImportExport(true);
        setSelectedMedia(null);
      } else if (state && state.tab) {
        setActiveTab(state.tab);
        setSelectedMedia(null);
        setShowImportExport(false);
      } else {
        // Default back state
        setSelectedMedia(null);
        setShowImportExport(false);
        setActiveTab('browse');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = (tab) => {
    setActiveTab(tab);
    setSelectedMedia(null);
    setShowImportExport(false);
    window.history.pushState({ tab }, '', `#${tab}`);
  };

  const openMediaModal = (media) => {
    setSelectedMedia(media);
    window.history.pushState({ modal: 'media', mediaId: media.id, tab: activeTab }, '', `#media-${media.id}`);
  };

  const closeMediaModal = () => {
    setSelectedMedia(null);
    if (window.location.hash.startsWith('#media-')) {
      window.history.back();
    }
  };

  const openBackupModal = () => {
    setShowImportExport(true);
    window.history.pushState({ modal: 'backup', tab: activeTab }, '', '#backup');
  };

  const closeBackupModal = () => {
    setShowImportExport(false);
    if (window.location.hash === '#backup') {
      window.history.back();
    }
  };

  // Fetch Media Data
  const loadMedia = useCallback(async () => {
    setLoading(true);
    setApiError(null);

    try {
      const data = await searchMedia({
        page,
        perPage: 24,
        type: mediaType,
        search: searchQuery,
        sort: [filters.sort],
        season: filters.season || undefined,
        seasonYear: filters.seasonYear || undefined,
        genre: filters.genre || undefined,
        format: filters.format || undefined,
      });

      if (data && data.media) {
        setMediaItems(data.media);
        setPageInfo(data.pageInfo || { hasNextPage: false });
      }
    } catch (err) {
      console.error("API error, falling back to local dataset:", err);
      setApiError(err.message || "Failed to load live data");
      
      // Fallback with live search filtering
      const baseFallback = mediaType === 'ANIME' ? FALLBACK_ANIME : FALLBACK_MANGA;
      let filteredFallback = baseFallback;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filteredFallback = baseFallback.filter(item => 
          (item.title?.english || '').toLowerCase().includes(q) ||
          (item.title?.romaji || '').toLowerCase().includes(q) ||
          (item.title?.native || '').toLowerCase().includes(q) ||
          (item.genres || []).some(g => g.toLowerCase().includes(q))
        );
      }
      setMediaItems(filteredFallback);
      setPageInfo({ hasNextPage: false, total: filteredFallback.length });
    } finally {
      setLoading(false);
    }
  }, [page, mediaType, searchQuery, filters]);

  // Debounced effect for search / filters
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedia();
    }, 350);
    return () => clearTimeout(timer);
  }, [loadMedia]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      genre: '',
      format: '',
      season: '',
      seasonYear: '',
      sort: 'TRENDING_DESC',
    });
    setSearchQuery('');
    setPage(1);
  };

  const handleQuickTrack = (media) => {
    const existing = userLists[media.id];
    if (existing) {
      openMediaModal(media);
    } else {
      const updated = upsertEntry(media, {
        status: TRACKING_STATUS.CURRENT,
        progress: 0,
        score: 0,
      });
      if (user) {
        upsertCloudEntry(user.id, updated);
      }
      reloadLists();
    }
  };

  const trackedCount = Object.keys(userLists).length;

  return (
    <div className="min-h-screen bg-[#0b1622] flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        mediaType={mediaType}
        setMediaType={(t) => { setMediaType(t); setPage(1); }}
        searchQuery={searchQuery}
        setSearchQuery={(q) => { setSearchQuery(q); setPage(1); }}
        onOpenImportExport={openBackupModal}
        trackedCount={trackedCount}
        user={user}
        profile={profile}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Offline / API Notification if needed */}
        {apiError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>AniList API is temporarily throttled or network is restricted. Showing offline dataset with full tracking enabled!</span>
            </div>
            <button
              onClick={loadMedia}
              className="flex items-center gap-1 font-bold underline hover:text-white ml-2 flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Tab 1: Browse & Discovery */}
        {activeTab === 'browse' && (
          <div>
            
            {/* Hero Banner for Discovery */}
            <div className="relative rounded-3xl overflow-hidden mb-6 p-6 sm:p-8 bg-gradient-to-r from-sky-950 via-[#151f2e] to-indigo-950 border border-[#1e293b] shadow-xl">
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live AniList & Offline Database
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Track every {mediaType === 'ANIME' ? 'Anime episode' : 'Manga chapter'} you love.
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
                  Organize your watchlist, discover trending seasonal releases, record your ratings, and analyze your personal stats.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Filter Bar */}
            <Filters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              mediaType={mediaType}
            />

            {/* Loading Spinner */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-sky-400 mb-3" />
                <p className="text-sm font-semibold">Loading titles...</p>
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="text-center py-20 bg-[#151f2e] border border-[#1e293b] rounded-2xl">
                <p className="text-lg font-bold text-white">No results found</p>
                <p className="text-xs text-slate-400 mt-1">Try relaxing your search terms or filters.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div>
                {/* Media Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mediaItems.map((item) => (
                    <MediaCard
                      key={item.id}
                      media={item}
                      userEntry={userLists[item.id]}
                      onSelect={(m) => openMediaModal(m)}
                      onQuickTrack={handleQuickTrack}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    disabled={page <= 1}
                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      page <= 1
                        ? 'opacity-40 cursor-not-allowed bg-[#151f2e] border-[#1e293b] text-slate-500'
                        : 'bg-[#151f2e] border-[#1e293b] text-white hover:border-sky-500 hover:bg-sky-500'
                    }`}
                    title="Go Back / Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back (Page {Math.max(1, page - 1)})</span>
                  </button>

                  <span className="text-xs font-extrabold text-slate-300 bg-[#151f2e] px-4 py-2 rounded-xl border border-[#1e293b]">
                    Page {page}
                  </span>

                  <button
                    disabled={!pageInfo.hasNextPage}
                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      !pageInfo.hasNextPage
                        ? 'opacity-40 cursor-not-allowed bg-[#151f2e] border-[#1e293b] text-slate-500'
                        : 'bg-sky-500 border-sky-400 text-white hover:bg-sky-400'
                    }`}
                  >
                    <span>Next (Page {page + 1})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: My List */}
        {activeTab === 'mylist' && (
          <MyListView
            lists={userLists}
            onSelectMedia={(m) => openMediaModal(m)}
            onUpdated={reloadLists}
            onBackToBrowse={() => navigateToTab('browse')}
          />
        )}

        {/* Tab 3: Community Rankings */}
        {activeTab === 'community' && (
          <CommunityView
            onSelectMedia={(m) => openMediaModal(m)}
          />
        )}

        {/* Tab 4: Stats */}
        {activeTab === 'stats' && (
          <StatsView
            onBackToBrowse={() => navigateToTab('browse')}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-[#0b1622] border-t border-[#1e293b] py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AniTrack. Powered by AniList GraphQL & Open Datasets.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Anime & Manga Tracker</span>
            <span>•</span>
            <button onClick={openBackupModal} className="hover:text-white underline">
              Backup / Restore
            </button>
          </div>
        </div>
      </footer>

      {/* Full Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          mediaSummary={selectedMedia}
          onClose={closeMediaModal}
          onUpdated={reloadLists}
          user={user}
          profile={profile}
        />
      )}

      {/* Import / Export Backup Modal */}
      {showImportExport && (
        <ImportExportModal
          onClose={closeBackupModal}
          onImported={reloadLists}
        />
      )}

      {/* Sign In / Sign Up Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      {/* User Profile & Account Modal */}
      {showProfileModal && user && (
        <UserProfileModal
          user={user}
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onSignOut={() => { setUser(null); setProfile(null); }}
          onUpdated={async () => {
            const p = await getProfile(user.id);
            setProfile(p);
          }}
        />
      )}

    </div>
  );
}
