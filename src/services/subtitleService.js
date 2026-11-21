// Subtitle Service: Parsing, Online Auto-Fetching, and Real-Time Multi-Language Translation

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'id', name: 'Indonesian (Bahasa)', flag: '🇮🇩' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)', flag: '🇻🇳' },
  { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇧🇩' },
  { code: 'ur', name: 'Urdu (اردو)', flag: '🇵🇰' }
];

// Helper: Convert timestamp (00:01:23,456 or 01:23.456) to total seconds
export function parseTimestamp(timeStr) {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace(',', '.');
  const parts = cleaned.split(':');
  
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseFloat(cleaned) || 0;
}

// Parses SRT or VTT content into an array of { id, start, end, text }
export function parseSrtOrVtt(subText) {
  if (!subText || typeof subText !== 'string') return [];
  
  // Normalize line endings
  const normalized = subText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\n+/);
  const cues = [];

  blocks.forEach((block, index) => {
    const lines = block.trim().split('\n');
    if (!lines || lines.length < 2) return;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) return;

    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split('-->');
    if (timeParts.length < 2) return;

    const start = parseTimestamp(timeParts[0]);
    // Strip positioning metadata from VTT end time (e.g. line:0 position:20%)
    const endRaw = timeParts[1].trim().split(' ')[0];
    const end = parseTimestamp(endRaw);

    const textLines = lines.slice(timeLineIndex + 1);
    const rawText = textLines.join('\n').replace(/<[^>]*>/g, '').trim();

    if (rawText && end > start) {
      cues.push({
        id: index + 1,
        start,
        end,
        text: rawText
      });
    }
  });

  return cues.sort((a, b) => a.start - b.start);
}

// Translate a single text string using Google Translate free endpoint
export async function translateText(text, targetLang = 'en') {
  if (!text || !targetLang || targetLang === 'original') return text;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Translation status: ${res.status}`);
    const data = await res.json();
    
    if (data && data[0]) {
      const translated = data[0].map(item => item[0]).filter(Boolean).join('');
      return translated || text;
    }
    return text;
  } catch (err) {
    console.warn("Translation failed, returning original text:", err);
    return text;
  }
}

// Translate an array of subtitle cues in fast parallel batches
export async function translateCues(cues, targetLang = 'en', onProgress) {
  if (!cues || cues.length === 0 || !targetLang || targetLang === 'original') {
    return cues;
  }

  const translatedCues = [];
  const BATCH_SIZE = 10;
  const total = cues.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = cues.slice(i, i + BATCH_SIZE);
    
    // Join chunk lines with a unique delimiter for 1 fast HTTP request instead of 10
    const delimiter = '\n---CUE---\n';
    const combinedText = chunk.map(c => c.text).join(delimiter);

    try {
      const translatedCombined = await translateText(combinedText, targetLang);
      const translatedParts = translatedCombined.split(/---CUE---|--- cue ---/i);

      chunk.forEach((cue, idx) => {
        const transText = translatedParts[idx]?.trim() || cue.text;
        translatedCues.push({
          ...cue,
          text: transText
        });
      });
    } catch {
      // If batch fails, keep original
      chunk.forEach(c => translatedCues.push({ ...c }));
    }

    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100)));
    }
  }

  return translatedCues;
}

// Subtitles: Supports custom .SRT / .VTT uploads and real-time multi-language AI translation
export async function autoFetchInternetSubtitles(animeTitle, episodeNum = 1) {
  // Returns empty array by default to avoid CORS errors from dead external APIs
  // and prevent fake subtitles from displaying over videos
  return [];
}
