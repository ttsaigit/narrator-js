# narrator-js

Drop-in **"listen to this article"** reader bar for any web page. One `<script>` tag → fixed-bottom narrator bar that auto-detects the article body and plays it through any TTS service that supports the [TTS.ai REST API](https://tts.ai/api).

```html
<script src="https://tts.ai/narrator.js"
    data-pk="pk-tts-your-publishable-key"
    data-voice="af_bella"
    data-model="kokoro"></script>
```

That's it. The script auto-detects the article body, injects a fixed reader bar, and plays the page when the visitor clicks Listen.

![narrator-js reader bar](https://tts.ai/static/images/narrator-bar-screenshot.png)

## Features

- **Zero dependencies** — vanilla JS, ~14KB un-minified, no framework
- **Smart article extraction** — `<article>`, `[role="main"]`, `<main>`, `.post-content`, `.entry-content`, `.article-body` selector pass + a "densest paragraph cluster" fallback for sites with non-semantic markup
- **Custom selector override** — `data-extract="#main-article"` to target anything
- **Strips noise before reading** — drops `<script>`, `<style>`, `<aside>`, `<nav>`, `<header>`, `<footer>`, ads, share buttons, related links
- **Position + accent color customizable** — bar at `bottom` or `top`, any CSS color
- **Native `<audio>` playback** — progress bar, time display, pause/resume, close button
- **Domain-restricted publishable keys** — server enforces the key's `allowed_domains` so others can't use your key on their sites
- **Skips short pages** — won't show on index pages or stubs (configurable threshold)

## Install

### Via TTS.ai CDN (no install needed)

```html
<script src="https://tts.ai/narrator.js" data-pk="pk-tts-..."></script>
```

### Self-host

Drop `narrator.js` into your static assets and point `<script src=>` at it. Default API endpoint is `https://api.tts.ai` — fork and edit `API_BASE` at the top of the file to point at any TTS service that exposes a compatible REST API (`POST /v1/tts/` returning `{uuid}`, `GET /v1/speech/results/?uuid=` returning `{status, result_url}`).

## All `data-*` options

| attribute | default | description |
|---|---|---|
| `data-pk` | _(none)_ | Publishable key (`pk-tts-…`). Domain restrictions enforced server-side. |
| `data-voice` | `af_bella` | Voice ID. See [TTS.ai voices](https://tts.ai/voices/). |
| `data-model` | `kokoro` | TTS model ID. |
| `data-extract` | `auto` | `auto` (selectors + fallback), or any CSS selector. |
| `data-position` | `bottom` | `bottom` or `top`. |
| `data-color` | `#e60000` | Accent color. Any CSS color. |
| `data-locale` | `en` | Language hint to the TTS model. |
| `data-min-chars` | `200` | Skip the bar if the detected article is shorter than this. |
| `data-max-chars` | `50000` | Cap input size before submission. |
| `data-label-listen` | `Listen to this article` | |
| `data-label-loading` | `Preparing audio…` | |
| `data-label-pause` | `Pause` | |
| `data-label-resume` | `Resume` | |

## Compared to `widget-js`

[`tts-widget`](https://github.com/ttsaigit/tts-widget) renders **inline** next to its `<script>` tag — a button you place where you want it, plays a button-triggered short snippet. **`narrator-js` auto-injects** a fixed page-spanning bar regardless of script placement and plays the **whole article**. Different UX, different intent.

| | `tts-widget` | `narrator-js` |
|---|---|---|
| Placement | Inline (where the script is) | Auto-injects fixed bar |
| What it plays | Selectable text or static `data-text` | Whole article (auto-detected) |
| Best for | "Listen to this paragraph" buttons | Audio Native–style reader bar |

## API auth

Get a publishable key (`pk-tts-...`) from [tts.ai/account/#api-keys](https://tts.ai/account/#api-keys). Set domain restrictions when you create the key so it can only be used on your sites.

## Drop into your CMS

### Notion

Add an **Embed** block to the page (type `/embed`), point it at a page on your own domain that includes:

```html
<script src="https://tts.ai/narrator.js" data-pk="pk-tts-..." data-extract="auto"></script>
```

Notion's embed iframe will load the script and the reader bar appears at the bottom of the embedded view. To narrate the Notion page text itself, copy your content into a static page first — Notion blocks `<script>` execution inside its native blocks for security, so the embed-block route is the supported path.

### Obsidian

Open the note in **Source mode** and paste:

```html
<script src="https://tts.ai/narrator.js" data-pk="pk-tts-..." data-extract=".markdown-rendered"></script>
```

Switch back to Reading view — the bar appears and reads the rendered note. The `data-extract=".markdown-rendered"` selector targets Obsidian's content container so navigation chrome / sidebars don't get read aloud. Works under "Restricted mode" off; Obsidian's HTML support is enabled by default.

### Substack

In the post editor, add a **Custom HTML** block (the `</>` icon in the toolbar). Paste:

```html
<script src="https://tts.ai/narrator.js" data-pk="pk-tts-..." data-extract=".body, article, [class*='post-content']"></script>
```

Publish. Subscribers see a "Listen to this article" reader bar at the bottom of the page.

### Ghost / WordPress / Webflow / generic HTML

Same pattern — drop the `<script>` tag in any "Custom HTML / code injection" slot the platform offers (Ghost: Code Injection → Footer, WordPress: theme footer or a Custom HTML block, Webflow: Page settings → Footer code). For WordPress specifically, see also [`tts-php`](https://github.com/ttsaigit/tts-php) if you want server-side integration.

## License

Apache-2.0. See `LICENSE`.

## Origin

Extracted from [TTS.ai](https://tts.ai) where it ships at `https://tts.ai/narrator.js` for any publisher to use. Bug fixes round-trip with the internal copy at `static/js/narrator.js` in the TTS.ai codebase.
