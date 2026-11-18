// Local storage tracker with reactive event dispatching for UI sync

const STORAGE_KEY = 'anitrack_user_lists_v1';

export const TRACKING_STATUS = {
  CURRENT: 'CURRENT',     // Watching / Reading
  COMPLETED: 'COMPLETED',
  PLANNING: 'PLANNING',   // Plan to watch / read
  PAUSED: 'PAUSED',
  DROPPED: 'DROPPED',
};

export const STATUS_LABELS = {
  CURRENT: 'Watching / Reading',
  COMPLETED: 'Completed',
  PLANNING: 'Plan to Watch',
  PAUSED: 'Paused',
  DROPPED: 'Dropped',
};

export function getStoredLists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse stored lists:", e);
    return {};
  }
}

export function saveStoredLists(lists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    // Dispatch custom event so all components react immediately
    window.dispatchEvent(new CustomEvent('anitrack:lists-updated', { detail: lists }));
  } catch (e) {
    console.error("Failed to save lists to localStorage:", e);
  }
}

export function getEntry(mediaId) {
  if (mediaId === undefined || mediaId === null) return null;
  const lists = getStoredLists();
  return lists[String(mediaId)] || lists[Number(mediaId)] || null;
}

export function upsertEntry(media, entryData = {}) {
  const lists = getStoredLists();
  const mediaId = String(media.id || media.mediaId);
  const existing = lists[mediaId] || {};

  const parsedProgress = entryData.progress !== undefined 
    ? (parseInt(entryData.progress, 10) || 0) 
    : (parseInt(existing.progress, 10) || 0);

  const parsedScore = entryData.score !== undefined 
    ? (parseFloat(entryData.score) || 0) 
    : (parseFloat(existing.score) || 0);

  const maxEpisodes = media.episodes !== undefined 
    ? media.episodes 
    : (existing.maxEpisodes !== undefined ? existing.maxEpisodes : media.maxEpisodes);

  const maxChapters = media.chapters !== undefined 
    ? media.chapters 
    : (existing.maxChapters !== undefined ? existing.maxChapters : media.maxChapters);

  const updated = {
    ...existing,
    mediaId,
    type: media.type || existing.type || 'ANIME',
    title: media.title || existing.title,
    coverImage: media.coverImage || existing.coverImage,
    format: media.format || existing.format,
    maxEpisodes,
    maxChapters,
    duration: media.duration || existing.duration || 24,
    status: entryData.status || existing.status || TRACKING_STATUS.CURRENT,
    progress: Math.max(0, parsedProgress),
    score: Math.max(0, Math.min(10, parsedScore)),
    notes: entryData.notes !== undefined ? entryData.notes : (existing.notes || ''),
    updatedAt: new Date().toISOString(),
    genres: media.genres || existing.genres || []
  };

  // Auto-complete if progress reaches max episodes
  const max = updated.type === 'ANIME' ? updated.maxEpisodes : updated.maxChapters;
  if (max && updated.progress >= max && updated.status === TRACKING_STATUS.CURRENT) {
    updated.status = TRACKING_STATUS.COMPLETED;
    updated.progress = max;
  }

  lists[mediaId] = updated;
  saveStoredLists(lists);
  return updated;
}

export function deleteEntry(mediaId) {
  const lists = getStoredLists();
  const idStr = String(mediaId);
  if (lists[idStr]) {
    delete lists[idStr];
    saveStoredLists(lists);
    return true;
  }
  return false;
}

export function exportDataAsJson() {
  const lists = getStoredLists();
  const blob = new Blob([JSON.stringify(lists, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `anitrack-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function importDataFromJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) throw new Error("Invalid format");
    saveStoredLists(parsed);
    return { success: true, count: Object.keys(parsed).length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function computeUserStats() {
  const lists = getStoredLists();
  const entries = Object.values(lists);

  const animeEntries = entries.filter(e => e.type === 'ANIME');
  const mangaEntries = entries.filter(e => e.type === 'MANGA');

  let totalEpisodesWatched = 0;
  let totalChaptersRead = 0;
  let totalScoreSum = 0;
  let scoredCount = 0;
  let totalMinutesWatched = 0;
  const genreCounts = {};

  entries.forEach(entry => {
    const scoreVal = parseFloat(entry.score) || 0;
    if (scoreVal > 0) {
      totalScoreSum += scoreVal;
      scoredCount++;
    }

    if (entry.genres && Array.isArray(entry.genres)) {
      entry.genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }

    if (entry.type === 'ANIME') {
      const eps = parseInt(entry.progress, 10) || 0;
      totalEpisodesWatched += eps;
      totalMinutesWatched += eps * (entry.duration || 24);
    } else {
      totalChaptersRead += (parseInt(entry.progress, 10) || 0);
    }
  });

  const totalDaysWatched = (totalMinutesWatched / (60 * 24)).toFixed(1);
  const meanScore = scoredCount > 0 ? (totalScoreSum / scoredCount).toFixed(1) : 0;

  return {
    totalEntries: entries.length,
    animeCount: animeEntries.length,
    mangaCount: mangaEntries.length,
    totalEpisodesWatched,
    totalChaptersRead,
    totalDaysWatched,
    meanScore,
    genreCounts,
    statusBreakdown: {
      CURRENT: entries.filter(e => e.status === TRACKING_STATUS.CURRENT).length,
      COMPLETED: entries.filter(e => e.status === TRACKING_STATUS.COMPLETED).length,
      PLANNING: entries.filter(e => e.status === TRACKING_STATUS.PLANNING).length,
      PAUSED: entries.filter(e => e.status === TRACKING_STATUS.PAUSED).length,
      DROPPED: entries.filter(e => e.status === TRACKING_STATUS.DROPPED).length,
    }
  };
}
