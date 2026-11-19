import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Star, Loader2, Trophy, Eye } from 'lucide-react';
import { getCommunityRankings } from '../services/database';
import { isSupabaseConfigured } from '../services/supabase';

export default function CommunityView({ onSelectMedia }) {
  const [data, setData] = useState({ popular: [], topRated: [], recentActivity: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('popular');

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    getCommunityRankings().then(res => { setData(res); setLoading(false); });
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-24 bg-[#151f2e] border border-[#1e293b] rounded-2xl">
        <Users className="w-14 h-14 text-slate-500 mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-black text-white mb-2">Community Rankings</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Connect Supabase to see what the community is watching, ranking, and rating in real-time.
        </p>
        <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold">
          Setup required — see the guide below ↓
        </div>
      </div>
    );
  }

  const items = tab === 'popular' ? data.popular : data.topRated;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-[#151f2e] to-sky-950 border border-[#1e293b] rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-sky-400" />
          <h2 className="text-2xl font-black text-white">Community Rankings</h2>
        </div>
        <p className="text-sm text-slate-400">What AniTrack users are watching, rating, and loving right now.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'popular', label: 'Most Tracked', icon: TrendingUp },
          { id: 'topRated', label: 'Top Rated', icon: Star },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              tab === id
                ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                : 'bg-[#151f2e] text-slate-300 border-[#1e293b] hover:border-sky-500/50 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400 mb-3" />
          <p className="text-sm">Loading community data...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[#151f2e] border border-[#1e293b] rounded-2xl">
          <p className="text-white font-bold">No data yet</p>
          <p className="text-xs text-slate-400 mt-1">Be the first to track anime and build the community rankings!</p>
        </div>
      ) : (
        <div className="bg-[#151f2e] border border-[#1e293b] rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0b1622] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 w-28 text-center">{tab === 'popular' ? 'Tracking' : 'Community Score'}</th>
                <th className="py-3 px-4 w-28 text-center">{tab === 'popular' ? 'Avg Score' : 'Tracking'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {items.map((item, index) => {
                const title = item.title_english || item.title_romaji || `Media #${item.mediaId}`;
                const rank = index + 1;
                return (
                  <tr key={item.mediaId} className="hover:bg-[#1a2638] transition-colors group cursor-pointer"
                    onClick={() => onSelectMedia && onSelectMedia({ id: parseInt(item.mediaId), title: { english: item.title_english, romaji: item.title_romaji }, coverImage: { large: item.cover_image }, type: item.media_type })}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      {rank <= 3 ? (
                        <span className={`font-black text-lg ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : 'text-orange-500'}`}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="font-extrabold text-sm text-slate-400">#{rank}</span>
                      )}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.cover_image && (
                          <img src={item.cover_image} alt={title} className="w-10 h-14 rounded-lg object-cover bg-slate-800 shadow flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-sm text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-1">{title}</p>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{item.format || item.media_type}</span>
                        </div>
                      </div>
                    </td>

                    {/* Primary stat */}
                    <td className="py-3 px-4 text-center">
                      {tab === 'popular' ? (
                        <div className="flex items-center justify-center gap-1 text-sm font-bold text-sky-400">
                          <Eye className="w-4 h-4" />
                          <span>{item.count} users</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-sm font-bold text-amber-400">
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span>{item.avgScore} / 10</span>
                        </div>
                      )}
                    </td>

                    {/* Secondary stat */}
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-semibold">
                      {tab === 'popular' ? (
                        item.avgScore > 0 ? (
                          <span className="text-amber-400 font-bold">★ {item.avgScore}</span>
                        ) : '—'
                      ) : (
                        <span>{item.count} users</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Activity */}
      {data.recentActivity?.length > 0 && (
        <div>
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            Recent Community Activity
          </h3>
          <div className="space-y-2">
            {data.recentActivity.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#151f2e] border border-[#1e293b] p-3 rounded-xl text-xs">
                <img
                  src={item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                  alt=""
                  className="w-8 h-8 rounded-full bg-slate-800"
                />
                <div className="flex-1 overflow-hidden">
                  <span className="font-bold text-sky-400">{item.profiles?.username || 'User'}</span>
                  {' '}
                  <span className="text-slate-400">
                    {item.status === 'COMPLETED' ? 'completed' : item.status === 'CURRENT' ? 'is watching' : 'added to list'}
                  </span>
                  {' '}
                  <span className="font-semibold text-white truncate">{item.title_english || item.title_romaji}</span>
                  {item.score > 0 && (
                    <span className="ml-1 text-amber-400 font-bold">★ {item.score}</span>
                  )}
                </div>
                <span className="text-slate-500 flex-shrink-0">
                  {new Date(item.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
