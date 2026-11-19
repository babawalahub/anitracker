// Helper to parse, transform, and detect video links (Google Drive, YouTube, MP4, etc.)

export function cleanUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // If user pasted an iframe tag, extract the src URL
  const iframeSrcMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    url = iframeSrcMatch[1].trim();
  }

  // Prepend https:// if protocol is missing
  if (/^(?:drive|docs)\.google\.com/i.test(url) || /^(?:www\.)?(?:youtube\.com|youtu\.be)/i.test(url)) {
    url = 'https://' + url;
  }

  return url;
}

// Clean series name and format standard episode titles (e.g. "Reincarnated as a Sword - S01E01")
export function formatEpisodeTitle(seriesName, episodeNum, customTitle) {
  const epStr = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;
  if (customTitle && customTitle.trim() && !customTitle.trim().toLowerCase().startsWith('episode')) {
    let clean = customTitle.replace(/\.(mkv|mp4|webm|avi|mov)$/i, '').trim();
    clean = clean.replace(/\||-$/i, '').trim();
    return clean;
  }
  const cleanSeries = seriesName ? seriesName.trim() : 'Anime';
  return `${cleanSeries} - S01E${epStr}`;
}

export function formatEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = cleanUrl(rawUrl);
  if (!url) return null;

  // 1. Google Drive Folder Link:
  // e.g. https://drive.google.com/drive/folders/1ABCXYZ...
  // e.g. https://drive.google.com/drive/u/0/folders/1ABCXYZ...
  // e.g. https://drive.google.com/embeddedfolderview?id=1ABCXYZ...
  if (url.includes('drive.google.com') && (url.includes('folders') || url.includes('folderview'))) {
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/) || 
                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
      const folderId = folderMatch[1];
      return {
        type: 'folder',
        embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
        originalUrl: url,
        folderId,
        source: 'Google Drive Folder'
      };
    }
  }

  // 2. Google Drive Single File Link:
  // e.g. https://drive.google.com/file/d/1ABCXYZ.../view?usp=sharing
  // e.g. https://drive.google.com/file/u/0/d/1ABCXYZ...
  // e.g. https://drive.google.com/open?id=1ABCXYZ...
  // e.g. https://drive.google.com/uc?id=1ABCXYZ...
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const fileIdMatch = url.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/) || 
                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                        url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return {
        type: 'drive_file',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: url,
        fileId,
        source: 'Google Drive Video'
      };
    }
  }

  // 3. YouTube Link:
  // e.g. https://www.youtube.com/watch?v=ABCXYZ or https://youtu.be/ABCXYZ or embed/ABCXYZ
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const ytMatch = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`,
        originalUrl: url,
        source: 'YouTube'
      };
    }
  }

  // 4. Direct HTML5 Video (.mp4, .webm, .ogg, .m3u8)
  const isDirectVideo = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url);
  if (isDirectVideo) {
    return {
      type: 'video',
      embedUrl: url,
      originalUrl: url,
      source: 'Direct Video'
    };
  }

  // 5. Generic Iframe / Stream Embed
  return {
    type: 'iframe',
    embedUrl: url,
    originalUrl: url,
    source: 'External Stream'
  };
}

// Parses multiline or bulk text to extract multiple episode links and their titles
// Supports URLs AND plain file names (e.g. from Google Drive folder lists)
export function parseMultipleVideoEntries(text, startingEp = 1) {
  if (!text || typeof text !== 'string') return { links: {}, titles: {}, folderUrl: null };
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const links = {};
  const titles = {};
  let folderUrl = null;
  let currentAutoEp = startingEp;

  lines.forEach((line) => {
    // Check if line is a Google Drive folder link
    if (line.includes('drive.google.com') && (line.includes('/folders/') || line.includes('folderview'))) {
      const cleaned = cleanUrl(line.match(/(https?:\/\/[^\s]+)/i)?.[1] || line);
      if (cleaned) {
        folderUrl = cleaned;
      }
    }

    // Pattern 1: "Episode 1 - Title: https://..." or "Ep 1: Title - https://..."
    const epWithTitleMatch = line.match(/(?:ep(?:isode)?\.?\s*(\d+)|\b(\d+)\s*[:.-])\s*([^:|\n]+?)\s*[:|-]\s*(https?:\/\/[^\s]+)/i);
    if (epWithTitleMatch) {
      const epNum = parseInt(epWithTitleMatch[1] || epWithTitleMatch[2], 10);
      const title = epWithTitleMatch[3]?.trim();
      const rawUrl = epWithTitleMatch[4];
      if (epNum && rawUrl) {
        links[epNum] = cleanUrl(rawUrl);
        if (title) titles[epNum] = title;
        currentAutoEp = Math.max(currentAutoEp, epNum + 1);
        return;
      }
    }

    // Pattern 2: "Title | https://..."
    const pipeMatch = line.match(/^([^|]+)\|\s*(https?:\/\/[^\s]+)/i);
    if (pipeMatch) {
      const title = pipeMatch[1]?.trim();
      const rawUrl = pipeMatch[2];
      if (rawUrl) {
        links[currentAutoEp] = cleanUrl(rawUrl);
        if (title) titles[currentAutoEp] = title;
        currentAutoEp++;
        return;
      }
    }

    // Pattern 3: Standard "Episode 1: https://..." or "1. https://..."
    const epMatch = line.match(/(?:ep(?:isode)?\.?\s*(\d+)|\b(\d+)\s*[:.-])\s*(https?:\/\/[^\s]+)/i);
    if (epMatch) {
      const epNum = parseInt(epMatch[1] || epMatch[2], 10);
      const rawUrl = epMatch[3];
      if (epNum && rawUrl) {
        links[epNum] = cleanUrl(rawUrl);
        currentAutoEp = Math.max(currentAutoEp, epNum + 1);
        return;
      }
    }

    // Pattern 4: Raw URL on line
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      const rawUrl = urlMatch[1];
      links[currentAutoEp] = cleanUrl(rawUrl);
      currentAutoEp++;
      return;
    }

    // Pattern 5: Plain file name (e.g. "Reincarnated as a Sword - S01E01.mkv" from Google Drive list)
    let cleanName = line.replace(/\.(mkv|mp4|webm|avi|mov)$/i, '').trim();
    if (cleanName) {
      const epMatchInName = cleanName.match(/(?:s\d+e|ep(?:isode)?\.?\s*|\bep\s*)(\d+)/i);
      const epNum = epMatchInName ? parseInt(epMatchInName[1], 10) : currentAutoEp;
      titles[epNum] = cleanName;
      currentAutoEp = Math.max(currentAutoEp, epNum + 1);
    }
  });

  return { links, titles, folderUrl };
}

// Backward-compatible alias
export function parseMultipleEpisodeLinks(text, startingEp = 1) {
  const { links } = parseMultipleVideoEntries(text, startingEp);
  return links;
}
