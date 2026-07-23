// Production server for the built site. The TanStack Start build emits a portable
// fetch handler (dist/server/server.js) plus static client assets (dist/client);
// this wraps them in a Bun server on port 3000 — static files first, SSR for the
// rest. Run `bun run build` before starting. Restart it with `bun run publish`.
//
// Starting a new instance supersedes the old one: it frees the port no matter
// which user owns the current server (provisioning starts it as `engine`; a team
// member's `bun run publish` runs as their own user), so publish never collides
// with an already-running server. Every sandbox user has passwordless sudo, so
// the takeover works across user boundaries.
import handler from "./dist/server/server.js";

// Pinned, NOT read from the environment. The published preview URL
// (<label>.<PUBLIC_SITE_DOMAIN>) is reverse-proxied to 0.0.0.0:3000 inside the
// sandbox, so the default site MUST bind there. Bun auto-loads .env files, so
// honouring process.env.PORT/HOST would let a stray env var or a .env in the site
// dir silently move the site off :3000 (or onto loopback) and break the public URL.
const PORT = 3000;
const HOST = "0.0.0.0";
const CLIENT_DIR = `${import.meta.dir}/dist/client`;

const TRACKING_SCRIPT =
  '<script data-cfasync="false" async src="https://emrldtp.com/NTUxNjA5.js?t=551609"></script>';

const FLEXIBLE_DATES_SCRIPT = `
<script>
(function() {
  if (document.getElementById('flex-dates-workaround')) return;
  var s = document.createElement('script');
  s.id = 'flex-dates-workaround';
  s.textContent = '(' + function() {
    // Wait for Step 2 to appear in the DOM
    var observer = new MutationObserver(function(mutations, obs) {
      var dateFields = document.querySelector('#departure');
      var flexExists = document.querySelector('#flexible-dates-checkbox');
      if (!dateFields || flexExists) return;

      var dateGrid = dateFields.closest('.grid');
      if (!dateGrid) return;

      // Create the flexible dates toggle card
      var card = document.createElement('div');
      card.className = 'rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5';
      card.style.marginTop = '16px';
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'Flexible dates option');
      card.setAttribute('data-testid', 'flexible-dates-section');

      var inner = document.createElement('div');
      inner.className = 'flex items-start gap-3';

      // Toggle switch
      var switchDiv = document.createElement('div');
      switchDiv.className = 'relative mt-0.5 shrink-0';
      var checkbox = document.createElement('input');
      checkbox.id = 'flexible-dates-checkbox';
      checkbox.type = 'checkbox';
      checkbox.className = 'peer sr-only';
      var label = document.createElement('label');
      label.htmlFor = 'flexible-dates-checkbox';
      label.className = 'block h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 bg-gray-300';
      label.setAttribute('aria-label', 'My dates are flexible');
      var knob = document.createElement('span');
      knob.className = 'block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200';
      knob.style.marginTop = '2px';
      label.appendChild(knob);
      switchDiv.appendChild(checkbox);
      switchDiv.appendChild(label);

      // Text
      var textDiv = document.createElement('div');
      textDiv.className = 'min-w-0 flex-1';
      var textLabel = document.createElement('label');
      textLabel.htmlFor = 'flexible-dates-checkbox';
      textLabel.className = 'cursor-pointer text-sm font-medium text-gray-800';
      textLabel.textContent = '📅 My dates are flexible — find the cheapest time to go';
      var hint = document.createElement('p');
      hint.className = 'mt-1 text-xs text-gray-500';
      hint.textContent = 'Let us find the best travel window for your budget';
      textDiv.appendChild(textLabel);
      textDiv.appendChild(hint);

      inner.appendChild(switchDiv);
      inner.appendChild(textDiv);
      card.appendChild(inner);

      // Insert after date grid
      dateGrid.parentNode.insertBefore(card, dateGrid.nextSibling);

      // Toggle behavior
      var depInput = document.querySelector('#departure');
      var retInput = document.querySelector('#return');
      var offPeakToggle = document.querySelector('#off-peak-toggle');
      var prevDep = '', prevRet = '';

      checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
          prevDep = depInput ? depInput.value : '';
          prevRet = retInput ? retInput.value : '';
          if (depInput) { depInput.value = ''; depInput.disabled = true; depInput.className = depInput.className.replace(/bg-white/g, 'bg-gray-100').replace(/text-gray-900/g, 'text-gray-400') + ' cursor-not-allowed'; }
          if (retInput) { retInput.value = ''; retInput.disabled = true; retInput.className = retInput.className.replace(/bg-white/g, 'bg-gray-100').replace(/text-gray-900/g, 'text-gray-400') + ' cursor-not-allowed'; }
          label.className = label.className.replace('bg-gray-300', 'bg-teal-600');
          knob.className = knob.className.replace('translate-x-0', 'translate-x-[22px]');
          card.className = card.className.replace('border-gray-200 bg-gray-50/50', 'border-teal-300 bg-teal-50/60');
          hint.className = 'mt-1 text-xs text-teal-700/80';
          hint.textContent = 'We\\'ll pick the cheapest off-peak dates so you get the best price.';
          if (offPeakToggle && !offPeakToggle.checked) { offPeakToggle.click(); }
          // Enable Find My Trip button
          var findBtn = document.querySelector('button[type="submit"]');
          if (findBtn) findBtn.disabled = false;
        } else {
          if (depInput) { depInput.value = prevDep; depInput.disabled = false; depInput.className = depInput.className.replace(/bg-gray-100/g, 'bg-white').replace(/text-gray-400/g, 'text-gray-900').replace(/cursor-not-allowed/g, ''); }
          if (retInput) { retInput.value = prevRet; retInput.disabled = false; retInput.className = retInput.className.replace(/bg-gray-100/g, 'bg-white').replace(/text-gray-400/g, 'text-gray-900').replace(/cursor-not-allowed/g, ''); }
          label.className = label.className.replace('bg-teal-600', 'bg-gray-300');
          knob.className = knob.className.replace('translate-x-[22px]', 'translate-x-0');
          card.className = card.className.replace('border-teal-300 bg-teal-50/60', 'border-gray-200 bg-gray-50/50');
          hint.className = 'mt-1 text-xs text-gray-500';
          hint.textContent = 'Let us find the best travel window for your budget';
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } + ')()';
  document.body.appendChild(s);
})();
</script>`;

