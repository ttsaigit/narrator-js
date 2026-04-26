/**
 * TTS.ai Narrator — drop-in "listen to this article" reader bar.
 *
 * Usage (paste once in <head> or before </body>):
 *   <script src="https://tts.ai/narrator.js"
 *     data-pk="pk-tts-xxx"
 *     data-voice="af_bella"
 *     data-model="kokoro"
 *     data-extract="auto"          (auto|article|main|<css selector>)
 *     data-position="bottom"       (bottom|top)
 *     data-color="#e60000"         (accent color, any CSS color)
 *     data-locale="en"
 *     data-min-chars="200"         (don't show bar if article is shorter)
 *     data-max-chars="50000"       (cap input size; full request needs a paid pk)
 *   ></script>
 *
 * Differs from widget.js: that one is a button you place where you want it,
 * this one auto-injects a page-spanning reader bar that narrates the whole
 * article (Audio Native–style). Reuses /v1/tts/ + /v1/speech/results/ over
 * the publishable-key auth path, with domain restrictions enforced server-
 * side via the pk's `allowed_domains` field.
 */
(function() {
    'use strict';

    if (window.__ttsNarratorLoaded) return;
    window.__ttsNarratorLoaded = true;

    var API_BASE = 'https://api.tts.ai';
    var SITE_BASE = 'https://tts.ai';

    var scripts = document.querySelectorAll('script[src*="narrator.js"]');
    var script = scripts[scripts.length - 1];
    if (!script) return;

    var cfg = {
        pk: script.getAttribute('data-pk') || script.getAttribute('data-key') || '',
        voice: script.getAttribute('data-voice') || 'af_bella',
        model: script.getAttribute('data-model') || 'kokoro',
        extract: script.getAttribute('data-extract') || 'auto',
        position: script.getAttribute('data-position') || 'bottom',
        color: script.getAttribute('data-color') || '#e60000',
        locale: script.getAttribute('data-locale') || 'en',
        minChars: parseInt(script.getAttribute('data-min-chars') || '200', 10),
        maxChars: parseInt(script.getAttribute('data-max-chars') || '50000', 10),
        labelListen: script.getAttribute('data-label-listen') || 'Listen to this article',
        labelLoading: script.getAttribute('data-label-loading') || 'Preparing audio…',
        labelPause: script.getAttribute('data-label-pause') || 'Pause',
        labelResume: script.getAttribute('data-label-resume') || 'Resume',
    };

    // ----- Article extraction --------------------------------------------------
    function extractArticleText() {
        if (cfg.extract && cfg.extract !== 'auto') {
            // Treat as CSS selector — first match wins
            var custom = document.querySelector(cfg.extract);
            if (custom) return cleanText(custom);
        }
        var selectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.entry-content',
            '.article-body',
            '.article__body',
            '#content',
            '#main-content',
        ];
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el && el.textContent.trim().length >= cfg.minChars) {
                return cleanText(el);
            }
        }
        // Last resort: pick the densest block of <p> tags
        return densestParagraphCluster();
    }

    function cleanText(el) {
        // Clone so we can prune without mutating the live DOM.
        var clone = el.cloneNode(true);
        var dropSelectors = [
            'script', 'style', 'noscript', 'svg', 'iframe', 'aside', 'nav',
            'header', 'footer', 'form', '.advertisement', '.ad', '[role="navigation"]',
            '[role="complementary"]', '.share-buttons', '.related', '.comments',
        ];
        dropSelectors.forEach(function(sel) {
            clone.querySelectorAll(sel).forEach(function(n) { n.remove(); });
        });
        var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length > cfg.maxChars) text = text.slice(0, cfg.maxChars);
        return text;
    }

    function densestParagraphCluster() {
        var paras = Array.prototype.slice.call(document.querySelectorAll('p'));
        if (!paras.length) return '';
        // Group paragraphs by their immediate parent and pick the parent with
        // the most text — that's almost always the article body.
        var groups = {};
        paras.forEach(function(p) {
            var key = p.parentElement;
            if (!key) return;
            if (!groups[key.__ttsKey]) {
                key.__ttsKey = 'g' + Math.random().toString(36).slice(2, 9);
                groups[key.__ttsKey] = { el: key, len: 0 };
            }
            groups[key.__ttsKey].len += p.textContent.length;
        });
        var winner = null;
        Object.keys(groups).forEach(function(k) {
            if (!winner || groups[k].len > winner.len) winner = groups[k];
        });
        return winner ? cleanText(winner.el) : '';
    }

    // ----- DOM injection -------------------------------------------------------
    function inject() {
        var text = extractArticleText();
        if (!text || text.length < cfg.minChars) {
            // Not enough article content — bail silently rather than show an
            // empty reader bar on, e.g., index pages.
            return;
        }

        var bar = document.createElement('div');
        bar.id = 'tts-narrator-bar';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', 'Article narrator');
        var posCss = cfg.position === 'top'
            ? 'top:0;border-bottom:1px solid #e0e0e0;'
            : 'bottom:0;border-top:1px solid #e0e0e0;';
        bar.style.cssText = (
            'position:fixed;left:0;right:0;' + posCss +
            'background:#fff;color:#333;z-index:2147483646;' +
            'font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;' +
            'box-shadow:0 -2px 8px rgba(0,0,0,0.08);padding:10px 16px;' +
            'display:flex;align-items:center;gap:12px;flex-wrap:wrap;'
        );

        bar.innerHTML = (
            '<button id="tts-narrator-toggle" type="button" aria-label="' + cfg.labelListen + '" ' +
                'style="border:none;background:' + cfg.color + ';color:#fff;border-radius:50%;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 auto;">' +
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.6 8.7l-6.4 3.7c-.5.3-1.2-.1-1.2-.7V4.3c0-.6.7-1 1.2-.7l6.4 3.7a.8.8 0 0 1 0 1.4z"/></svg>' +
            '</button>' +
            '<div style="flex:1 1 200px;min-width:0;">' +
                '<div id="tts-narrator-status" style="font-weight:500;">' + cfg.labelListen + '</div>' +
                '<div id="tts-narrator-progress" style="height:4px;background:#eee;border-radius:2px;margin-top:6px;overflow:hidden;">' +
                    '<div id="tts-narrator-fill" style="height:100%;width:0;background:' + cfg.color + ';transition:width .25s ease;"></div>' +
                '</div>' +
                '<div id="tts-narrator-time" style="font-size:11px;color:#888;margin-top:3px;">0:00</div>' +
            '</div>' +
            '<a href="' + SITE_BASE + '/?ref=narrator" target="_blank" rel="noopener" ' +
                'style="font-size:11px;color:#888;text-decoration:none;flex:0 0 auto;">Powered by <b>TTS.ai</b></a>' +
            '<button id="tts-narrator-close" type="button" aria-label="Close narrator" ' +
                'style="border:none;background:transparent;color:#888;font-size:20px;line-height:1;cursor:pointer;flex:0 0 auto;">&times;</button>'
        );
        document.body.appendChild(bar);

        var toggle = bar.querySelector('#tts-narrator-toggle');
        var status = bar.querySelector('#tts-narrator-status');
        var fill = bar.querySelector('#tts-narrator-fill');
        var timeEl = bar.querySelector('#tts-narrator-time');
        var close = bar.querySelector('#tts-narrator-close');

        var audio = null;
        var loading = false;
        var jobUuid = null;

        function setBtnIcon(kind) {
            toggle.innerHTML = kind === 'pause'
                ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>'
                : kind === 'loading'
                    ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="animation:tts-narrator-spin 1s linear infinite"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" opacity=".25"/><path d="M14 8a6 6 0 0 0-6-6V.5A7.5 7.5 0 0 1 15.5 8H14z"/></svg>'
                    : '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.6 8.7l-6.4 3.7c-.5.3-1.2-.1-1.2-.7V4.3c0-.6.7-1 1.2-.7l6.4 3.7a.8.8 0 0 1 0 1.4z"/></svg>';
        }

        var spinKeys = document.createElement('style');
        spinKeys.textContent = '@keyframes tts-narrator-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
        document.head.appendChild(spinKeys);

        function fmtTime(s) {
            if (!isFinite(s) || s < 0) return '0:00';
            var m = Math.floor(s / 60);
            var sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        function startGeneration() {
            if (loading) return;
            loading = true;
            setBtnIcon('loading');
            status.textContent = cfg.labelLoading;

            var headers = { 'Content-Type': 'application/json' };
            if (cfg.pk) headers['Authorization'] = 'Bearer ' + cfg.pk;
            fetch(API_BASE + '/v1/tts/', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    text: text,
                    model: cfg.model,
                    voice: cfg.voice,
                    language: cfg.locale,
                }),
            }).then(function(r) {
                return r.json().then(function(data) {
                    if (!r.ok) throw new Error(data.message || data.error || ('HTTP ' + r.status));
                    return data;
                });
            }).then(function(data) {
                if (data.status === 'completed' && data.result_url) {
                    return playUrl(data.result_url);
                }
                jobUuid = data.uuid;
                pollResult(jobUuid, 0);
            }).catch(function(err) {
                loading = false;
                setBtnIcon('play');
                status.textContent = err.message || 'Audio failed. Try again.';
            });
        }

        function pollResult(uuid, attempts) {
            if (attempts >= 120) {
                loading = false;
                setBtnIcon('play');
                status.textContent = 'Took too long — try again.';
                return;
            }
            setTimeout(function() {
                fetch(API_BASE + '/v1/speech/results/?uuid=' + encodeURIComponent(uuid))
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.status === 'completed' && data.result_url) {
                            playUrl(data.result_url);
                        } else if (data.status === 'failed') {
                            loading = false;
                            setBtnIcon('play');
                            status.textContent = data.message || 'Audio failed.';
                        } else {
                            pollResult(uuid, attempts + 1);
                        }
                    })
                    .catch(function() { pollResult(uuid, attempts + 1); });
            }, 1500);
        }

        function playUrl(url) {
            loading = false;
            audio = new Audio(url);
            audio.addEventListener('timeupdate', function() {
                if (!isFinite(audio.duration) || audio.duration <= 0) return;
                fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
                timeEl.textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
            });
            audio.addEventListener('ended', function() {
                setBtnIcon('play');
                status.textContent = cfg.labelListen;
                fill.style.width = '0%';
                timeEl.textContent = '0:00';
            });
            audio.addEventListener('play', function() { setBtnIcon('pause'); status.textContent = cfg.labelPause; });
            audio.addEventListener('pause', function() {
                if (audio.ended) return;
                setBtnIcon('play');
                status.textContent = cfg.labelResume;
            });
            audio.play().catch(function(e) {
                setBtnIcon('play');
                status.textContent = 'Tap to play (browser blocked autoplay)';
            });
        }

        toggle.addEventListener('click', function() {
            if (!audio) return startGeneration();
            if (audio.paused) audio.play().catch(function(){});
            else audio.pause();
        });

        close.addEventListener('click', function() {
            if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
            bar.remove();
        });
    }

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }
    ready(inject);
})();
