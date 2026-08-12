# Kraken Display

A tiny, dependency-free web server for an NZXT Kraken LCD display. It pulls
one image from Danbooru every N minutes and serves a static page that shows
it, so the LCD's embedded browser only ever has to poll a local JSON file —
never Danbooru directly.

## Why this fixes your two bugs

**429 errors:** the Danbooru fetch runs on the *server's* own timer
(`setInterval`), not in response to anything the display does. So it fires
exactly once per interval, period — no matter how often the LCD polls,
reconnects, or reloads the page.

**Display not updating:** the page now explicitly compares the new image URL
against the last one it showed, and when it differs, sets `img.src` with a
cache-busting query string. That forces the embedded browser to actually
fetch and repaint the new image instead of assuming nothing changed.

## Setup

1. Install [Node.js](https://nodejs.org) 18 or later (needed for the
   built-in `fetch`). Nothing else — no `npm install` required.
2. Copy `config.example.json` to `config.json` and fill in your Danbooru
   username and API key:
   ```
   cp config.example.json config.json
   ```
3. Run it:
   ```
   node server.js
   ```
4. Point NZXT CAM's web display widget at `http://localhost:3000`.

`config.json` holds your credentials — don't commit it or share it.

## Settings

Edit `config.json` (or set the equivalent environment variable):

| config.json field | env var                   | default                    |
|--------------------|----------------------------|-----------------------------|
| `username`         | `DANBOORU_USERNAME`        | required                    |
| `apiKey`            | `DANBOORU_API_KEY`         | required                    |
| `tags`              | `DANBOORU_TAGS`             | `nero_claudius_(fate)`      |
| `intervalMinutes`  | `FETCH_INTERVAL_MINUTES`   | `20`                        |
| `port`              | `PORT`                      | `3000`                      |

Note: the current tag query has no rating filter, so results span
Danbooru's full rating range. If you'd rather constrain that, append a
rating tag, e.g. `"tags": "nero_claudius_(fate) rating:general"`. Tags
are appended as space-separated, as shown in the previous string.

## What happens when you power cycle

Every time `server.js` starts, it immediately re-fetches an image (with a
few short retries if the network isn't up yet) and then falls back to the
normal 20-minute timer — so a reboot naturally refreshes the display, it
doesn't break anything. It also saves the last image it fetched to
`last-image.json` and reloads that on startup, so the screen shows last
session's picture right away instead of sitting blank while the first
fetch is in flight.

One thing to check: items in the Windows Startup folder only run once you
**log in**, not at the moment the PC powers on. If this PC boots straight
to your desktop (auto-login enabled), you're fine. If it sits at a login
screen until you type a password, the server — and therefore the display
— won't start until you do that.

## Keeping it running in the background (Windows)

The simplest option is a small VBS wrapper so it starts silently with
Windows and doesn't leave a console window open:

1. `start-hidden.vbs` is already included in this folder — it pins its own
   folder as the working directory before launching `node`, so it'll find
   `server.js` no matter how Windows invokes it.
2. Press `Win+R`, type `shell:startup`, and drop a shortcut to
   `start-hidden.vbs` in that folder.

Since this launches with no visible window, there's no terminal to click
into afterward. To stop it: Task Manager (`Ctrl+Shift+Esc`) → **Details**
tab → find `node.exe` (add the **Command line** column via a right-click
on the header if you need to tell it apart from other Node processes) →
**End task**. To restart: double-click `start-hidden.vbs` again.

For something more robust — auto-restart if `node` ever crashes, no
dependence on someone being logged in — use Task Scheduler instead:

1. Open Task Scheduler → Create Task.
2. General tab: check "Run whether user is logged on or not."
3. Triggers tab: New → "At startup" (not "At log on").
4. Actions tab: New → Program `node.exe`, arguments `server.js`, "Start
   in" set to this folder's path.
5. Settings tab: check "If the task fails, restart every" and pick e.g.
   1 minute.

That combination survives both power cycles and the occasional crash
without you needing to do anything. [pm2](https://pm2.keymetrics.io/) or
[NSSM](https://nssm.cc/) are heavier alternatives if you want proper
service management and log rotation later, but Task Scheduler alone
covers the reliability you're asking about.

## Files

- `server.js` — the whole server: fetch timer + two HTTP routes
  (`/` and `/current-image.json`).
- `public/index.html` — the display page shown on the LCD.
- `config.example.json` — copy to `config.json` and fill in.