import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Star, Send, ThumbsUp, Heart, 
  User, Check, Loader2, Sparkles, Filter 
} from 'lucide-react';
import { fetchComments, postComment, toggleLikeComment } from '../services/comments';

export default function MediaComments({ media, user, profile }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [episodeTag, setEpisodeTag] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const list = await fetchComments(media.id);
      if (isMounted) {
        setComments(list);
        setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [media.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const authorName = profile?.username || (user?.email ? user.email.split('@')[0] : 'AnimeFan');
      const authorAvatar = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`;

      const newC = await postComment(media.id, {
        user,
        username: authorName,
        avatar: authorAvatar,
        text: commentText,
        rating: rating > 0 ? rating : null,
        episode: episodeTag ? parseInt(episodeTag, 10) : null
      });

      setComments(prev => [newC, ...prev]);
      setCommentText('');
      setRating(0);
      setEpisodeTag('');
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = (commentId) => {
    const updated = toggleLikeComment(media.id, commentId);
    setComments(updated);
  };

  const title = media.title?.english || media.title?.romaji || 'this title';

  return (
    <div className="bg-[#151f2e] border border-[#1e293b] rounded-3xl p-6 shadow-xl mb-6">
      
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1e293b] mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <span>Discussion & Reviews</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0b1622] text-slate-400 border border-[#1e293b]">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Share your thoughts, episode reactions, and ratings for {title}
            </p>
          </div>
        </div>
      </div>

      {/* Post Comment Box */}
      <form onSubmit={handleSubmit} className="mb-8 bg-[#0b1622] border border-[#1e293b] rounded-2xl p-4 shadow-sm">
        
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <img
              src={profile?.avatar_url || (user?.email ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}` : 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest')}
              alt=""
              className="w-7 h-7 rounded-lg bg-slate-800"
            />
            <span className="text-xs font-bold text-white">
              {profile?.username || (user?.email ? user.email.split('@')[0] : 'Guest Anime Fan')}
            </span>
          </div>

          {/* Rating Stars Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Your Rating:</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star === rating ? 0 : star)}
                className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                title={`${star} / 10`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-amber-400 ml-1 min-w-[20px]">
              {rating > 0 ? `${rating}★` : ''}
            </span>
          </div>
        </div>

        <textarea
          rows={3}
          placeholder={`Write your comment, review, or thoughts about ${title}...`}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          required
          className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none mb-3"
        />

        <div className="flex items-center justify-between gap-3">
          {/* Optional Episode Tag */}
          <div className="flex items-center gap-2">
            {media.type === 'ANIME' && (
              <input
                type="number"
                min="1"
                max={media.episodes || 9999}
                placeholder="Episode # (optional)"
                value={episodeTag}
                onChange={(e) => setEpisodeTag(e.target.value)}
                className="w-36 bg-[#151f2e] border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !commentText.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Post Comment</span>
          </button>
        </div>

      </form>

      {/* Comments Feed */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-2" />
          <p className="text-xs font-semibold">Loading discussions...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-[#0b1622] border border-[#1e293b] rounded-2xl">
          <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-white">No comments yet</p>
          <p className="text-xs text-slate-400 mt-1">Be the first to share your thoughts on this title!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-[#0b1622] border border-[#1e293b] p-4 rounded-2xl hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={c.avatar}
                    alt={c.username}
                    className="w-8 h-8 rounded-xl bg-slate-800 object-cover shadow"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{c.username}</span>
                      {c.episode && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          Ep {c.episode}
                        </span>
                      )}
                      {c.rating && (
                        <span className="flex items-center gap-0.5 text-[11px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{c.rating}/10</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                    </span>
                  </div>
                </div>

                {/* Like Button */}
                <button
                  onClick={() => handleLike(c.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    c.likedByMe
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-[#151f2e] text-slate-400 hover:text-white border border-[#1e293b]'
                  }`}
                  title="Upvote comment"
                >
                  <Heart className={`w-3 h-3 ${c.likedByMe ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>{c.likes || 0}</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pl-10 whitespace-pre-wrap">
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
