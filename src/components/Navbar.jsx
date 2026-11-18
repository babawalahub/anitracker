import React from 'react';
import { Search, Film, BookOpen, BookmarkCheck, BarChart3, Download, Upload } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  mediaType,
  setMediaType,
  searchQuery,
  setSearchQuery,
  onOpenImportExport,
  trackedCount
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#0b1622]/95 backdrop-blur border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('browse')}
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-xl tracking-tighter">A</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1">
                AniTrack
                <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-semibold">PRO</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium -mt-1">Anime & Manga Tracker</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${mediaType === 'ANIME' ? 'Anime' : 'Manga'} by title, character...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-full pl-10 pr-4 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            
            {/* Anime / Manga Selector */}
            <div className="bg-[#151f2e] p-1 rounded-xl border border-[#1e293b] flex items-center">
              <button
                onClick={() => { setMediaType('ANIME'); setActiveTab('browse'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mediaType === 'ANIME' && activeTab === 'browse'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Anime</span>
              </button>
              <button
                onClick={() => { setMediaType('MANGA'); setActiveTab('browse'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mediaType === 'MANGA' && activeTab === 'browse'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manga</span>
              </button>
            </div>

            {/* My List Tab */}
            <button
              onClick={() => setActiveTab('mylist')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
                activeTab === 'mylist'
                  ? 'bg-[#151f2e] text-sky-400 border border-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#151f2e]'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>My List</span>
              {trackedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-sky-500 text-white text-[10px] rounded-full font-bold">
                  {trackedCount}
                </span>
              )}
            </button>

            {/* Stats Tab */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-[#151f2e] text-sky-400 border border-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#151f2e]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* Backup / Restore Button */}
            <button
              onClick={onOpenImportExport}
              title="Backup / Restore List Data"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#151f2e] border border-transparent hover:border-[#1e293b] transition-all"
            >
              <Download className="w-4 h-4" />
            </button>
          </nav>

        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${mediaType === 'ANIME' ? 'Anime' : 'Manga'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

      </div>
    </header>
  );
}
