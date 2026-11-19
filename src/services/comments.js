// Comments & Discussion service with local storage and optional Supabase sync
import { supabase, isSupabaseConfigured } from './supabase';

const COMMENTS_STORAGE_KEY = 'anitrack_comments_v1';

export function getLocalComments() {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load comments:", e);
    return {};
  }
}

export function saveLocalComments(commentsMap) {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(commentsMap));
    window.dispatchEvent(new CustomEvent('anitrack:comments-updated', { detail: commentsMap }));
  } catch (e) {
    console.error("Failed to save comments:", e);
  }
}

// Sample starter comments so the community feels lively right away
const DEFAULT_SAMPLE_COMMENTS = {
  16498: [ // Attack on Titan
    {
      id: 'c-aot-1',
      username: 'ErenJaegerFan',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eren',
      text: 'One of the greatest anime ever made. The story progression and plot twists are unparalleled!',
      rating: 10,
      createdAt: '2026-11-15T12:00:00Z',
      likes: 24,
      likedByMe: false
    },
    {
      id: 'c-aot-2',
      username: 'LeviSquad_Captain',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Levi',
      text: 'Episode 17 animation by WIT Studio still gives me chills every single time.',
      rating: 9.5,
      createdAt: '2026-11-17T18:30:00Z',
      likes: 18,
      likedByMe: false
    }
  ],
  154587: [ // Frieren
    {
      id: 'c-frieren-1',
      username: 'MageHimmel',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Himmel',
      text: 'Masterpiece. The pacing, emotional depth, and magic tournament arc were phenomenal.',
      rating: 10,
      createdAt: '2026-11-18T10:15:00Z',
      likes: 31,
      likedByMe: false
    }
  ]
};

export async function fetchComments(mediaId) {
  const mId = String(mediaId);
  const local = getLocalComments();
  let list = local[mId] || DEFAULT_SAMPLE_COMMENTS[mId] || [];

  // If Supabase is configured, fetch from cloud
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('media_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('media_id', parseInt(mediaId, 10))
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const cloudFormatted = data.map(item => ({
          id: item.id,
          userId: item.user_id,
          username: item.profiles?.username || item.author_name || 'AnimeFan',
          avatar: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user_id}`,
          text: item.comment_text,
          rating: item.rating,
          episode: item.episode,
          createdAt: item.created_at,
          likes: item.likes_count || 0,
        }));
        return cloudFormatted;
      }
    } catch (err) {
      console.warn("Could not fetch cloud comments, using local:", err);
    }
  }

  return list;
}

export async function postComment(mediaId, { user, username, avatar, text, rating, episode }) {
  const mId = String(mediaId);
  const local = getLocalComments();
  const currentList = local[mId] || DEFAULT_SAMPLE_COMMENTS[mId] || [];

  const newComment = {
    id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    userId: user?.id || null,
    username: username || 'AnimeFan',
    avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'guest'}`,
    text: text.trim(),
    rating: rating ? parseFloat(rating) : null,
    episode: episode ? parseInt(episode, 10) : null,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedByMe: false
  };

  const updatedList = [newComment, ...currentList];
  local[mId] = updatedList;
  saveLocalComments(local);

  // Sync to Supabase if configured
  if (isSupabaseConfigured() && user) {
    try {
      await supabase.from('media_comments').insert({
        media_id: parseInt(mediaId, 10),
        user_id: user.id,
        author_name: username,
        comment_text: text.trim(),
        rating: rating ? parseFloat(rating) : null,
        episode: episode ? parseInt(episode, 10) : null
      });
    } catch (err) {
      console.error("Failed to post comment to cloud:", err);
    }
  }

  return newComment;
}

export function toggleLikeComment(mediaId, commentId) {
  const mId = String(mediaId);
  const local = getLocalComments();
  const currentList = local[mId] || DEFAULT_SAMPLE_COMMENTS[mId] || [];

  const updated = currentList.map(c => {
    if (c.id === commentId) {
      const isLiked = !c.likedByMe;
      return {
        ...c,
        likedByMe: isLiked,
        likes: Math.max(0, (c.likes || 0) + (isLiked ? 1 : -1))
      };
    }
    return c;
  });

  local[mId] = updated;
  saveLocalComments(local);
  return updated;
}
