import React from 'react';
import { Search, Film, BookOpen, BookmarkCheck, BarChart3, Download, Users, LogIn, ChevronDown } from 'lucide-react';

export default function Navbar({
  activeTab, setActiveTab, mediaType, setMediaType,
  searchQuery, setSearchQuery, onOpenImportExport,
  trackedCount, user, profile, onOpenAuth, onOpenProfile
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#0b1622]/95 backdrop-blur border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">

          {/* Logo */}
          <div onClick={() => setActiveTab('browse')} className="flex items-center gap-2 cursor-pointer flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-xl">A</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-extrabold text-lg text-white tracking-tight leading-none">AniTrack</span>
              <span className="text-[9px] text-slate-400 font-medium">Anime & Manga Tracker</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${mediaType === 'ANIME' ? 'Anime' : 'Manga'}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-full pl-10 pr-4 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            {/* Anime/Manga Toggle */}
            <div className="bg-[#151f2e] p-1 rounded-xl border border-[#1e293b] flex items-center">
              <button
                onClick={() => { setMediaType('ANIME'); setActiveTab('browse'); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${mediaType === 'ANIME' && activeTab === 'browse' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Film className="w-3.5 h-3.5" /><span className="hidden sm:inline">Anime</span>
              </button>
              <button
                onClick={() => { setMediaType('MANGA'); setActiveTab('browse'); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${mediaType === 'MANGA' && activeTab === 'browse' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <BookOpen className="w-3.5 h-3.5" /><span className="hidden sm:inline">Manga</span>
              </button>
            </div>

            {/* My List */}
            <button
              onClick={() => setActiveTab('mylist')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${activeTab === 'mylist' ? 'bg-[#151f2e] text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-[#151f2e]'}`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">My List</span>
              {trackedCount > 0 && (
                <span className="px-1.5 bg-sky-500 text-white text-[10px] rounded-full font-bold">{trackedCount}</span>
              )}
            </button>

            {/* Community */}
            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'community' ? 'bg-[#151f2e] text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-[#151f2e]'}`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Community</span>
            </button>

            {/* Stats */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'stats' ? 'bg-[#151f2e] text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-[#151f2e]'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* Backup */}
            <button onClick={onOpenImportExport} title="Backup / Restore"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#151f2e] border border-transparent hover:border-[#1e293b] transition-all">
              <Download className="w-4 h-4" />
            </button>

            {/* Auth: Login or Avatar */}
            {user ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#151f2e] border border-[#1e293b] hover:border-sky-500/50 transition-all"
              >
                <img
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="avatar"
                  className="w-7 h-7 rounded-lg bg-slate-800"
                />
                <span className="text-xs font-bold text-white max-w-[80px] truncate hidden sm:block">
                  {profile?.username || 'Profile'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </nav>
        </div>

        {/* Mobile Search */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${mediaType === 'ANIME' ? 'Anime' : 'Manga'}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
