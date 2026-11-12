# GTA 6 Spoiler Shield

A Chrome extension that hides GTA 6 spoilers on **YouTube, Reddit, X, Twitch and Discord (web)** until you're ready.

## What it does
- **Hides matching posts, videos, comments and chat messages.** Each one collapses behind a "Show anyway" bar, or you can set it to remove them completely.
- **Covers whole pages that are about GTA 6** (a GTA 6 video, subreddit, Twitch stream or search) with a "Get me out of here" screen, and pauses the video.
- **Blurs stray links and titles** in sidebars and suggestions. Click once to reveal one.
- **Shows a count** of hidden items on the toolbar icon.

Default blocked words: `gta 6`, `gta vi`, `grand theft auto 6/vi`, `jason duval`, `lucia caminos`, `jason and lucia`, `leonida`, `vice city`.
Spacing and dashes don't matter, so `gta 6` also catches `GTA6`, `GTA-6` and `#gta6`. Look-alikes such as `gta 60fps` and `gta vibes` aren't blocked.
You can edit the list from the extension popup.

## Install
1. Download this repo (Code → Download ZIP) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.
4. Pin it from the puzzle-piece menu.

## Limits
- It only matches text, so an image or clip with no GTA words in its caption can still get through.
- It doesn't cover the Discord desktop app (use Discord in the browser) or phone apps.
