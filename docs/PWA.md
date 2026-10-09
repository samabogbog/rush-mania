# Mossvale PWA

Install controls are available on the login/character entry screen and in Settings. Chromium uses its real `beforeinstallprompt` event when available; otherwise the controls explain the browser menu path. iPhone/iPad users receive Safari → Share → Add to Home Screen instructions. Installed windows hide the install action.

The root manifest has `display: fullscreen` with standalone fallback, stable root identity/start URL/scope, 192px/512px app icons and a separate maskable icon. Apple touch metadata and safe-area padding support home-screen launch. The Fullscreen API button enters/exits fullscreen on a user click and reflects actual browser state; unsupported browsers hide it and denied requests display a message.

The production-only service worker caches the explicit offline page, icons, and hash-named JS/CSS/fonts. It never caches account/game APIs, authorized requests, cross-origin requests, or HTML navigation. Navigation always fetches fresh HTML; loss of connectivity opens a reconnect page. Online gameplay still needs a network connection. Asset storage is bounded to 160 entries and avoids declared responses larger than 4MiB. Models are not cached by this worker.

Updates do not call `skipWaiting`, force navigation, or reload a running game. A changed worker waits until all older windows close. Increment the cache version when changing the cached offline shell. Vercel serves the worker and manifest with no-cache headers and the appropriate MIME/scope headers.

## Verification

Production-preview browser checks cover manifest recognition, worker registration/control, real fullscreen entry/exit, canvas fit, login gate preservation, API exclusion from CacheStorage, offline/reconnect, mobile layout, and iPhone instruction routing. The install prompt event handler is tested separately with a simulated event because headless browser UI cannot approve an OS installation. Native Chromium installability inspection and screenshots are recorded in `artifacts/pwa/`.

Game rendering checks use Chromium ANGLE SwiftShader with Low graphics; these are functional checks, not hardware FPS results. No account, realm, or database migration is required.
