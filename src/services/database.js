import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredLists, saveStoredLists } from './storage';

// ─── CLOUD SYNC ───────────────────────────────────────────────────────────────

export async function pushLocalListToCloud(userId) {
  if (!isSupabaseConfigured()) return;
  const local = getStoredLists();
  const entries = Object.values(local);
  if (entries.length === 0) return;

  const rows = entries.map(e => ({
    user_id: userId,
    media_id: parseInt(e.mediaId, 10),
    media_type: e.type || 'ANIME',
    title_english: e.title?.english || null,
    title_romaji: e.title?.romaji || null,
    title_native: e.title?.native || null,
    cover_image: e.coverImage?.large || e.coverImage?.medium || null,
    format: e.format || null,
    max_episodes: e.maxEpisodes || null,
    max_chapters: e.maxChapters || null,
    status: e.status,
    progress: parseInt(e.progress, 10) || 0,
    score: parseFloat(e.score) || 0,
    notes: e.notes || '',
    genres: e.genres || [],
    updated_at: e.updatedAt || new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_media_lists')
    .upsert(rows, { onConflict: 'user_id,media_id' });

  if (error) console.error('Cloud sync error:', error);
}

export async function pullCloudListToLocal(userId) {
  if (!isSupabaseConfigured()) return {};
  const { data, error } = await supabase
    .from('user_media_lists')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return {};

  const lists = {};
  data.forEach(row => {
    const id = String(row.media_id);
    lists[id] = {
      mediaId: id,
      type: row.media_type,
      title: {
        english: row.title_english,
        romaji: row.title_romaji,
        native: row.title_native,
      },
      coverImage: { large: row.cover_image, medium: row.cover_image },
      format: row.format,
      maxEpisodes: row.max_episodes,
      maxChapters: row.max_chapters,
      status: row.status,
      progress: row.progress,
      score: row.score,
      notes: row.notes,
      genres: row.genres || [],
      updatedAt: row.updated_at,
    };
  });

  saveStoredLists(lists);
  return lists;
}

export async function upsertCloudEntry(userId, entry) {
  if (!isSupabaseConfigured() || !userId) return;
  const { error } = await supabase.from('user_media_lists').upsert({
    user_id: userId,
    media_id: parseInt(entry.mediaId, 10),
    media_type: entry.type || 'ANIME',
    title_english: entry.title?.english || null,
    title_romaji: entry.title?.romaji || null,
    title_native: entry.title?.native || null,
    cover_image: entry.coverImage?.large || entry.coverImage?.medium || null,
    format: entry.format || null,
    max_episodes: entry.maxEpisodes || null,
    max_chapters: entry.maxChapters || null,
    status: entry.status,
    progress: parseInt(entry.progress, 10) || 0,
    score: parseFloat(entry.score) || 0,
    notes: entry.notes || '',
    genres: entry.genres || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,media_id' });

  if (error) console.error('Cloud upsert error:', error);
}

export async function deleteCloudEntry(userId, mediaId) {
  if (!isSupabaseConfigured() || !userId) return;
  await supabase
    .from('user_media_lists')
    .delete()
    .eq('user_id', userId)
    .eq('media_id', parseInt(mediaId, 10));
}

// ─── COMMUNITY DATA ───────────────────────────────────────────────────────────

export async function getCommunityRankings() {
  if (!isSupabaseConfigured()) return { popular: [], topRated: [], recentActivity: [] };

  // Most tracked media
  const { data: popularData } = await supabase
    .from('user_media_lists')
    .select('media_id, media_type, title_english, title_romaji, cover_image, format, status')
    .neq('status', 'DROPPED');

  // Aggregate popularity
  const countMap = {};
  const scoreMap = {};
  const scoreCountMap = {};
  (popularData || []).forEach(row => {
    const key = row.media_id;
    countMap[key] = (countMap[key] || 0) + 1;
    if (!scoreMap[key]) {
      scoreMap[key] = { sum: 0, count: 0, ...row };
    }
    scoreMap[key].sum = (scoreMap[key].sum || 0);
    scoreMap[key].count = countMap[key];
    scoreMap[key].title_english = row.title_english;
    scoreMap[key].title_romaji = row.title_romaji;
    scoreMap[key].cover_image = row.cover_image;
    scoreMap[key].format = row.format;
    scoreMap[key].media_type = row.media_type;
  });

  // Avg scores
  const { data: scoreData } = await supabase
    .from('user_media_lists')
    .select('media_id, score')
    .gt('score', 0);

  const avgScores = {};
  const tempCounts = {};
  (scoreData || []).forEach(row => {
    if (!avgScores[row.media_id]) { avgScores[row.media_id] = 0; tempCounts[row.media_id] = 0; }
    avgScores[row.media_id] += parseFloat(row.score);
    tempCounts[row.media_id]++;
  });
  Object.keys(avgScores).forEach(id => {
    avgScores[id] = (avgScores[id] / tempCounts[id]).toFixed(1);
  });

  const popular = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id, count]) => ({
      mediaId: id,
      count,
      avgScore: avgScores[id] || 0,
      ...scoreMap[id],
    }));

  const topRated = Object.entries(avgScores)
    .filter(([id]) => (tempCounts[id] || 0) >= 2)
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
    .slice(0, 12)
    .map(([id, score]) => ({
      mediaId: id,
      avgScore: score,
      count: countMap[id] || 0,
      ...scoreMap[id],
    }));

  // Recent activity
  const { data: recentData } = await supabase
    .from('user_media_lists')
    .select('*, profiles(username, avatar_url)')
    .order('updated_at', { ascending: false })
    .limit(20);

  return { popular, topRated, recentActivity: recentData || [] };
}

// ─── SQL to run in Supabase SQL Editor ────────────────────────────────────────
export const SUPABASE_SETUP_SQL = `
-- Run this in your Supabase project SQL Editor

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

create table if not exists user_media_lists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  media_id integer not null,
  media_type text not null,
  title_english text,
  title_romaji text,
  title_native text,
  cover_image text,
  format text,
  max_episodes integer,
  max_chapters integer,
  status text not null default 'PLANNING',
  progress integer default 0,
  score numeric(4,1) default 0,
  notes text,
  genres text[] default '{}',
  updated_at timestamptz default now(),
  unique(user_id, media_id)
);

alter table profiles enable row level security;
alter table user_media_lists enable row level security;

create policy "Profiles viewable by all" on profiles for select using (true);
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);

create policy "Lists viewable by all" on user_media_lists for select using (true);
create policy "Users manage own lists" on user_media_lists for all using (auth.uid() = user_id);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
`;
