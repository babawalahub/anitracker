import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';
import http from 'node:http';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function fetchWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function request(currentUrl, hops) {
      if (hops > maxRedirects) {
        return resolve({ data: '', statusCode: 310 });
      }
      const client = currentUrl.startsWith('http:') ? http : https;
      const parsedUrl = new URL(currentUrl);

      const req = client.get({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, currentUrl).href;
          return request(redirectUrl, hops + 1);
        }
        let data = '';
        res.on('data', chunk => {
          data += chunk;
          if (data.length > 500000) { // Limit read to 500kb
            req.destroy();
            resolve({ data, statusCode: res.statusCode });
          }
        });
        res.on('end', () => resolve({ data, statusCode: res.statusCode }));
      });

      req.on('error', (err) => resolve({ data: '', statusCode: 500, error: err.message }));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve({ data: '', statusCode: 504 });
      });
    }

    request(url, 0);
  });
}

function driveMetadataPlugin() {
  return {
    name: 'drive-metadata-plugin',
    configureServer(server) {
      server.middlewares.use('/api/fetch-drive-title', async (req, res) => {
        const fullUrl = new URL(req.url, 'http://localhost:3000');
        let targetUrl = fullUrl.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'URL parameter required' }));
          return;
        }

        try {
          // Normalize Drive file preview URLs to view URLs for richer metadata tags
          if (targetUrl.includes('drive.google.com/file/d/')) {
            targetUrl = targetUrl.replace(/\/preview(\?.*)?$/i, '/view$1');
          }

          const { data, statusCode } = await fetchWithRedirects(targetUrl);

          const ogMatch = data.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
            data.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
          const twitterMatch = data.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);
          const itemPropMatch = data.match(/<meta\s+itemprop=["']name["']\s+content=["']([^"']+)["']/i);
          const titleMatch = data.match(/<title>([^<]+)<\/title>/i);

          let extracted = ogMatch ? ogMatch[1] :
            (twitterMatch ? twitterMatch[1] :
              (itemPropMatch ? itemPropMatch[1] :
                (titleMatch ? titleMatch[1] : '')));

          extracted = decodeHtmlEntities(extracted);
          extracted = extracted
            .replace(/\s*-\s*Google (?:Drive|Docs)\s*$/i, '')
            .replace(/^Google (?:Drive|Docs)\s*-\s*/i, '')
            .trim();

          // Reject error titles
          const lower = extracted.toLowerCase();
          const isErrorTitle = [
            'error 404', 'not found', '404', '403', 'access denied',
            'page not found', 'google drive', 'google docs', 'sign-in', 'sign in', 'login'
          ].some(errToken => lower === errToken || lower.startsWith(errToken));

          if (isErrorTitle) {
            extracted = '';
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ title: extracted, status: statusCode }));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // API 2: Fetch and detect all video episodes from a Google Drive folder URL
      server.middlewares.use('/api/fetch-drive-folder', async (req, res) => {
        const fullUrl = new URL(req.url, 'http://localhost:3000');
        let targetUrl = fullUrl.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'URL parameter required' }));
          return;
        }

        try {
          const folderMatch = targetUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
                              targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          const folderId = folderMatch ? folderMatch[1] : null;

          if (!folderId) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Could not extract Google Drive Folder ID' }));
            return;
          }

          // Try fetching both the standard folder URL and the embedded view
          const folderWebUrl = `https://drive.google.com/drive/folders/${folderId}`;
          const embedWebUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;

          const [folderRes, embedRes] = await Promise.all([
            fetchWithRedirects(folderWebUrl),
            fetchWithRedirects(embedWebUrl)
          ]);

          const combinedHtml = (folderRes.data || '') + '\n' + (embedRes.data || '');
          const isRestricted = (folderRes.statusCode === 404 || folderRes.statusCode === 403) &&
                               (embedRes.statusCode === 404 || embedRes.statusCode === 403);

          const episodes = [];
          const seenIds = new Set();

          // Strategy 1: Look for JSON bootstrap array format: ["FILE_ID", ["FILENAME.ext", ...]]
          const jsonRegex = /\["([a-zA-Z0-9_-]{25,})",\["([^"]+\.(?:mkv|mp4|webm|avi|mov|m4v))"/gi;
          let match;
          while ((match = jsonRegex.exec(combinedHtml)) !== null) {
            const fileId = match[1];
            const rawName = match[2];
            if (!seenIds.has(fileId)) {
              seenIds.add(fileId);
              episodes.push({ fileId, fileName: decodeHtmlEntities(rawName) });
            }
          }

          // Strategy 2: Look for data-id or href with video files
          if (episodes.length === 0) {
            const linkRegex = /href="https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{25,})\/[^"]*"[^>]*>([^<]+\.(?:mkv|mp4|webm|avi|mov))<\/a>/gi;
            while ((match = linkRegex.exec(combinedHtml)) !== null) {
              const fileId = match[1];
              const rawName = match[2];
              if (!seenIds.has(fileId)) {
                seenIds.add(fileId);
                episodes.push({ fileId, fileName: decodeHtmlEntities(rawName) });
              }
            }
          }

          if (episodes.length > 0) {
            // Natural sort episodes by episode number
            episodes.sort((a, b) => {
              const numA = (a.fileName.match(/(?:s\d+e|ep(?:isode)?\.?\s*|\bep\s*|\be)(\d+)/i) || a.fileName.match(/^(\d+)[\s.:-]/) || [, 999])[1];
              const numB = (b.fileName.match(/(?:s\d+e|ep(?:isode)?\.?\s*|\bep\s*|\be)(\d+)/i) || b.fileName.match(/^(\d+)[\s.:-]/) || [, 999])[1];
              return parseInt(numA, 10) - parseInt(numB, 10);
            });

            const formattedEpisodes = episodes.map((item, idx) => {
              const epMatch = item.fileName.match(/(?:s\d+e|ep(?:isode)?\.?\s*|\bep\s*|\be)(\d+)/i) ||
                              item.fileName.match(/^(\d+)[\s.:-]/);
              const epNum = epMatch ? parseInt(epMatch[1], 10) : (idx + 1);
              const cleanTitle = item.fileName.replace(/\.(mkv|mp4|webm|avi|mov|m4v)$/i, '').trim();
              return {
                epNum,
                title: cleanTitle,
                fileName: item.fileName,
                fileId: item.fileId,
                link: `https://drive.google.com/file/d/${item.fileId}/view`
              };
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              folderId,
              count: formattedEpisodes.length,
              episodes: formattedEpisodes
            }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            isRestricted,
            folderId,
            message: isRestricted
              ? "Google Drive folder is set to 'Restricted'. Please change sharing to 'Anyone with the link can view' to auto-detect all episodes."
              : "No video files found in Google Drive folder."
          }));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // API 3: Direct Video Stream Proxy for Google Drive (Bypasses iframes, ads, and doubleclick errors)
      server.middlewares.use('/api/stream-drive-video', (req, res) => {
        const fullUrl = new URL(req.url, 'http://localhost:3000');
        const fileId = fullUrl.searchParams.get('fileId');

        if (!fileId) {
          res.statusCode = 400;
          res.end('fileId required');
          return;
        }

        const driveStreamUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        if (req.headers.range) {
          headers.range = req.headers.range;
        }

        https.get(driveStreamUrl, { headers }, (driveRes) => {
          // If Google redirects with 302/303, follow redirect
          if (driveRes.statusCode >= 300 && driveRes.statusCode < 400 && driveRes.headers.location) {
            https.get(driveRes.headers.location, { headers }, (redirectRes) => {
              const forwardHeaders = {
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes'
              };
              if (redirectRes.headers['content-length']) forwardHeaders['Content-Length'] = redirectRes.headers['content-length'];
              if (redirectRes.headers['content-range']) forwardHeaders['Content-Range'] = redirectRes.headers['content-range'];
              res.writeHead(redirectRes.statusCode, forwardHeaders);
              redirectRes.pipe(res);
            }).on('error', () => { res.statusCode = 502; res.end('Proxy error'); });
            return;
          }

          const forwardHeaders = {
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes'
          };
          if (driveRes.headers['content-length']) forwardHeaders['Content-Length'] = driveRes.headers['content-length'];
          if (driveRes.headers['content-range']) forwardHeaders['Content-Range'] = driveRes.headers['content-range'];
          res.writeHead(driveRes.statusCode, forwardHeaders);
          driveRes.pipe(res);
        }).on('error', (err) => {
          res.statusCode = 500;
          res.end(err.message);
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), driveMetadataPlugin()],
  server: {
    port: 3000,
    open: false,
    host: true
  }
});
