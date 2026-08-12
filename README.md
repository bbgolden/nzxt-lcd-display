# Kraken Display

A tiny, dependency-free web server for an NZXT Kraken LCD display. It pulls
one image from Danbooru every N minutes and serves a static page that shows
it, so the LCD's embedded browser only ever has to poll a local JSON file —
never Danbooru directly.

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

**Recommended: Task Scheduler.** Items in the Windows Startup folder are
deliberately delayed by Windows by an unpredictable amount (anywhere from
a few seconds to over a minute) to keep login responsive — so if CAM
tries to connect before your server has actually started, it fails, and
CAM won't retry on its own; you'd have to reload it manually. Task
Scheduler starts things immediately and consistently, and — unlike a
hidden VBS script — keeps a real history you can check if something
doesn't come up.

1. Open Task Scheduler → **Create Task**.
2. **General** tab: check **"Run whether user is logged on or not."**
3. **Triggers** tab: New → **"At startup"** (not **"At log on"** — this
   starts the server before user-session items like CAM even begin
   loading, so it wins the race).
4. **Actions** tab: New → Program `node.exe`, arguments `server.js`,
   "Start in" set to this folder's full path. Note that the "Start
   in" field does **NOT** accept quotation marks.
5. **Settings** tab: check **"If the task fails, restart every"** and
   pick something like 1 minute.

Alternatively, if you face struggles with priveleged access at startup,
change the **General** settings from **"Run whether user is logged on or not."** 
to **"Run only when user is logged on"** and the **Triggers** settings
from **"At startup"** to **"At log on"**. This has historically operated
properly, but has not been extensively tested for race conditions.

**NOTE:** Administrative access for the task is still an open feature, and
should be added when possible to categorically avoid race conditions.

If the display doesn't come up after a reboot, right-click the task in
Task Scheduler → **History** to see if/when it ran, and check
`server.log` in this folder (see below) to see what the server itself
was doing.

**Simpler alternative: Startup folder + `start-hidden.vbs`.** Included in
this folder — press `Win+R`, type `shell:startup`, and drop a shortcut to
it there. It's less code to set up, but given the timing issue above,
it's more likely to need a manual CAM refresh after a cold boot. Fine for
a quick test; Task Scheduler is the one to trust long-term.

Either way, there's no visible window once it's running. To stop it:
Task Manager (`Ctrl+Shift+Esc`) → **Details** tab → find `node.exe` (add
the **Command line** column via a right-click on the header if you need
to tell it apart from other Node processes) → **End task**.

## Checking what happened (`server.log`)

Every run appends timestamped lines to `server.log` in this folder —
fetch successes, rate-limit warnings, network errors, and a clear
`--- Kraken display server started ---` line each time it boots. Since
both the Task Scheduler and hidden-VBS methods run with no visible
console, this file is the only way to see what actually happened after
the fact. It's plain text — just open it. It grows slowly (one line per
boot, one per 20-minute fetch), so there's no cleanup needed, but you can
delete it anytime to clear it.

## Files

- `server.js` — the whole server: fetch timer + two HTTP routes
  (`/` and `/current-image.json`).
- `public/index.html` — the display page shown on the LCD.
- `config.example.json` — copy to `config.json` and fill in.