async function injectScripts(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  let html: string;
  try {
    html = await response.text();
  } catch {
    return response;
  }

  html = html.replace("</head>", `${TRACKING_SCRIPT}</head>`);
  html = html.replace("</body>", `${FLEXIBLE_DATES_SCRIPT}</body>`);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Free PORT regardless of which user owns the current listener. lsof runs under
// sudo so it can see (and the kill can signal) a process owned by another user;
// the loop waits for the socket to actually release before we bind.
const freePort =
  `for _ in $(seq 1 25); do ` +
  `pids=$(lsof -t -iTCP:${String(PORT)} -sTCP:LISTEN 2>/dev/null || true); ` +
  `if [ -z "$pids" ]; then exit 0; fi; ` +
  `kill $pids 2>/dev/null || true; sleep 0.2; ` +
  `done`;

// Take over the port, re-freeing and retrying if another publish grabbed it in the
// gap between freeing and binding (last publish wins). Bun.serve throws EADDRINUSE
// synchronously, so without this a raced publish would die while the shell already
// reported success.
for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      async fetch(req) {
        const { pathname } = new URL(req.url);
        if (pathname !== "/") {
          const file = Bun.file(CLIENT_DIR + pathname);
          if (await file.exists()) return new Response(file);
        }
        const response = await (
          handler as { fetch: (r: Request) => Response | Promise<Response> }
        ).fetch(req);
        return injectScripts(response);
      },
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await Bun.sleep(200);
  }
}

console.log(`team-site serving on http://${HOST}:${String(PORT)}`);
