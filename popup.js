var $ = function (id) { return document.getElementById(id); };

function flash(msg) {
  $("status").textContent = msg;
  setTimeout(function () { $("status").textContent = ""; }, 1500);
}

function load() {
  chrome.storage.sync.get(GSB_DEFAULTS, function (s) {
    $("enabled").checked = !!s.enabled;
    $("mode").value = s.mode;
    $("keywords").value = (s.keywords || []).join("\n");
  });
}

function readKeywords() {
  return $("keywords").value.split("\n").map(function (k) { return k.trim(); }).filter(Boolean);
}

$("enabled").addEventListener("change", function () {
  chrome.storage.sync.set({ enabled: $("enabled").checked }, function () {
    flash($("enabled").checked ? "Shield on" : "Shield off — careful out there");
  });
});

$("mode").addEventListener("change", function () {
  chrome.storage.sync.set({ mode: $("mode").value }, function () { flash("Saved"); });
});

$("save").addEventListener("click", function () {
  chrome.storage.sync.set({ keywords: readKeywords() }, function () { flash("Saved"); });
});

$("reset").addEventListener("click", function () {
  $("keywords").value = GSB_DEFAULTS.keywords.join("\n");
  chrome.storage.sync.set({ keywords: GSB_DEFAULTS.keywords }, function () { flash("List reset"); });
});

load();
