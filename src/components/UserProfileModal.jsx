import React, { useState } from 'react';
import { X, User, Edit3, Check, Loader2, Film, BookOpen, Star, Clock, Award, LogOut } from 'lucide-react';
import { updateProfile, signOut } from '../services/auth';
import { computeUserStats, TRACKING_STATUS, STATUS_LABELS } from '../services/storage';

export default function UserProfileModal({ user, profile, onClose, onSignOut, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);

  const stats = computeUserStats();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, { username, bio });
      setEditing(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
    onClose();
  };

  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer">
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-lg bg-[#0b1622] border border-[#1e293b] rounded-3xl overflow-hidden shadow-2xl cursor-default">

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#151f2e] transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1622] to-transparent" />
        </div>

        {/* Avatar + Name */}
        <div className="px-6 -mt-12 pb-6 relative">
          <div className="flex items-end gap-4 mb-4">
            <img
              src={avatarUrl}
              alt={profile?.username}
              className="w-20 h-20 rounded-2xl border-4 border-[#0b1622] bg-slate-800 shadow-xl"
            />
            <div className="pb-1">
              {editing ? (
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="text-lg font-black text-white bg-[#151f2e] border border-sky-500 rounded-lg px-3 py-1 focus:outline-none w-full"
                />
              ) : (
                <h2 className="text-xl font-black text-white">{profile?.username || 'Anonymous'}</h2>
              )}
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          {/* Bio */}
          {editing ? (
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={2}
              placeholder="Write something about yourself..."
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none mb-4"
            />
          ) : (
            <p className="text-sm text-slate-400 mb-4 italic">
              {profile?.bio || 'No bio yet.'}
            </p>
          )}

          {/* Edit / Save buttons */}
          <div className="flex items-center gap-2 mb-6">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Profile</span>
                </button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-[#151f2e] border border-[#1e293b] text-slate-300 font-bold text-xs hover:text-white transition-all">
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#151f2e] border border-[#1e293b] text-slate-300 font-bold text-xs hover:border-sky-500 hover:text-white transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500 hover:text-white transition-all ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#151f2e] p-3 rounded-2xl border border-[#1e293b] text-center">
              <Film className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <p className="text-xl font-black text-white">{stats.animeCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">Anime</p>
            </div>
            <div className="bg-[#151f2e] p-3 rounded-2xl border border-[#1e293b] text-center">
              <BookOpen className="w-5 h-5 text-pink-400 mx-auto mb-1" />
              <p className="text-xl font-black text-white">{stats.mangaCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">Manga</p>
            </div>
            <div className="bg-[#151f2e] p-3 rounded-2xl border border-[#1e293b] text-center">
              <Star className="w-5 h-5 text-amber-400 mx-auto mb-1 fill-amber-400" />
              <p className="text-xl font-black text-emerald-400">{stats.meanScore}</p>
              <p className="text-[10px] text-slate-400 font-medium">Avg Score</p>
            </div>
            <div className="bg-[#151f2e] p-3 rounded-2xl border border-[#1e293b] text-center">
              <Clock className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <p className="text-xl font-black text-white">{stats.totalDaysWatched}</p>
              <p className="text-[10px] text-slate-400 font-medium">Days Watched</p>
            </div>
            <div className="bg-[#151f2e] p-3 rounded-2xl border border-[#1e293b] text-center">
              <Award className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-xl font-black text-white">{stats.totalEpisodesWatched}</p>
              <p className="text-[10px] text-slate-400 font-medium">Episodes</p>
            </div>
            <div className="bg-[#151f2e] p-3 rounded-2xl border border-[#1e293b] text-center">
              <Check className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-black text-white">{stats.statusBreakdown.COMPLETED}</p>
              <p className="text-[10px] text-slate-400 font-medium">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
