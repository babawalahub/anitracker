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
