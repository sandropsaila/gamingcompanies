/*
  Lightweight client-side keypad gate.
  NOTE: This is a UX deterrent only, not real access control — the page HTML/JS
  is still delivered to the browser before this runs, and the check can be
  bypassed by anyone who reads the source or network traffic. Real access
  control for this site is enforced separately at the hosting/deployment level.
*/
(function () {
  var PASSKEY_HASH = "b3282a2f2a28757b3a18ab833de16a9c54518c0b0cf493e3f0a7cf09386f326";
  var SESSION_KEY = "opfiles_unlocked";

  function alreadyUnlocked() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markUnlocked() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {}
  }

  function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", enc).then(function (buf) {
      var bytes = Array.from(new Uint8Array(buf));
      return bytes.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "opfiles-gate";
    overlay.innerHTML =
      '<style>' +
      '#opfiles-gate{position:fixed;inset:0;z-index:999999;background:#0b0c0e;' +
      'display:flex;align-items:center;justify-content:center;font-family:' +
      '"IBM Plex Mono",monospace;}' +
      '#opfiles-gate .gate-card{background:#151719;border:1px solid #2a2d31;' +
      'border-radius:10px;padding:32px 28px;width:260px;text-align:center;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.5);}' +
      '#opfiles-gate h2{color:#e8e6e1;font-size:14px;letter-spacing:.08em;' +
      'text-transform:uppercase;margin:0 0 18px;}' +
      '#opfiles-gate .dots{display:flex;gap:10px;justify-content:center;margin-bottom:18px;}' +
      '#opfiles-gate .dot{width:12px;height:12px;border-radius:50%;border:1px solid #4a4d52;background:transparent;transition:background .1s;}' +
      '#opfiles-gate .dot.filled{background:#e8e6e1;border-color:#e8e6e1;}' +
      '#opfiles-gate .keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}' +
      '#opfiles-gate button{font-family:inherit;font-size:16px;padding:12px 0;' +
      'background:#1e2124;color:#e8e6e1;border:1px solid #2a2d31;border-radius:6px;cursor:pointer;}' +
      '#opfiles-gate button:hover{background:#26292d;}' +
      '#opfiles-gate .err{color:#e26a6a;font-size:11px;margin-top:12px;height:14px;letter-spacing:.03em;}' +
      '</style>' +
      '<div class="gate-card">' +
      '<h2>Enter Access Code</h2>' +
      '<div class="dots">' +
        '<span class="dot" data-i="0"></span>' +
        '<span class="dot" data-i="1"></span>' +
        '<span class="dot" data-i="2"></span>' +
        '<span class="dot" data-i="3"></span>' +
      '</div>' +
      '<div class="keys">' +
        [1,2,3,4,5,6,7,8,9,'C',0,'⌫'].map(function (k) {
          return '<button type="button" data-k="' + k + '">' + k + '</button>';
        }).join('') +
      '</div>' +
      '<div class="err" id="opfiles-gate-err"></div>' +
      '</div>';
    return overlay;
  }

  function initGate() {
    if (alreadyUnlocked()) return;

    document.documentElement.style.visibility = "hidden";

    function show() {
      var overlay = buildOverlay();
      document.body.appendChild(overlay);
      document.documentElement.style.visibility = "visible";

      var entered = "";
      var dots = overlay.querySelectorAll(".dot");
      var err = overlay.querySelector("#opfiles-gate-err");

      function renderDots() {
        dots.forEach(function (d, i) {
          d.classList.toggle("filled", i < entered.length);
        });
      }

      function checkCode() {
        sha256Hex(entered).then(function (hash) {
          if (hash === PASSKEY_HASH) {
            markUnlocked();
            overlay.remove();
          } else {
            err.textContent = "Incorrect code.";
            entered = "";
            renderDots();
            setTimeout(function () { err.textContent = ""; }, 1200);
          }
        });
      }

      overlay.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-k]");
        if (!btn) return;
        var k = btn.getAttribute("data-k");
        if (k === "C") {
          entered = "";
          renderDots();
        } else if (k === "⌫") {
          entered = entered.slice(0, -1);
          renderDots();
        } else if (entered.length < 4) {
          entered += k;
          renderDots();
          if (entered.length === 4) checkCode();
        }
      });

      document.addEventListener("keydown", function (e) {
        if (!document.body.contains(overlay)) return;
        if (/^[0-9]$/.test(e.key) && entered.length < 4) {
          entered += e.key;
          renderDots();
          if (entered.length === 4) checkCode();
        } else if (e.key === "Backspace") {
          entered = entered.slice(0, -1);
          renderDots();
        }
      });
    }

    if (document.body) {
      show();
    } else {
      document.addEventListener("DOMContentLoaded", show);
    }
  }

  initGate();
})();
