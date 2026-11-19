// Helper to parse, transform, and detect video links (Google Drive, YouTube, MP4, etc.)

export function formatEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();

  // 1. Google Drive Link:
  // e.g. https://drive.google.com/file/d/1ABCXYZ.../view?usp=sharing
  // e.g. https://drive.google.com/open?id=1ABCXYZ...
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return {
        type: 'iframe',
        embedUrl: `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`,
        originalUrl: url,
        source: 'Google Drive'
      };
    }
  }

  // 2. YouTube Link:
  // e.g. https://www.youtube.com/watch?v=ABCXYZ or https://youtu.be/ABCXYZ
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const ytMatch = url.match(/(?:youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]+)/);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'iframe',
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
        originalUrl: url,
        source: 'YouTube'
      };
    }
  }

  // 3. Direct HTML5 Video (.mp4, .webm, .ogg)
  const isDirectVideo = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url);
  if (isDirectVideo) {
    return {
      type: 'video',
      embedUrl: url,
      originalUrl: url,
      source: 'Direct Video'
    };
  }

  // 4. Generic Iframe / Stream Embed
  return {
    type: 'iframe',
    embedUrl: url,
    originalUrl: url,
    source: 'External Stream'
  };
}

// Parses multiline or comma separated text to extract multiple episode links
// e.g.:
// Episode 1: https://drive.google.com/file/d/1...
// Episode 2: https://drive.google.com/file/d/2...
// or simply links separated by newlines
export function parseMultipleEpisodeLinks(text, startingEp = 1) {
  if (!text) return {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = {};

  let currentAutoEp = startingEp;

  lines.forEach((line) => {
    // Check if line specifies an episode number, e.g. "Ep 1: https..." or "Episode 2 - https..." or "1. https..."
    const epMatch = line.match(/(?:ep(?:isode)?\.?\s*(\d+)|\b(\d+)\s*[:.-])\s*(https?:\/\/[^\s]+)/i);
    if (epMatch) {
      const epNum = parseInt(epMatch[1] || epMatch[2], 10);
      const url = epMatch[3];
      if (epNum && url) {
        result[epNum] = url;
        currentAutoEp = Math.max(currentAutoEp, epNum + 1);
        return;
      }
    }

    // Otherwise, check if the line contains a raw URL
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      result[currentAutoEp] = urlMatch[1];
      currentAutoEp++;
    }
  });

  return result;
}
