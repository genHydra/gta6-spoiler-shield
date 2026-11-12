// Shared between the content script and the popup.
var GSB_DEFAULTS = {
  enabled: true,
  mode: "placeholder", // "placeholder" = collapse with a "show" bar, "remove" = hide silently
  keywords: [
    "gta 6",
    "gta vi",
    "gta6",
    "gtavi",
    "grand theft auto 6",
    "grand theft auto vi",
    "jason duval",
    "lucia caminos",
    "jason and lucia",
    "lucia and jason",
    "leonida",
    "vice city"
  ]
};

function gsbEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build one case-insensitive regex. Spaces/dashes/underscores/dots between words
// are optional, so "gta 6" also catches "gta6", "GTA-6", "gta_6", "#GTA6".
// Letters/digits right before or after don't count, so "gta 60fps" and "gta vibes" are left alone.
function gsbBuildRegex(keywords) {
  var parts = (keywords || [])
    .map(function (k) { return String(k).trim().toLowerCase(); })
    .filter(Boolean)
    .map(function (k) {
      return k.split(/[\s\-_.]+/).map(gsbEscape).join("[\\s\\-_.'’]*");
    });
  if (!parts.length) return null;
  return new RegExp("(?<![a-z0-9])(?:" + parts.join("|") + ")(?![a-z0-9])", "i");
}
