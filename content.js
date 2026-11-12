(function () {
  "use strict";
  if (window.__gsbLoaded) return;
  window.__gsbLoaded = true;

  var host = location.hostname;

  // Per-site "card" selectors: the whole post/video/message gets hidden as one unit.
  // text: optional child selector to read text from (so a parent comment isn't hidden for a reply's text).
  // remove: hide without a "show" bar (used inside the video player, where a bar would look broken).
  var SITE_RULES = {
    youtube: [
      { sel: "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-renderer, ytd-compact-playlist-renderer, ytd-radio-renderer, ytd-compact-radio-renderer, ytd-reel-item-renderer, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, yt-lockup-view-model, ytd-post-renderer, ytd-backstage-post-thread-renderer, ytd-notification-renderer, ytd-channel-renderer, ytd-movie-renderer" },
      { sel: "ytd-comment-view-model, ytd-comment-renderer" },
      { sel: "yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer" },
      { sel: ".ytp-videowall-still, .ytp-ce-element, .ytp-autonav-endscreen-upnext-container, .ytp-suggestion-set, .ytp-modern-videowall-still", remove: true }
    ],
    reddit: [
      { sel: "shreddit-post, faceplate-tracker[noun='post'], search-telemetry-tracker[view-events*='post'], [data-testid='search-post-unit'], [data-testid='search-sdui-post']" },
      { sel: "shreddit-comment", text: ":scope > [slot='comment']" },
      { sel: "reddit-pdp-right-rail-post, community-highlight-card, [data-testid='trending-search-item'], li[role='presentation'] faceplate-tracker" },
      // old.reddit.com
      { sel: ".thing.link" },
      { sel: ".thing.comment", text: ":scope > .entry" }
    ],
    x: [
      { sel: "article[data-testid='tweet']" },
      { sel: "[data-testid='trend'], [data-testid='UserCell'], [data-testid='typeaheadResult'], [data-testid='TypeaheadListItem']" }
    ],
    twitch: [
      { sel: "[data-a-target='chat-line-message'], .chat-line__message, .vod-message, .seventv-message" },
      { sel: "article, .side-nav-card, [data-a-target='followed-channel'], [data-a-target='recommended-channel'], [data-a-target='side-nav-card']" },
      { sel: "[data-a-target='search-result-live-channel'], [data-a-target='search-result-category'], [data-a-target='search-result-video'], .search-result-card" }
    ],
    discord: [
      { sel: "li[id^='chat-messages-']" },
      { sel: "[class*='mainCard_'], [class*='forumPost_'], [class*='autocompleteRow_']" }
    ]
  };

  var site =
    /(^|\.)youtube\.com$/.test(host) ? "youtube" :
    /(^|\.)reddit\.com$/.test(host) ? "reddit" :
    /(^|\.)(x|twitter)\.com$/.test(host) ? "x" :
    /(^|\.)twitch\.tv$/.test(host) ? "twitch" :
    /(^|\.)discord\.com$/.test(host) ? "discord" : null;
  if (!site) return;

  var rules = SITE_RULES[site];
  var allCardSel = rules.map(function (r) { return r.sel; }).join(", ");

  var settings = Object.assign({}, GSB_DEFAULTS);
  var regex = gsbBuildRegex(settings.keywords);

  var lastKey = new WeakMap();        // element -> text it was last judged on
  var placeholders = new Map();       // hidden element -> its "show" bar
  var hiddenCount = 0;

  // ---------- text helpers ----------
  var ATTRS = ["title", "aria-label", "alt", "post-title", "subreddit-prefixed-name", "subreddit-name", "data-title", "label"];

  function attrText(el) {
    var out = "";
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute && el.getAttribute(ATTRS[i]);
      if (v) out += " " + v;
    }
    return out;
  }

  function cardText(el, rule) {
    var src = el;
    if (rule.text) {
      try { src = el.querySelector(rule.text) || el; } catch (e) { src = el; }
    }
    var t = (src.textContent || "") + attrText(el);
    // titles/alt text on links, thumbnails and images inside the card
    var inner = src.querySelectorAll("a[title], a[aria-label], img[alt], [aria-label], [title], #video-title");
    for (var i = 0; i < inner.length && i < 60; i++) {
      if (inner[i].closest("[data-gsb-ph]")) continue;
      t += attrText(inner[i]);
    }
    return t;
  }

  // ---------- hide / reveal ----------
  function makePlaceholder(el) {
    var bar = document.createElement("div");
    bar.className = "gsb-ph";
    bar.setAttribute("data-gsb-ph", "1");
    var label = document.createElement("span");
    label.className = "gsb-ph-label";
    label.textContent = "\u{1F6E1}️ Possible spoiler hidden";
    var btn = document.createElement("button");
    btn.className = "gsb-ph-btn";
    btn.type = "button";
    btn.textContent = "Show anyway";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      reveal(el);
    }, true);
    bar.appendChild(label);
    bar.appendChild(btn);
    return bar;
  }

  function hide(el, rule) {
    if (el.getAttribute("data-gsb") === "hidden") return;
    el.setAttribute("data-gsb", "hidden");
    hiddenCount++;
    if (settings.mode === "placeholder" && !rule.remove) {
      var bar = makePlaceholder(el);
      placeholders.set(el, bar);
      try { el.before(bar); } catch (e) {}
    }
  }

  function unhide(el) {
    if (el.getAttribute("data-gsb") === "hidden") hiddenCount = Math.max(0, hiddenCount - 1);
    el.removeAttribute("data-gsb");
    var bar = placeholders.get(el);
    if (bar) { bar.remove(); placeholders.delete(el); }
  }

  function reveal(el) {
    unhide(el);
    el.setAttribute("data-gsb", "revealed");
    reportCount();
  }

  // ---------- scanning ----------
  function scanCards() {
    for (var r = 0; r < rules.length; r++) {
      var rule = rules[r];
      var els;
      try { els = document.querySelectorAll(rule.sel); } catch (e) { continue; }
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        // skip a card nested inside a card that's already hidden
        if (el.parentElement && el.parentElement.closest("[data-gsb='hidden']")) continue;
        var text = cardText(el, rule);
        if (lastKey.get(el) === text) continue;
        var wasJudged = lastKey.has(el);
        lastKey.set(el, text);
        var state = el.getAttribute("data-gsb");
        // Sites recycle elements (YouTube, X). If the content changed, forget any old "revealed".
        if (state === "revealed" && wasJudged) { el.removeAttribute("data-gsb"); state = null; }
        var match = regex && regex.test(text);
        if (match && state !== "revealed") hide(el, rule);
        else if (!match && state === "hidden") unhide(el);
      }
    }
  }

  // Catch-all: any stray link or title outside a known card (sidebars, search suggestions, etc.) gets blurred.
  function scanLoose() {
    var els = document.querySelectorAll("a[href], [title], h1, h2, h3");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest("[data-gsb-ph], .gsb-guard")) continue;
      // links inside a known card are judged with the card, not on their own
      if (el.closest(allCardSel)) { el.classList.remove("gsb-blur", "gsb-revealed"); continue; }
      var text = (el.textContent || "").slice(0, 400) + attrText(el);
      if (lastKey.get(el) === text) continue;
      lastKey.set(el, text);
      if (el.classList.contains("gsb-revealed")) { el.classList.remove("gsb-revealed"); }
      var match = regex && regex.test(text);
      el.classList.toggle("gsb-blur", !!match);
    }
  }

  function cleanupPlaceholders() {
    placeholders.forEach(function (bar, el) {
      if (!el.isConnected || el.getAttribute("data-gsb") !== "hidden") {
        bar.remove();
        placeholders.delete(el);
        if (!el.isConnected) hiddenCount = Math.max(0, hiddenCount - 1);
      } else if (el.previousSibling !== bar) {
        try { el.before(bar); } catch (e) {}
      }
    });
  }

  // ---------- full-page guard (a GTA 6 video, subreddit, stream or search) ----------
  var guardEl = null;
  var guardKey = null;
  var guardTimer = null;

  function pageSignal() {
    var bits = [];
    try {
      bits.push(decodeURIComponent((location.pathname + " " + location.search).replace(/\+/g, " ")).replace(/[\/_\-=?&]/g, " "));
    } catch (e) { bits.push(location.pathname); }
    if (site === "youtube" && /^\/(watch|shorts|live)/.test(location.pathname)) {
      bits.push(document.title);
      var h1 = document.querySelector("ytd-watch-metadata h1, h1.ytd-watch-metadata, ytd-reel-video-renderer[is-active] h2");
      if (h1) bits.push(h1.textContent);
    }
    if (site === "twitch") {
      var game = document.querySelector("a[data-a-target='stream-game-link'], [data-a-target='stream-game-link']");
      if (game) bits.push(game.textContent);
      var title = document.querySelector("[data-a-target='stream-title']");
      if (title) bits.push(title.textContent);
    }
    if (site === "reddit" || site === "x") bits.push(document.title);
    return bits.join(" | ");
  }

  function pauseMedia() {
    var vids = document.querySelectorAll("video");
    for (var i = 0; i < vids.length; i++) { try { if (!vids[i].paused) vids[i].pause(); } catch (e) {} }
  }

  function dismissedKey() { return "gsb-ok:" + location.pathname + location.search; }

  function checkGuard() {
    if (window.top !== window) return; // only the main page
    var sig = pageSignal();
    var shouldGuard = settings.enabled && regex && regex.test(sig);
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(dismissedKey()) === "1"; } catch (e) {}
    if (shouldGuard && !dismissed) showGuard();
    else hideGuard();
  }

  function showGuard() {
    var key = location.href;
    if (guardEl && guardKey === key) { pauseMedia(); return; }
    hideGuard();
    guardKey = key;
    guardEl = document.createElement("div");
    guardEl.className = "gsb-guard";
    guardEl.innerHTML =
      '<div class="gsb-guard-box">' +
        '<div class="gsb-guard-title">This page looks like GTA 6 content</div>' +
        '<div class="gsb-guard-sub">Spoiler Shield stopped it so nothing gets ruined.</div>' +
        '<div class="gsb-guard-actions">' +
          '<button type="button" class="gsb-guard-back">Get me out of here</button>' +
          '<button type="button" class="gsb-guard-go">Show this page</button>' +
        '</div>' +
      '</div>';
    guardEl.querySelector(".gsb-guard-back").addEventListener("click", function () {
      if (history.length > 1) history.back(); else location.href = location.origin;
    });
    guardEl.querySelector(".gsb-guard-go").addEventListener("click", function () {
      try { sessionStorage.setItem(dismissedKey(), "1"); } catch (e) {}
      hideGuard();
    });
    document.documentElement.appendChild(guardEl);
    pauseMedia();
    guardTimer = setInterval(pauseMedia, 400);
  }

  function hideGuard() {
    if (guardEl) { guardEl.remove(); guardEl = null; guardKey = null; }
    if (guardTimer) { clearInterval(guardTimer); guardTimer = null; }
  }

  // ---------- main loop ----------
  function resetAll() {
    document.querySelectorAll("[data-gsb]").forEach(function (el) { el.removeAttribute("data-gsb"); });
    document.querySelectorAll("[data-gsb-ph]").forEach(function (el) { el.remove(); });
    document.querySelectorAll(".gsb-blur, .gsb-revealed").forEach(function (el) { el.classList.remove("gsb-blur", "gsb-revealed"); });
    placeholders.clear();
    lastKey = new WeakMap();
    hiddenCount = 0;
    hideGuard();
  }

  var lastReported = -1;
  function reportCount() {
    if (window.top !== window) return;
    var n = settings.enabled ? document.querySelectorAll("[data-gsb='hidden'], .gsb-blur:not(.gsb-revealed)").length : 0;
    if (n === lastReported) return;
    lastReported = n;
    try { chrome.runtime.sendMessage({ type: "gsb-count", count: n }); } catch (e) {}
  }

  function runScan() {
    if (!settings.enabled || !regex) return;
    scanCards();
    scanLoose();
    cleanupPlaceholders();
    checkGuard();
    reportCount();
  }

  var pending = null;
  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; runScan(); }, 120);
  }

  // Click on a blurred link: first click reveals it instead of opening it.
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".gsb-blur:not(.gsb-revealed)");
    if (b) {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add("gsb-revealed");
      reportCount();
    }
  }, true);

  function start() {
    var mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "post-title", "href"] });
    // SPA navigation (YouTube/Twitch/X/Reddit change pages without reloading)
    var lastUrl = location.href;
    setInterval(function () {
      if (location.href !== lastUrl) { lastUrl = location.href; hideGuard(); }
      if (settings.enabled) { checkGuard(); }
    }, 500);
    runScan();
  }

  function applySettings(s) {
    settings = Object.assign({}, GSB_DEFAULTS, s || {});
    regex = gsbBuildRegex(settings.keywords);
    resetAll();
    lastReported = -1;
    if (settings.enabled) runScan(); else reportCount();
  }

  try {
    chrome.storage.sync.get(GSB_DEFAULTS, function (s) {
      settings = Object.assign({}, GSB_DEFAULTS, s);
      regex = gsbBuildRegex(settings.keywords);
      if (document.documentElement) start();
      else document.addEventListener("DOMContentLoaded", start);
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync") return;
      chrome.storage.sync.get(GSB_DEFAULTS, applySettings);
    });
  } catch (e) {
    start();
  }

  // exposed for testing
  window.__gsb = { runScan: runScan, applySettings: applySettings };
})();
