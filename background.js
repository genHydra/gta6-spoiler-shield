// Shows how many things were hidden on the current tab as a badge on the toolbar icon.
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || msg.type !== "gsb-count" || !sender.tab) return;
  var n = msg.count || 0;
  chrome.action.setBadgeBackgroundColor({ color: "#ec4899", tabId: sender.tab.id });
  chrome.action.setBadgeText({ text: n ? (n > 99 ? "99+" : String(n)) : "", tabId: sender.tab.id });
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    chrome.storage.sync.get(null, function (s) {
      if (!s || !s.keywords) {
        chrome.storage.sync.set({ enabled: true, mode: "placeholder", keywords: [
          "gta 6", "gta vi", "gta6", "gtavi", "grand theft auto 6", "grand theft auto vi",
          "jason duval", "lucia caminos", "jason and lucia", "lucia and jason", "leonida", "vice city"
        ] });
      }
    });
  }
});
