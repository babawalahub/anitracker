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

// Fetch Google Drive title from Drive URL via server proxy
export async function fetchDriveTitle(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = cleanUrl(rawUrl);
  if (!url) return null;

  // Check if filename is already contained in URL text
  const matchFile = url.match(/([^/\\&?]+)\.(?:mkv|mp4|webm|avi|mov)$/i);
  if (matchFile && matchFile[1]) {
    return decodeURIComponent(matchFile[1]).trim();
  }

  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
    return null;
  }

  try {
    const res = await fetch(`/api/fetch-drive-title?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        let clean = data.title.replace(/\.(mkv|mp4|webm|avi|mov)$/i, '').trim();
        const invalidTitles = ['error', 'not found', '404', '403', 'page not found', 'google drive', 'google docs', 'access denied', 'sign in', 'login'];
        const isBad = invalidTitles.some(token => clean.toLowerCase().includes(token));
        if (!isBad && clean.length > 0) {
          return clean;
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch Drive title:", err);
  }

  return null;
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
    // Check if line contains a Google Drive folder link
    if (line.includes('drive.google.com') && (line.includes('/folders/') || line.includes('folderview'))) {
      const match = line.match(/(https?:\/\/[^\s]+)/i);
      if (match) folderUrl = cleanUrl(match[1]);
    }

    const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      const rawUrl = urlMatch[1];
      const textWithoutUrl = line.replace(rawUrl, '').trim();

      // Look for episode number in line or title
      const sxxExx = line.match(/(?:s\d+e|ep(?:isode)?\.?\s*|\be)(\d+)\b/i);
      const leadingNum = textWithoutUrl.match(/^(\d+)[\s.:-]/);

      let epNum = currentAutoEp;
      if (sxxExx) {
        epNum = parseInt(sxxExx[1], 10);
      } else if (leadingNum) {
        epNum = parseInt(leadingNum[1], 10);
      }

      // Clean up title (remove trailing colons, dashes, pipes, and file extensions)
      let cleanTitle = textWithoutUrl
        .replace(/\.(mkv|mp4|webm|avi|mov)$/i, '')
        .replace(/^[:\s|,-]+|[:\s|,-]+$/g, '')
        .trim();

      if (!rawUrl.includes('/folders/') && !rawUrl.includes('folderview')) {
        links[epNum] = cleanUrl(rawUrl);
      }
      if (cleanTitle) {
        titles[epNum] = cleanTitle;
      }
      currentAutoEp = Math.max(currentAutoEp, epNum + 1);
    } else {
      // Plain text without URL (e.g. "Reincarnated as a Sword - S01E01.mkv" from Google Drive list)
      let cleanName = line.replace(/\.(mkv|mp4|webm|avi|mov)$/i, '').trim();
      if (cleanName) {
        const epMatchInName = cleanName.match(/(?:s\d+e|ep(?:isode)?\.?\s*|\bep\s*)(\d+)/i);
        const leadingNum = cleanName.match(/^(\d+)[\s.:-]/);
        const epNum = epMatchInName 
          ? parseInt(epMatchInName[1], 10) 
          : (leadingNum ? parseInt(leadingNum[1], 10) : currentAutoEp);

        titles[epNum] = cleanName;
        currentAutoEp = Math.max(currentAutoEp, epNum + 1);
      }
    }
  });

  return { links, titles, folderUrl };
}

// Backward-compatible alias
export function parseMultipleEpisodeLinks(text, startingEp = 1) {
  const { links } = parseMultipleVideoEntries(text, startingEp);
  return links;
}
