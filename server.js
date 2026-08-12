// server.js
//
// Minimal, dependency-free Node.js server for an NZXT Kraken image display.
// Fetches ONE image from Danbooru on a fixed timer (default: every 20 minutes)
// and serves it to the display via a tiny JSON endpoint + a static HTML page.
//
// Why this fixes the 429s: the Danbooru fetch happens on the server's own
// setInterval, completely decoupled from how often the display polls or
// reloads. No matter how chatty the LCD's embedded browser is, Danbooru
// only ever gets hit once per interval.
//
// Requires Node.js 18+ (for the built-in global `fetch`). No npm install
// needed.

const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------- Logging ----------
// Writes to the console AND to server.log, since this process is often
// launched with no visible console window (Task Scheduler, hidden VBS).
// server.log is the only way to see what happened on a given boot.
const LOG_PATH = path.join(__dirname, 'server.log');
function log(level, message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch (err) {
    // Nothing more we can do if the log file itself isn't writable.
  }
}

// ---------- Configuration ----------
// Loaded from config.json if present, otherwise from environment variables.
let fileConfig = {};
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    log('error', `Could not parse config.json: ${err.message}`);
  }
}

const CONFIG = {
  username: fileConfig.username || process.env.DANBOORU_USERNAME,
  apiKey: fileConfig.apiKey || process.env.DANBOORU_API_KEY,
  tags: fileConfig.tags || process.env.DANBOORU_TAGS || 'nero_claudius_(fate)',
  intervalMinutes: Number(fileConfig.intervalMinutes || process.env.FETCH_INTERVAL_MINUTES || 20),
  port: Number(fileConfig.port || process.env.PORT || 3000),
};

if (!CONFIG.username || !CONFIG.apiKey) {
  log('error',
    'Missing Danbooru credentials. Set them in config.json (copy config.example.json) ' +
    'or as environment variables DANBOORU_USERNAME / DANBOORU_API_KEY.'
  );
  process.exit(1);
}

const FETCH_INTERVAL_MS = CONFIG.intervalMinutes * 60 * 1000;
const LAST_IMAGE_PATH = path.join(__dirname, 'last-image.json');

// ---------- State ----------
// Seed from disk if we have it, so a fresh boot shows last session's image
// immediately instead of a blank screen while the first fetch is in flight.
let currentImage = { url: null, fetchedAt: null };
try {
  if (fs.existsSync(LAST_IMAGE_PATH)) {
    const saved = JSON.parse(fs.readFileSync(LAST_IMAGE_PATH, 'utf8'));
    if (saved && saved.url) {
      currentImage = saved;
      log('info', `Restored last known image from disk: ${currentImage.url}`);
    }
  }
} catch (err) {
  log('warn', `Could not read last-image.json, starting blank: ${err.message}`);
}

function persistCurrentImage() {
  try {
    fs.writeFileSync(LAST_IMAGE_PATH, JSON.stringify(currentImage));
  } catch (err) {
    log('warn', `Could not save last-image.json: ${err.message}`);
  }
}

// ---------- Danbooru fetch (runs on a timer, never on-demand from a client) ----------
async function fetchNewImage() {
  const url = new URL('https://danbooru.donmai.us/posts.json');
  url.searchParams.set('random', 'true');
  url.searchParams.set('limit', '1');
  url.searchParams.set('tags', CONFIG.tags);

  const authString = Buffer.from(`${CONFIG.username}:${CONFIG.apiKey}`).toString('base64');

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${authString}`,
        'User-Agent': `NZXTKrakenDisplay/1.0 (${CONFIG.username})`,
      },
    });

    if (response.status === 429) {
      log('warn', `Danbooru rate-limited us (429). Keeping current image, retrying in ${CONFIG.intervalMinutes}m.`);
      return;
    }
    if (!response.ok) {
      log('warn', `Danbooru returned ${response.status}. Keeping current image.`);
      return;
    }

    const data = await response.json();
    const post = Array.isArray(data) ? data[0] : null;

    if (post && post.file_url) {
      currentImage = { url: post.file_url, fetchedAt: Date.now() };
      persistCurrentImage();
      log('info', `New image set: ${currentImage.url}`);
    } else {
      log('warn', 'Response had no usable file_url. Keeping current image.');
    }
  } catch (err) {
    log('error', `Fetch failed: ${err.message}. Keeping current image.`);
  }
}

// On startup only: retry a few times with short gaps in case the network
// (Wi-Fi, DNS, etc.) isn't fully up yet moments after boot/login. This does
// NOT change steady-state behavior — once it succeeds (or gives up), we
// settle into exactly one fetch per FETCH_INTERVAL_MS, forever.
async function startupFetchWithRetry(maxAttempts = 5, delayMs = 20 * 1000) {
  const hadRestoredImage = Boolean(currentImage.url);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const before = currentImage.fetchedAt;
    await fetchNewImage();
    if (currentImage.fetchedAt !== before) return; // got a fresh one
    if (attempt < maxAttempts) {
      log('info', `Startup fetch attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  if (!hadRestoredImage) {
    log('warn', 'Could not get an initial image after multiple attempts. Will keep trying every interval.');
  }
}

startupFetchWithRetry();
setInterval(fetchNewImage, FETCH_INTERVAL_MS); // then strictly once per interval, forever

// ---------- HTTP server ----------
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  if (req.url === '/current-image.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(currentImage));
    return;
  }

  // Everything else: serve the static display page.
  fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Could not load index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
});

server.listen(CONFIG.port, () => {
  log('info', `--- Kraken display server started, listening on http://localhost:${CONFIG.port} ---`);
  log('info', `Fetching a new image every ${CONFIG.intervalMinutes} minute(s).`);
});