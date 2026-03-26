// ==UserScript==
// @name         Mangatan Hybrid (owocr Absolute Full)
// @namespace    http://tampermonkey.net/
// @version      37.2
// @description  Suwayomi Manga OCR - owocr Backend - Full Restoration (Hairsp, Batch, Caching, Themes, Ideal Font) + Next 10 Pages Preload
// @author       1Selxo, Gemini
// @match        *://127.0.0.1*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @updateURL    https://github.com/kellenok/Mangatan/raw/main/mangatan.user.js
// @downloadURL  https://github.com/kellenok/Mangatan/raw/main/mangatan.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- 1. Constants & Settings Definitions ---
    const SETTINGS_KEY = 'mangatan_owocr_v37_full';

    const ICONS = {
        settings: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
        anki: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        cross: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };

    const ACCENT_COLORS = {
        deepblue: { main: 'rgba(0,191,255,', text: '#FFFFFF', highlightText: '#000000' },
        red: { main: 'rgba(231, 76, 60,', text: '#FFFFFF', highlightText: '#000000' },
        green: { main: 'rgba(46, 204, 113,', text: '#FFFFFF', highlightText: '#000000' },
        blue: { main: 'rgba(52, 152, 219,', text: '#FFFFFF', highlightText: '#000000' },
        purple: { main: 'rgba(155, 89, 182,', text: '#FFFFFF', highlightText: '#000000' },
        pink: { main: 'rgba(232, 67, 147,', text: '#FFFFFF', highlightText: '#000000' },
        white: { main: 'rgba(236, 240, 241,', text: '#ffffff', highlightText: '#000000' },
        grey: { main: 'rgba(149, 165, 166,', text: '#FFFFFF', highlightText: '#000000' },
        minimal: { main: 'rgba(127, 127, 127,', text: 'transparent', highlightText: 'transparent' },
    };

    const defaultSettings = {
        ocrServerUrl: 'http://127.0.0.1:3000',
        imageServerUser: '',
        imageServerPassword: '',
        engine: 'glens',
        accentColor: 'deepblue',
        textOrientation: 'smart',
        dimmedOpacity: 0.3,
        fontMultiplierHorizontal: 1.0,
        fontMultiplierVertical: 1.0,
        boundingBoxAdjustment: 5,
        focusScaleMultiplier: 1.1,
        soloHoverMode: false,
        styleGroupMode: false,
        ankiConnectUrl: 'http://127.0.0.1:8765',
        ankiImageField: 'Image',
        debugMode: false,
        interactionMode: 'hover',
        activationMode: 'alwaysShow',
        brightnessMode: 'light',
        sites: [{
            urlPattern: '127.0.0.1',
            imageContainerSelectors: [
                'div.muiltr-masn8', 'div.muiltr-79elbk', 'div.muiltr-u43rde',
                'div.muiltr-1r1or1s', 'div.muiltr-18sieki', 'div.muiltr-cns6dc',
                '.MuiBox-root.muiltr-1noqzsz', '.MuiBox-root.muiltr-1tapw32'
            ],
            overflowFixSelector: '.MuiBox-root.muiltr-13djdhf',
            contentRootSelector: '#root'
        }]
    };

    const IS_MOBILE = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // --- 2. Global State ---
    let settings = { ...defaultSettings };
    const ocrDataCache = new WeakMap();
    const managedElements = new Map();
    const managedContainers = new Map();
    const attachedAttributeObservers = new WeakMap();
    const visibleImages = new Set();
    let measurementSpan = null;
    let animationFrameId = null;
    let activeImageForExport = null;
    let nextChapterPreloading = false;
    let preloadedChapters = new Set();
    let resizeObserver, intersectionObserver, navigationObserver;
    const UI = {};

    let debugLog = [];
    let longPressState = { valid: false };
    let tapTracker = new WeakMap();
    const DOUBLE_TAP_THRESHOLD = 300;
    let activeOverlay = null;
    let hideButtonTimer = null;

    const logDebug = (message) => {
        if (!settings.debugMode) return;
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(`[OCR Hybrid] ${logEntry}`);
        debugLog.push(logEntry);
        document.dispatchEvent(new CustomEvent('ocr-log-update'));
    };

    const showToast = (message, type = 'info', duration = 3000) => {
        let container = document.getElementById('gemini-ocr-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gemini-ocr-toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `gemini-ocr-toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
        }, duration);
    };

    async function ankiConnectRequest(action, params = {}) {
        return GM_fetch({ method: 'POST', url: settings.ankiConnectUrl, data: JSON.stringify({ action, version: 6, params }), headers: { 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 15000 });
    }
    async function exportImageToAnki(targetImg) {
        if (!settings.ankiImageField) { showToast('Anki Image Field is not set.', 'error'); return false; }
        if (!targetImg?.complete || !targetImg.naturalHeight) { showToast('Anki Export Failed: Image not valid.', 'error'); return false; }
        try {
            const canvas = document.createElement('canvas');
            canvas.width = targetImg.naturalWidth; canvas.height = targetImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(targetImg, 0, 0);
            const base64data = canvas.toDataURL('image/png').split(',')[1];
            if (!base64data) throw new Error("Canvas toDataURL failed.");
            const filename = `screenshot_${Date.now()}.png`;
            await ankiConnectRequest('storeMediaFile', { filename, data: base64data });
            const notes = await ankiConnectRequest('findNotes', { query: 'added:1' });
            if (!notes?.length) throw new Error('No recently added cards found.');
            const lastNoteId = notes.sort((a, b) => b - a)[0];
            await ankiConnectRequest('updateNoteFields', { note: { id: lastNoteId, fields: { [settings.ankiImageField]: `<img src="${filename}">` } } });
            showToast('Exported to Anki!', 'success');
            return true;
        } catch (error) {
            console.error(`Anki Export Error: ${error.message}`); showToast(`Anki Export Failed: ${error.message}`, 'error'); return false;
        }
    }

    // --- 3. Replacement Engine ---
    function cleanOcrText(text) {
        if (!text) return "";
        const complexPunctuationRegex = /[!?\.\u2026\u22EE\uff0e\uff65]{2,}/g;
        return text.replace(complexPunctuationRegex, (match) => {
            const isEllipsis = match.includes('.') || match.includes('\u2026') || match.includes('\u22EE') || match.includes('\uff0e');
            if (isEllipsis) return '…';
            if (match.includes('?')) return '?';
            return '!';
        }).replace(/･･･/g, '…');
    }

    // --- 4. Font Engine: Binary Search Ideal Logic ---
    function calculateAndApplyStylesForSingleBox(box, imgRect) {
        if (!measurementSpan || !box || !imgRect || imgRect.width === 0) return;

        const rawText = box._rawText || box.textContent || '';
        const text = cleanOcrText(rawText);

        // Hair Space logic (\u200A) for Yomitan
        box.textContent = box._isFirst ? '\u200A' + text : text;

        const availableWidth = box.offsetWidth + settings.boundingBoxAdjustment;
        const availableHeight = box.offsetHeight + settings.boundingBoxAdjustment;

        if (!text || availableWidth <= 0 || availableHeight <= 0) return;

        // Punctuation undersizing fix: replace with 'ア!' for measurement
        const MEASURE_PUNC_REGEX = /[、。！？\?\!\u2026\u3001\u3002\uff0c\uff0e\uff1f\uff01\u002c\u002e\uff1a\uff1b･]/;
        const measurementText = text.replace(MEASURE_PUNC_REGEX, 'ア!');

        const findBestFit = (isVerticalSearch) => {
            measurementSpan.style.writingMode = isVerticalSearch ? 'vertical-rl' : 'horizontal-tb';
            measurementSpan.textContent = measurementText;
            measurementSpan.style.whiteSpace = 'nowrap';

            let low = 1, high = 180, bestFit = 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (mid <= 0) break;
                measurementSpan.style.fontSize = `${mid}px`;
                let textFits = isVerticalSearch ? measurementSpan.offsetHeight <= availableHeight : measurementSpan.offsetWidth <= availableWidth;
                if (textFits) {
                    bestFit = mid; low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            return bestFit;
        };

        const hSize = findBestFit(false);
        const vSize = findBestFit(true);
        let finalSize, isVertical;

        const serverDir = box._data?.writing_direction;
        if (serverDir === 'TOP_TO_BOTTOM') { isVertical = true; finalSize = vSize; }
        else if (serverDir === 'LEFT_TO_RIGHT') { isVertical = false; finalSize = hSize; }
        else {
            isVertical = vSize > hSize;
            finalSize = isVertical ? vSize : hSize;
        }

        const multiplier = isVertical ? settings.fontMultiplierVertical : settings.fontMultiplierHorizontal;
        box.style.fontSize = `${finalSize * multiplier}px`;
        box.classList.toggle('gemini-ocr-text-vertical', isVertical);
    }

    // --- 5. Positioning Loop ---
    function updatePositions() {
        if (visibleImages.size === 0) { animationFrameId = null; return; }
        for (const img of visibleImages) {
            const state = managedElements.get(img);
            if (state && img.isConnected) {
                const rect = img.getBoundingClientRect();
                if (rect.width > 0) {
                    Object.assign(state.overlay.style, {
                        top: `${rect.top}px`, left: `${rect.left}px`,
                        width: `${rect.width}px`, height: `${rect.height}px`,
                    });
                }
            }
        }
        animationFrameId = requestAnimationFrame(updatePositions);
    }

    function updateOverlayDimensionsAndStyles(img, state, rect = null) {
        if (!rect) rect = img.getBoundingClientRect();
        if (rect.width > 0) {
            Object.assign(state.overlay.style, { width: `${rect.width}px`, height: `${rect.height}px` });
            if (state.lastWidth !== rect.width || state.lastHeight !== rect.height) {
                state.overlay.querySelectorAll('.gemini-ocr-text-box').forEach(box => calculateAndApplyStylesForSingleBox(box, rect));
                state.lastWidth = rect.width; state.lastHeight = rect.height;
            }
        }
    }

    // --- 6. Rendering Logic ---
    function triggerOverlayToggle(targetImg) {
        const overlayState = managedElements.get(targetImg);
        if (overlayState?.overlay) {
            if (activeOverlay === overlayState.overlay) hideActiveOverlay();
            else showMobileOverlay(overlayState.overlay, targetImg);
        }
    }
    function showMobileOverlay(overlay, image) {
        if (activeOverlay && activeOverlay !== overlay) hideActiveOverlay();
        activeOverlay = overlay; activeImageForExport = image;
        overlay.classList.remove('is-inactive'); overlay.classList.add('is-focused');
        const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
        if (ankiBtn) ankiBtn.classList.remove('is-hidden');
    }
    function hideActiveOverlay() {
        if (!activeOverlay) return;
        activeOverlay.classList.remove('is-focused');
        activeOverlay.classList.add('is-inactive');
        const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
        if (ankiBtn) ankiBtn.classList.add('is-hidden');
        activeOverlay = null;
        activeImageForExport = null;
    }
    function handleTouchStart(event) {
        if (settings.activationMode === 'alwaysShow') return;
        if (event.touches.length > 1) { longPressState.valid = false; return; }
        const targetImg = event.target.closest('img');
        if (!targetImg || !managedElements.has(targetImg)) {
            if (event.target.closest('.gemini-ocr-decoupled-overlay')) { longPressState.valid = false; return; }
            longPressState.valid = false;
            return;
        }
        if (settings.activationMode === 'doubleTap') {
            const now = Date.now(), lastTap = tapTracker.get(targetImg);
            if (lastTap && (now - lastTap.time) < DOUBLE_TAP_THRESHOLD) { event.preventDefault(); triggerOverlayToggle(targetImg); tapTracker.delete(targetImg); longPressState.valid = false; }
            else { tapTracker.set(targetImg, { time: now }); }
            return;
        }
        if (settings.activationMode === 'longPress') { longPressState = { valid: true, startX: event.touches[0].clientX, startY: event.touches[0].clientY, target: targetImg }; }
    }
    function handleTouchMove(event) {
        if (!longPressState.valid) return;
        const SCROLL_TOLERANCE = 15;
        const deltaX = Math.abs(longPressState.startX - event.touches[0].clientX), deltaY = Math.abs(longPressState.startY - event.touches[0].clientY);
        if (deltaX > SCROLL_TOLERANCE || deltaY > SCROLL_TOLERANCE) longPressState.valid = false;
    }
    function handleTouchEnd() { longPressState.valid = false; }
    function handleContextMenu(event) {
        if (settings.activationMode === 'longPress' && longPressState.valid && event.target === longPressState.target) {
            event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
            triggerOverlayToggle(longPressState.target);
            longPressState.valid = false;
            return false;
        }
    }
    function handleGlobalTap(event) {
        if (!activeOverlay || settings.activationMode === 'alwaysShow') return;
        const target = event.target;
        if (!activeOverlay.contains(target) && !target.closest('#gemini-ocr-settings-button, #gemini-ocr-global-anki-export-btn')) {
            hideActiveOverlay();
        }
    }

    function displayOcrResults(targetImg) {
        if (managedElements.has(targetImg)) return;
        const data = ocrDataCache.get(targetImg);
        if (!data || !data.paragraphs) return;

        const overlay = document.createElement('div');
        overlay.className = `gemini-ocr-decoupled-overlay interaction-mode-${settings.interactionMode}`;
        overlay.classList.toggle('solo-hover-mode', settings.soloHoverMode);
        overlay.classList.toggle('style-group-mode', settings.styleGroupMode);

        data.paragraphs.forEach(para => {
            const group = document.createElement('div');
            group.className = 'gemini-ocr-group';
            const b = para.bounding_box;

            Object.assign(group.style, {
                left: `${(b.center_x - b.width / 2) * 100}%`,
                top: `${(b.center_y - b.height / 2) * 100}%`,
                width: `${b.width * 100}%`,
                height: `${b.height * 100}%`
            });

            para.lines.forEach((line, idx) => {
                const box = document.createElement('div');
                box.className = 'gemini-ocr-text-box';
                box._rawText = line.text;
                box._data = line;
                box._isFirst = (idx === 0);

                const lb = line.bounding_box;
                const relL = ((lb.center_x - b.center_x) / b.width) * 100 + 50;
                const relT = ((lb.center_y - b.center_y) / b.height) * 100 + 50;

                Object.assign(box.style, {
                    left: `${relL}%`, top: `${relT}%`,
                    width: `${(lb.width / b.width) * 100}%`,
                    height: `${(lb.height / b.height) * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${lb.rotation_z || 0}rad)`
                });
                group.appendChild(box);
            });
            overlay.appendChild(group);
        });

        document.body.appendChild(overlay);
        const state = { overlay, lastWidth: 0, lastHeight: 0 };
        managedElements.set(targetImg, state);

        if (IS_MOBILE) {
            const handleMobileClick = (e) => {
                activeImageForExport = targetImg;
                const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
                if (ankiBtn) ankiBtn.classList.remove('is-hidden');

                const clickedGroup = e.target.closest('.gemini-ocr-group');
                if (clickedGroup) {
                    overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
                    overlay.querySelectorAll('.gemini-ocr-group').forEach(g => g.classList.remove('has-manual-highlight'));
                    if (settings.styleGroupMode) clickedGroup.classList.add('has-manual-highlight');
                    else clickedGroup.querySelectorAll('.gemini-ocr-text-box').forEach(b => b.classList.add('manual-highlight'));
                    overlay.classList.add('has-manual-highlight');
                }
            };

            if (settings.activationMode === 'alwaysShow') {
                overlay.classList.add('is-focused');
                overlay.addEventListener('click', handleMobileClick);
            } else {
                overlay.classList.add('is-inactive');
                overlay.addEventListener('click', handleMobileClick);
            }
        } else {
            const show = () => {
                clearTimeout(hideButtonTimer);
                overlay.classList.add('is-focused');
                const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
                if (ankiBtn) ankiBtn.classList.remove('is-hidden');
                activeImageForExport = targetImg;
            };

            const hide = () => {
                hideButtonTimer = setTimeout(() => {
                    overlay.classList.remove('is-focused');
                    const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
                    if (ankiBtn && activeImageForExport === targetImg) {
                        ankiBtn.classList.add('is-hidden');
                    }
                }, 1000);
            };

            targetImg.addEventListener('mouseenter', show);
            overlay.addEventListener('mouseenter', show);
            targetImg.addEventListener('mouseleave', hide);
            overlay.addEventListener('mouseleave', hide);
            
            // Fix for "Click" interaction mode
            overlay.addEventListener('click', (e) => {
                if (settings.interactionMode === 'click') {
                    const clickedGroup = e.target.closest('.gemini-ocr-group');
                    if (clickedGroup) {
                        overlay.querySelectorAll('.gemini-ocr-group').forEach(g => g.classList.remove('has-manual-highlight'));
                        clickedGroup.classList.add('has-manual-highlight');
                    }
                }
            });
        }

        const rect = targetImg.getBoundingClientRect();
        updateOverlayDimensionsAndStyles(targetImg, state, rect);
        resizeObserver.observe(targetImg);
        intersectionObserver.observe(targetImg);
    }

    // --- 7. Batch OCR Link Injection ---
    async function runBatchChapter(baseUrl, btn) {
        const originalText = btn.textContent;
        btn.disabled = true; btn.textContent = '...';
        logDebug(`Starting batch preprocessing for chapter: ${baseUrl}`);
        try {
            await GM_fetch({
                method: 'POST', url: `${settings.ocrServerUrl}/preprocess-chapter`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ baseUrl, user: settings.imageServerUser, pass: settings.imageServerPassword })
            });
            logDebug(`Batch preprocessing successful for chapter: ${baseUrl}`);
            btn.textContent = 'OK';
        } catch (e) { 
            logDebug(`Batch preprocessing error for chapter: ${baseUrl} - ${e.message}`);
            btn.textContent = 'ERR'; 
        }
        finally { setTimeout(() => { if (btn.isConnected) { btn.textContent = originalText; btn.disabled = false; } }, 3000); }
    }

    function addOcrButtonToChapter(linkEl) {
        const moreBtn = linkEl.querySelector('button[aria-label="more"]');
        if (!moreBtn || linkEl.querySelector('.gemini-ocr-chapter-batch-btn')) return;
        const ocrBtn = document.createElement('button');
        ocrBtn.textContent = 'OCR'; ocrBtn.className = 'gemini-ocr-chapter-batch-btn';
        ocrBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            const urlPath = new URL(linkEl.href).pathname;
            runBatchChapter(`${window.location.origin}/api/v1${urlPath}/page/`, ocrBtn);
        };
        moreBtn.parentElement.insertBefore(ocrBtn, moreBtn);
    }

    // --- 8. Network & Fetch ---
    function GM_fetch(options) {
        return new Promise((resolve, reject) => {
            const config = {
                ...options,
                timeout: options.timeout || 45000,
                onload: (res) => {
                    try {
                        if (!res.responseText) {
                            if (res.status >= 200 && res.status < 300) {
                                resolve({});
                            } else {
                                reject(new Error(`Server error: ${res.status} (Empty response)`));
                            }
                            return;
                        }
                        const data = JSON.parse(res.responseText);
                        if (res.status >= 200 && res.status < 300) {
                            if (data.error) {
                                reject(new Error(data.error));
                            } else if (Object.prototype.hasOwnProperty.call(data, 'result')) {
                                resolve(data.result);
                            }
                            else {
                                resolve(data);
                            }
                        } else {
                            reject(new Error(data.error || data.message || `Server error: ${res.status}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${e.message}`));
                    }
                },
                onerror: () => reject(new Error('Connection failed.')),
                ontimeout: () => reject(new Error('Request timed out.'))
            };
            GM_xmlhttpRequest(config);
        });
    }

    async function fetchOcr(img) {
        if (ocrDataCache.has(img)) return;
        ocrDataCache.set(img, 'pending');

        const url = `${settings.ocrServerUrl}/ocr?url=${encodeURIComponent(img.src)}&engine=${settings.engine}`;
        const finalUrl = settings.imageServerUser ? `${url}&user=${encodeURIComponent(settings.imageServerUser)}&pass=${encodeURIComponent(settings.imageServerPassword)}` : url;

        logDebug(`Fetching OCR for: ${img.src}`);
        try {
            const data = await GM_fetch({ method: 'GET', url: finalUrl });
            logDebug(`OCR Success for: ${img.src} (${data?.paragraphs?.length} paragraphs)`);
            ocrDataCache.set(img, data);
            displayOcrResults(img);
        } catch (e) { 
            logDebug(`OCR Failed for: ${img.src} - ${e.message}`);
            ocrDataCache.delete(img); 
        }
    }

    async function getNextChapterBaseUrl() {
        const match = location.pathname.match(/\/manga\/([^/]+)\/chapter\/([^/]+)/);
        if (!match) return null;

        const currentMangaId = match[1];
        const currentChapterId = match[2];

        const nextBtn = document.querySelector('a[href*="/chapter/"][aria-label*="next" i], a[href*="/chapter/"][title*="next" i], a[href*="/chapter/"][aria-label*="следующ" i], a[href*="/chapter/"][title*="следующ" i]');
        if (nextBtn && nextBtn.href) {
            const urlPath = new URL(nextBtn.href).pathname;
            return `${window.location.origin}/api/v1${urlPath}/page/`;
        }

        try {
            const res = await fetch(`${window.location.origin}/api/v1/manga/${currentMangaId}/chapters`);
            if (res.ok) {
                const data = await res.json();
                let chapters = data.data || data.result || data;
                if (Array.isArray(chapters)) {
                    const sorted = [...chapters].sort((a, b) => {
                        const numA = parseFloat(a.chapterNumber || a.sourceOrder || 0);
                        const numB = parseFloat(b.chapterNumber || b.sourceOrder || 0);
                        return numA - numB;
                    });

                    const idx = sorted.findIndex(c => String(c.id || c.chapterId) === String(currentChapterId));
                    if (idx !== -1 && idx + 1 < sorted.length) {
                        const nextId = sorted[idx + 1].id || sorted[idx + 1].chapterId;
                        return `${window.location.origin}/api/v1/manga/${currentMangaId}/chapter/${nextId}/page/`;
                    }
                }
            }
        } catch (e) { }

        return null;
    }

    // --- 9. SPA Router & Navigation Restoration ---
    function setupSPARouter() {
        let lastUrl = location.href;

        const onUrlChange = () => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                nextChapterPreloading = false;


                managedElements.forEach((state, img) => {
                    if (!document.body.contains(img)) {
                        if (state.overlay) state.overlay.remove();
                        if (resizeObserver) resizeObserver.unobserve(img);
                        if (intersectionObserver) intersectionObserver.unobserve(img);
                        managedElements.delete(img);
                    }
                });

                const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
                if (ankiBtn) ankiBtn.classList.add('is-hidden');
            }
        };

        const originalPushState = history.pushState;
        history.pushState = function () {
            originalPushState.apply(this, arguments);
            onUrlChange();
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            onUrlChange();
        };

        window.addEventListener('popstate', onUrlChange);
    }

    // --- 10. Modern GUI & Styles ---
    function applyGlobalStyles() {
        const theme = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.deepblue;

        if (settings.accentColor === 'minimal') {
            document.body.classList.add('ocr-theme-minimal');
        } else {
            document.body.classList.remove('ocr-theme-minimal');
        }

        const cssVars = `
            :root {
                --ocr-bg-color: rgba(10,25,40,0.85);
                --ocr-border-color: ${theme.main}0.6);
                --ocr-text-color: ${theme.text};
                --ocr-highlight-bg-color: ${theme.main}0.9);
                --ocr-highlight-text-color: ${theme.highlightText};
                --ocr-highlight-shadow: 0 0 10px ${theme.main}0.5);
                --modal-header-color: ${theme.main}1);
                --ocr-dimmed-opacity: ${settings.dimmedOpacity};
                --ocr-focus-scale: ${settings.focusScaleMultiplier};
                --ocr-input-bg: #262a33;
                --ocr-input-border: #3a404d;
            }`;

        let styleTag = document.getElementById('gemini-ocr-dynamic-styles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'gemini-ocr-dynamic-styles';
            document.head.appendChild(styleTag);
        }

        if (styleTag.textContent !== cssVars) {
            styleTag.textContent = cssVars;
        }
    }


    function createUI() {
        GM_addStyle(`
            /* --- OCR Overlay Styles (v29) --- old minimal: 1px solid var(--ocr-border-color-dim)*/
            .gemini-ocr-decoupled-overlay { position: fixed; top: 0; left: 0; z-index: 0; pointer-events: none; transition: opacity 0.2s; /* Removed will-change */ }
            .gemini-ocr-decoupled-overlay:not(.is-focused) { opacity: 0; visibility: hidden; }
            .gemini-ocr-group { pointer-events: auto; position: absolute; box-sizing: border-box;  }
            .gemini-ocr-text-box { white-space: nowrap !important; overflow: visible !important;font-weight: 500; position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; user-select: text; cursor: pointer;  overflow: hidden; color: var(--ocr-text-color); text-shadow: 0 1px 3px rgba(0,0,0,0.9); padding: 4px; }
            .gemini-ocr-text-vertical { writing-mode: vertical-rl; text-orientation: upright;}
            .gemini-ocr-decoupled-overlay:not(.style-group-mode) .gemini-ocr-text-box { background: var(--ocr-bg-color); border: 2px solid var(--ocr-border-color); backdrop-filter: blur(3px); border-radius: 4px; }
            .gemini-ocr-decoupled-overlay:not(.style-group-mode) body:not(.ocr-edit-mode-active) .interaction-mode-hover.is-focused .gemini-ocr-group:hover .gemini-ocr-text-box, .gemini-ocr-decoupled-overlay:not(.style-group-mode) body:not(.ocr-edit-mode-active) .interaction-mode-click.is-focused .gemini-ocr-text-box.manual-highlight, .gemini-ocr-decoupled-overlay:not(.style-group-mode) .is-focused .gemini-ocr-text-box.manual-highlight { transform: scale(var(--ocr-focus-scale)); background: var(--ocr-highlight-bg-color); border-color: var(--ocr-highlight-border-color); color: var(--ocr-highlight-text-color); text-shadow: none; box-shadow: var(--ocr-highlight-shadow), var(--ocr-highlight-inset-shadow); z-index: 1; overflow: visible; }
            .gemini-ocr-decoupled-overlay.style-group-mode .gemini-ocr-text-box { background: transparent; border: none; backdrop-filter: none; border-radius: 0; overflow: visible; }
            .gemini-ocr-decoupled-overlay.style-group-mode .gemini-ocr-group { background: var(--ocr-bg-color); border: 2px solid var(--ocr-border-color); backdrop-filter: blur(3px); border-radius: 4px; transform: none !important; }
            .gemini-ocr-decoupled-overlay.style-group-mode body:not(.ocr-edit-mode-active) .interaction-mode-hover.is-focused .gemini-ocr-group:hover, .gemini-ocr-decoupled-overlay.style-group-mode body:not(.ocr-edit-mode-active) .interaction-mode-click.is-focused .gemini-ocr-group.has-manual-highlight, .gemini-ocr-decoupled-overlay.style-group-mode .is-focused .gemini-ocr-group.has-manual-highlight { background: var(--ocr-highlight-bg-color); border-color: var(--ocr-highlight-border-color); box-shadow: var(--ocr-highlight-shadow), var(--ocr-highlight-inset-shadow); }
            .gemini-ocr-decoupled-overlay.style-group-mode .is-focused .gemini-ocr-group:hover .gemini-ocr-text-box, .gemini-ocr-decoupled-overlay.style-group-mode .is-focused .gemini-ocr-group.has-manual-highlight .gemini-ocr-text-box { color: var(--ocr-highlight-text-color); text-shadow: none; transform: scale(var(--ocr-focus-scale)); z-index: 1; }
            .interaction-mode-hover.is-focused:not(.solo-hover-mode):has(.gemini-ocr-group:hover) .gemini-ocr-group:not(:hover), .interaction-mode-click.is-focused.has-manual-highlight .gemini-ocr-group:not(.has-manual-highlight), .solo-hover-mode.is-focused.has-manual-highlight .gemini-ocr-group:not(.has-manual-highlight) { opacity: var(--ocr-dimmed-opacity); }
            .solo-hover-mode.is-focused .gemini-ocr-group { opacity: 0; }
            .solo-hover-mode.is-focused .gemini-ocr-group:hover, .solo-hover-mode.is-focused .gemini-ocr-group.selected-for-merge, .solo-hover-mode.is-focused .gemini-ocr-group.has-manual-highlight { opacity: 1; }
            .gemini-ocr-group.selected-for-merge { outline: 3px solid #f1c40f !important; outline-offset: 2px; box-shadow: 0 0 12px #f1c40f; opacity: 1 !important; }
            .gemini-ocr-decoupled-overlay.is-inactive { display: none; pointer-events: none; }
            body.ocr-brightness-dark .gemini-ocr-text-box { background: rgba(29, 34, 39, 0.9); border-color: ${ACCENT_COLORS.white.main}0.5); }
            body.ocr-theme-minimal .gemini-ocr-decoupled-overlay .gemini-ocr-group { background: transparent!important; color: transparent!; border: none!important; border-radius: 4px; backdrop-filter: none!important; text-shadow: none!important; box-shadow: none;}
            body.ocr-theme-minimal .gemini-ocr-decoupled-overlay .gemini-ocr-text-box { background: transparent!important; color: transparent!important; border: none; backdrop-filter: none!important; text-shadow: none!important; box-shadow: none; transform: none; }
            body.ocr-theme-minimal ::selection { background-color: rgba(0, 123, 255, 0.2); }
            .gemini-ocr-edit-action-bar { position: absolute; bottom: 0; left: 0; right: 0; display: none; justify-content: center; align-items: center; gap: 15px; padding: 10px; background: rgba(26,29,33,0.8); backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.1); }
            .edit-mode-active .gemini-ocr-edit-action-bar { display: flex; }
            .gemini-ocr-edit-action-bar button { padding: 10px 20px; font-size: 1rem; font-weight: bold; border-radius: 20px; border: none; cursor: pointer; color: white; }
            .gemini-ocr-edit-action-bar .edit-action-merge { background-color: #3498db; } .gemini-ocr-edit-action-bar .edit-action-delete { background-color: #e74c3c; } .gemini-ocr-edit-action-bar button:disabled { background-color: #7f8c8d; opacity: 0.6; }
            .gemini-ocr-chapter-batch-btn { font-family: sans-serif; font-weight: 500; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(240,153,136,0.5); color: #f09988; background: transparent; cursor: pointer; margin-right: 4px; }
            #gemini-ocr-settings-button, #gemini-ocr-global-anki-export-btn, #gemini-ocr-global-edit-btn { position: fixed; z-index: 2147483647; border: none; border-radius: 50%; width: clamp(48px, 12vw, 54px); height: clamp(48px, 12vw, 54px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.25); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); backdrop-filter: blur(8px); }
            #gemini-ocr-settings-button:hover, #gemini-ocr-global-anki-export-btn:hover, #gemini-ocr-global-edit-btn:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
            #gemini-ocr-settings-button { bottom: clamp(20px, 5vw, 30px); right: clamp(20px, 5vw, 30px); background: rgba(35, 39, 46, 0.9); color: #EAEAEA; }
            #gemini-ocr-global-anki-export-btn { bottom: clamp(85px, 20vw, 100px); right: clamp(20px, 5vw, 30px); background-color: rgba(46, 204, 113, 0.9); color: white; }
            #gemini-ocr-global-edit-btn { bottom: clamp(20px, 5vw, 30px); right: clamp(85px, 20vw, 100px); background: rgba(52, 152, 219, 0.9); color: white; }
            #gemini-ocr-global-edit-btn.edit-active { background-color: #f1c40f; color: #1A1D21; }
            #gemini-ocr-global-anki-export-btn.is-hidden, #gemini-ocr-global-edit-btn.is-hidden { opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.8) translateY(20px); }
            /* --- Toast Notifications --- */
            #gemini-ocr-toast-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 2147483647; display: flex; flex-direction: column; gap: 10px; align-items: center; pointer-events: none; width: auto; }
            .gemini-ocr-toast { background: rgba(18, 20, 24, 0.95); color: #EAEAEA; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 0.95rem; font-weight: 500; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); opacity: 0; transform: translateY(20px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: auto; max-width: 90vw; text-align: center; }
            .gemini-ocr-toast.show { opacity: 1; transform: translateY(0); }
            .gemini-ocr-toast.toast-success { border-left: 4px solid #2ecc71; }
            .gemini-ocr-toast.toast-error { border-left: 4px solid #e74c3c; }
            .gemini-ocr-toast.toast-info { border-left: 4px solid #3498db; }
            /* --- Modern Modal Design (v29) --- */
            .gemini-ocr-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(10, 12, 16, 0.75); backdrop-filter: blur(8px); z-index: 2147483646; color: #EAEAEA; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 0.25s ease; }
            .gemini-ocr-modal:not(.is-hidden) { opacity: 1; visibility: visible; }
            .gemini-ocr-modal-container { width: clamp(340px, 90vw, 640px); max-height: 85vh; background: #1e2228; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; transform: scale(0.95); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1px solid rgba(255,255,255,0.08); }
            .gemini-ocr-modal:not(.is-hidden) .gemini-ocr-modal-container { transform: scale(1); }
            .gemini-ocr-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); }
            .gemini-ocr-modal-header h2 { margin: 0; color: #fff; font-size: 1.35rem; font-weight: 600; letter-spacing: -0.02em; }
            #gemini-ocr-close-btn { background: transparent; border: none; color: #8b949e; cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
            #gemini-ocr-close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
            .gemini-ocr-modal-content { padding: 28px; overflow-y: auto; flex-grow: 1; scrollbar-width: thin; scrollbar-color: #484f5e transparent; }
            .gemini-ocr-modal-content::-webkit-scrollbar { width: 6px; } .gemini-ocr-modal-content::-webkit-scrollbar-thumb { background-color: #484f5e; border-radius: 3px; }
            .gemini-ocr-modal-footer { padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; background-color: #1a1e24; }
            .gemini-ocr-modal-footer .footer-actions-left { display: flex; gap: 12px; }
            .gemini-ocr-settings-section { margin-bottom: 32px; }
            .gemini-ocr-settings-section h3 { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--modal-header-color); margin: 0 0 16px 0; opacity: 0.9; }
            .settings-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
            .settings-item label { color: #c9d1d9; font-size: 0.95rem; font-weight: 500; }
            .settings-item input[type="text"], .settings-item input[type="password"], .settings-item input[type="number"], .settings-item select, textarea#gemini-ocr-sites-config { background-color: var(--ocr-input-bg); border: 1px solid var(--ocr-input-border); border-radius: 8px; color: #e6edf3; padding: 10px 14px; font-size: 0.95rem; transition: border-color 0.2s, box-shadow 0.2s; width: 200px; font-family: inherit; }
            .settings-item input[type="number"] { width: 100px; text-align: right; } textarea#gemini-ocr-sites-config { width: 100%; resize: vertical; min-height: 80px; }
            .settings-item input:focus, .settings-item select:focus, textarea:focus { border-color: var(--modal-header-color); outline: none; box-shadow: 0 0 0 3px var(--ocr-border-color-dim); }
            .settings-checkbox { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; cursor: pointer; }
            .settings-checkbox label:not(.switch) { flex-grow: 1; cursor: pointer; }
            .switch { position: relative; display: inline-block; width: 46px; height: 26px; flex-shrink: 0; margin-left: 16px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #3a404d; transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1); border-radius: 34px; }
            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            input:checked + .slider { background-color: var(--modal-header-color); }
            input:checked + .slider:before { transform: translateX(20px); }
            .advanced-options-container { display: none; margin-top: 24px; padding-top: 24px; border-top: 1px dashed #3a404d; }
            .settings-action-buttons { display: flex; gap: 12px; margin-top: 28px; } .settings-action-buttons button { flex: 1; }
            .gemini-ocr-modal button { padding: 12px 20px; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
            #gemini-ocr-save-btn { background-color: var(--modal-header-color); color: #121418; } #gemini-ocr-save-btn:hover { filter: brightness(1.15); box-shadow: 0 4px 12px var(--ocr-border-color-dim); }
            #gemini-ocr-restore-btn { background: transparent; border: 2px solid #3a404d; color: #8b949e; } #gemini-ocr-restore-btn:hover { border-color: #8b949e; color: #e6edf3; }
            #gemini-ocr-purge-cache-btn { background: rgba(231, 76, 60, 0.15); color: #e74c3c; } #gemini-ocr-purge-cache-btn:hover { background: #e74c3c; color: white; }
            #gemini-ocr-debug-btn { background-color: #3a404d; color: #e6edf3; } #gemini-ocr-debug-btn:hover { background-color: #484f5e; }
            #gemini-ocr-batch-chapter-btn { background-color: rgba(52, 152, 219, 0.15); color: #3498db; } #gemini-ocr-batch-chapter-btn:hover { background-color: #3498db; color: white; }
            #gemini-ocr-debug-modal .gemini-ocr-modal-container { width: 800px; max-width: 95vw; height: 80vh; }
            #gemini-ocr-debug-log { font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 0.85rem; line-height: 1.5; padding: 16px; background-color: #121418; border-radius: 8px; }
        `);
        const colorOptions = Object.keys(ACCENT_COLORS).map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');
        const toggle = (id, labelText) => `<div class="settings-checkbox"><label for="${id}">${labelText}</label><label class="switch"><input type="checkbox" id="${id}"><span class="slider"></span></label></div>`;
        const desktopInteractionSettings = `<div class="settings-item"><label for="ocr-interaction-mode">Highlight Trigger</label><select id="ocr-interaction-mode"><option value="hover">Mouse Hover</option><option value="click">Mouse Click</option></select></div>`;
        const mobileInteractionSettings = `<div class="settings-item"><label for="ocr-activation-mode">Activation Gesture</label><select id="ocr-activation-mode"><option value="alwaysShow">Always Show</option><option value="doubleTap">Double Tap</option><option value="longPress">Long Press</option></select></div><div class="settings-item"><label for="ocr-brightness-mode">Theme Mode</label><select id="ocr-brightness-mode"><option value="light">Light</option><option value="dark">Dark</option></select></div>`;
        const desktopAdvancedInteraction = `<div class="settings-item"><label for="ocr-merge-key">Merge Modifier Key</label><input type="text" id="ocr-merge-key" placeholder="e.g. Control"></div><div class="settings-item"><label for="ocr-delete-key">Delete Modifier Key</label><input type="text" id="ocr-delete-key" placeholder="e.g. Alt"></div>`;

        document.body.insertAdjacentHTML('beforeend', `
            <button id="gemini-ocr-global-anki-export-btn" class="is-hidden" title="Export Screenshot to Anki">${ICONS.anki}</button>
            ${IS_MOBILE ? `<button id="gemini-ocr-global-edit-btn" class="is-hidden" title="Toggle Edit Mode">${ICONS.edit}</button>` : ''}
            <button id="gemini-ocr-settings-button" title="Open Settings">${ICONS.settings}</button>
            <div id="gemini-ocr-settings-modal" class="gemini-ocr-modal is-hidden">
                <div class="gemini-ocr-modal-container">
                    <div class="gemini-ocr-modal-header"><h2>Mangatan Settings (v37.2)</h2><button id="gemini-ocr-close-btn">${ICONS.close}</button></div>
                    <div class="gemini-ocr-modal-content">
                        <div class="gemini-ocr-settings-section"><h3>Appearance & Behavior</h3><div class="settings-item"><label for="ocr-accent-color">Accent Color</label><select id="ocr-accent-color">${colorOptions}</select></div><div class="settings-item"><label for="ocr-text-orientation">Text Orientation</label><select id="ocr-text-orientation"><option value="smart">Smart Detection</option><option value="forceHorizontal">Force Horizontal</option><option value="forceVertical">Force Vertical</option></select></div>${IS_MOBILE ? mobileInteractionSettings : desktopInteractionSettings}${toggle('gemini-ocr-solo-hover-mode', 'Focus Mode (Dim others on hover)')}</div>
                        <div class="gemini-ocr-settings-section"><h3>Smart Merging</h3>${toggle('gemini-ocr-auto-merge-enabled', 'Enable Automatic Bubble Merging')}</div>
                        <div class="gemini-ocr-settings-section"><h3>Connections</h3><div class="settings-item"><label for="gemini-ocr-server-url">OCR Server URL</label><input type="text" id="gemini-ocr-server-url" placeholder="http://..."></div><div id="gemini-ocr-server-status" style="text-align: right; font-size: 0.85em; font-weight: 500; color: #8b949e; cursor: pointer; margin-top: -10px; margin-bottom: 20px; transition: color 0.2s;">Click to check server status</div><div class="settings-item"><label for="gemini-ocr-anki-url">Anki-Connect URL</label><input type="text" id="gemini-ocr-anki-url" placeholder="http://localhost:8765"></div><div class="settings-item"><label for="gemini-ocr-anki-field">Anki Note Field</label><input type="text" id="gemini-ocr-anki-field" placeholder="e.g. Image"></div></div>
                        ${toggle('show-advanced-settings', 'Show Advanced Options')}
                        <div id="advanced-settings-container" class="advanced-options-container">
                            <div class="gemini-ocr-settings-section"><h3>Advanced Display</h3>${!IS_MOBILE ? desktopAdvancedInteraction : ''}<div class="settings-item"><label for="ocr-dimmed-opacity">Dim Opacity (%)</label><input type="number" id="ocr-dimmed-opacity" min="0" max="100" step="5"></div>${toggle('gemini-ocr-style-group-mode', 'Style Groups (Apply styles to whole bubble)')}${toggle('gemini-ocr-furigana-filter', 'Enable Furigana Filter')}<div class="settings-item"><label for="ocr-focus-scale-multiplier">Focus Scale</label><input type="number" id="ocr-focus-scale-multiplier" min="1" max="3" step="0.05"></div><div class="settings-item"><label for="ocr-font-multiplier-horizontal">Horiz. Font Scale</label><input type="number" id="ocr-font-multiplier-horizontal" min="0.1" max="5" step="0.1"></div><div class="settings-item"><label for="ocr-font-multiplier-vertical">Vert. Font Scale</label><input type="number" id="ocr-font-multiplier-vertical" min="0.1" max="5" step="0.1"></div></div>
                             <div class="gemini-ocr-settings-section"><h3>Tuning Merge Algorithm</h3><div class="settings-item"><label>Distance Factor (K)</label><input type="number" id="ocr-auto-merge-dist-k" step="0.1"></div><div class="settings-item"><label>Max Font Ratio (Same)</label><input type="number" id="ocr-auto-merge-font-ratio" step="0.05"></div><div class="settings-item"><label>Min Overlap</label><input type="number" id="ocr-auto-merge-overlap-min" step="0.05"></div><div class="settings-item"><label>Min Primary Line Ratio</label><input type="number" id="ocr-auto-merge-min-line-ratio" step="0.05"></div><div class="settings-item"><label>Max Font Ratio (Mixed)</label><input type="number" id="ocr-auto-merge-font-ratio-mixed" step="0.05"></div><div class="settings-item"><label>Mixed Min Overlap</label><input type="number" id="ocr-auto-merge-mixed-min-overlap-ratio" step="0.05"></div></div>
                             <div class="gemini-ocr-settings-section"><h3>System</h3><div class="settings-item"><label for="gemini-image-server-user">Source Username</label><input type="text" id="gemini-image-server-user"></div><div class="settings-item"><label for="gemini-image-server-password">Source Password</label><input type="password" id="gemini-image-server-password"></div><label for="gemini-ocr-sites-config" style="display:block; margin-bottom: 8px; color:#c9d1d9; font-weight:500;">Site Configurations (Advanced)</label><textarea id="gemini-ocr-sites-config" spellcheck="false"></textarea><div style="margin-top: 20px;">${toggle('gemini-ocr-debug-mode', 'Enable Debug Mode')}</div><div class="settings-action-buttons"><button id="gemini-ocr-restore-btn">Restore Defaults</button><button id="gemini-ocr-purge-cache-btn">Clear Server Cache</button></div></div>
                        </div>
                    </div>
                    <div class="gemini-ocr-modal-footer"><div class="footer-actions-left"><button id="gemini-ocr-batch-chapter-btn">Pre-process Chapter</button><button id="gemini-ocr-debug-btn">View Logs</button></div><div><button id="gemini-ocr-save-btn">Save Changes</button></div></div>
                </div>
            </div>
            <div id="gemini-ocr-debug-modal" class="gemini-ocr-modal is-hidden"><div class="gemini-ocr-modal-container"><div class="gemini-ocr-modal-header"><h2>Debug Log</h2><button id="gemini-ocr-close-debug-btn">${ICONS.close}</button></div><div class="gemini-ocr-modal-content" style="padding:0;"><textarea id="gemini-ocr-debug-log" readonly></textarea></div></div></div>
        `);
    }

    // --- 10.5 Settings Logic Restoration ---
    function populateUIFields() {
        UI.serverUrlInput.value = settings.ocrServerUrl;
        UI.ankiUrlInput.value = settings.ankiConnectUrl;
        UI.ankiFieldInput.value = settings.ankiImageField;
        UI.accentColorSelect.value = settings.accentColor;
        UI.textOrientationSelect.value = settings.textOrientation;
        UI.soloHoverCheckbox.checked = settings.soloHoverMode;
        UI.styleGroupModeCheckbox.checked = settings.styleGroupMode;
        UI.dimmedOpacityInput.value = Math.round(settings.dimmedOpacity * 100);
        UI.focusScaleMultiplierInput.value = settings.focusScaleMultiplier;
        UI.fontMultiplierHorizontalInput.value = settings.fontMultiplierHorizontal;
        UI.fontMultiplierVerticalInput.value = settings.fontMultiplierVertical;
        UI.imageServerUserInput.value = settings.imageServerUser || '';
        UI.imageServerPasswordInput.value = settings.imageServerPassword || '';
        UI.debugModeCheckbox.checked = settings.debugMode;
        UI.sitesConfigTextarea.value = JSON.stringify(settings.sites, null, 2);

        if (IS_MOBILE) {
            const activationModeSelect = document.getElementById('ocr-activation-mode');
            if (activationModeSelect) activationModeSelect.value = settings.activationMode;
            const brightnessModeSelect = document.getElementById('ocr-brightness-mode');
            if (brightnessModeSelect) brightnessModeSelect.value = settings.brightnessMode;
        } else {
            const interactionModeSelect = document.getElementById('ocr-interaction-mode');
            if (interactionModeSelect) interactionModeSelect.value = settings.interactionMode;
        }

        // Populate engine if it exists in UI
        const engineSelect = document.getElementById('ocr-engine');
        if (engineSelect) engineSelect.value = settings.engine;
    }

    async function checkServerStatus() {
        UI.statusDiv.textContent = '• Connecting...';
        UI.statusDiv.style.color = '#e67e22';
        logDebug(`Checking server status at: ${settings.ocrServerUrl}`);
        try {
            const res = await GM_fetch({ method: 'GET', url: settings.ocrServerUrl });
            if (res.status === 'running' || res.status === 'ok' || res) {
                logDebug(`Server is ONLINE`);
                UI.statusDiv.innerHTML = `<span style="color:#2ecc71">● Online</span>`;
            }
        } catch (e) {
            logDebug(`Server is OFFLINE: ${e.message}`);
            UI.statusDiv.innerHTML = `<span style="color:#e74c3c">● Offline/Error</span>`;
        }
    }

    function bindUIEvents() {
        // Map DOM elements to UI object
        UI.settingsModal = document.getElementById('gemini-ocr-settings-modal');
        UI.settingsButton = document.getElementById('gemini-ocr-settings-button');
        UI.closeBtn = document.getElementById('gemini-ocr-close-btn');
        UI.saveBtn = document.getElementById('gemini-ocr-save-btn');
        UI.restoreBtn = document.getElementById('gemini-ocr-restore-btn');
        UI.statusDiv = document.getElementById('gemini-ocr-server-status');

        // Inputs
        UI.serverUrlInput = document.getElementById('gemini-ocr-server-url');
        UI.ankiUrlInput = document.getElementById('gemini-ocr-anki-url');
        UI.ankiFieldInput = document.getElementById('gemini-ocr-anki-field');
        UI.accentColorSelect = document.getElementById('ocr-accent-color');
        UI.textOrientationSelect = document.getElementById('ocr-text-orientation');
        UI.soloHoverCheckbox = document.getElementById('gemini-ocr-solo-hover-mode');
        UI.styleGroupModeCheckbox = document.getElementById('gemini-ocr-style-group-mode');
        UI.dimmedOpacityInput = document.getElementById('ocr-dimmed-opacity');
        UI.focusScaleMultiplierInput = document.getElementById('ocr-focus-scale-multiplier');
        UI.fontMultiplierHorizontalInput = document.getElementById('ocr-font-multiplier-horizontal');
        UI.fontMultiplierVerticalInput = document.getElementById('ocr-font-multiplier-vertical');
        UI.imageServerUserInput = document.getElementById('gemini-image-server-user');
        UI.imageServerPasswordInput = document.getElementById('gemini-image-server-password');
        UI.debugModeCheckbox = document.getElementById('gemini-ocr-debug-mode');
        UI.sitesConfigTextarea = document.getElementById('gemini-ocr-sites-config');

        // Toggle Modal
        UI.settingsButton.onclick = () => {
            populateUIFields();
            UI.settingsModal.classList.remove('is-hidden');
        };

        UI.closeBtn.onclick = () => UI.settingsModal.classList.add('is-hidden');

        // Debug Modal logic
        UI.debugBtn = document.getElementById('gemini-ocr-debug-btn');
        UI.closeDebugBtn = document.getElementById('gemini-ocr-close-debug-btn');
        UI.debugLogTextarea = document.getElementById('gemini-ocr-debug-log');
        UI.debugModal = document.getElementById('gemini-ocr-debug-modal');
        
        if (UI.debugBtn && UI.debugModal) {
            UI.debugBtn.onclick = () => { 
                UI.debugLogTextarea.value = debugLog.join('\\n'); 
                UI.debugModal.classList.remove('is-hidden'); 
                UI.debugLogTextarea.scrollTop = UI.debugLogTextarea.scrollHeight; 
            };
            UI.closeDebugBtn.onclick = () => UI.debugModal.classList.add('is-hidden');
        }

        document.addEventListener('ocr-log-update', () => { 
            if (UI.debugModal && !UI.debugModal.classList.contains('is-hidden')) { 
                UI.debugLogTextarea.value = debugLog.join('\\n'); 
                UI.debugLogTextarea.scrollTop = UI.debugLogTextarea.scrollHeight; 
            } 
        });

        // Advanced Toggle
        document.getElementById('show-advanced-settings').onchange = (e) => {
            document.getElementById('advanced-settings-container').style.display = e.target.checked ? 'block' : 'none';
        };
        // --- NEW: Anki Button Click Handler ---
        UI.globalAnkiButton = document.getElementById('gemini-ocr-global-anki-export-btn');
        if (UI.globalAnkiButton) {
            UI.globalAnkiButton.onclick = async () => {
                if (!activeImageForExport) {
                    showToast("No active image found to export.", "error");
                    return;
                }

                const btn = UI.globalAnkiButton;
                const originalHTML = btn.innerHTML;

                // Visual Feedback: Loading state
                btn.style.pointerEvents = 'none';
                btn.innerHTML = '...';

                const success = await exportImageToAnki(activeImageForExport);

                // Visual Feedback: Success/Fail state
                btn.innerHTML = success ? ICONS.check : ICONS.cross;
                btn.style.backgroundColor = success ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)';

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.backgroundColor = ''; // Reset to CSS default
                    btn.style.pointerEvents = 'auto';
                }, 2000);
            };
        }
        // Status Check
        UI.statusDiv.onclick = checkServerStatus;

        // Restore Defaults
        UI.restoreBtn.onclick = async () => {
            if (confirm("Reset all settings to default?")) {
                await GM_setValue(SETTINGS_KEY, JSON.stringify(defaultSettings));
                location.reload();
            }
        };

        // SAVE BUTTON LOGIC
        UI.saveBtn.onclick = async () => {
            const newSettings = {
                ...settings,
                ocrServerUrl: UI.serverUrlInput.value,
                ankiConnectUrl: UI.ankiUrlInput.value,
                ankiImageField: UI.ankiFieldInput.value,
                accentColor: UI.accentColorSelect.value,
                textOrientation: UI.textOrientationSelect.value,
                soloHoverMode: UI.soloHoverCheckbox.checked,
                styleGroupMode: UI.styleGroupModeCheckbox.checked,
                dimmedOpacity: parseInt(UI.dimmedOpacityInput.value) / 100,
                focusScaleMultiplier: parseFloat(UI.focusScaleMultiplierInput.value),
                fontMultiplierHorizontal: parseFloat(UI.fontMultiplierHorizontalInput.value),
                fontMultiplierVertical: parseFloat(UI.fontMultiplierVerticalInput.value),
                imageServerUser: UI.imageServerUserInput.value,
                imageServerPassword: UI.imageServerPasswordInput.value,
                debugMode: UI.debugModeCheckbox.checked
            };
            
            if (IS_MOBILE) {
                const activationSel = document.getElementById('ocr-activation-mode');
                const brightnessSel = document.getElementById('ocr-brightness-mode');
                if (activationSel) newSettings.activationMode = activationSel.value;
                if (brightnessSel) newSettings.brightnessMode = brightnessSel.value;
            } else {
                const interactionSel = document.getElementById('ocr-interaction-mode');
                if (interactionSel) newSettings.interactionMode = interactionSel.value;
            }
            // Identify if critical things changed (URLs)
            const needsReload = (newSettings.ocrServerUrl !== settings.ocrServerUrl);

            await GM_setValue(SETTINGS_KEY, JSON.stringify(newSettings));
            settings = newSettings;

            if (needsReload) {
                location.reload();
            } else {
                // SMART UPDATE: No reload
                applyGlobalStyles(); // Updates colors/CSS vars
                document.querySelectorAll('.gemini-ocr-decoupled-overlay').forEach(ov => {
                    ov.classList.toggle('solo-hover-mode', settings.soloHoverMode);
                    ov.classList.toggle('style-group-mode', settings.styleGroupMode);
                });
                UI.settingsModal.classList.add('is-hidden');
            }
            try {
                // Validate JSON for sites
                newSettings.sites = JSON.parse(UI.sitesConfigTextarea.value);
            } catch (e) { alert("Invalid Site Config JSON"); return; }

        };
    }
    // --- 11. Main Initializer (FIXED FOR WEBTOONS & CHAPTER TRANSITIONS) ---
    async function init() {
        const saved = await GM_getValue(SETTINGS_KEY);
        if (saved) settings = { ...defaultSettings, ...JSON.parse(saved) };

        createUI();
        bindUIEvents();
        applyGlobalStyles();
        setupSPARouter();

        measurementSpan = document.createElement('span');
        measurementSpan.style.cssText = `position:fixed;visibility:hidden;white-space:nowrap;top:-999px;font-family:sans-serif;font-weight:500;`;
        document.body.appendChild(measurementSpan);

        if (IS_MOBILE) {
            document.body.addEventListener('touchstart', handleTouchStart, { passive: false }); 
            document.body.addEventListener('touchmove', handleTouchMove, { passive: false }); 
            document.body.addEventListener('touchend', handleTouchEnd); 
            document.body.addEventListener('touchcancel', handleTouchEnd); 
            window.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false }); 
            document.body.addEventListener('click', handleGlobalTap, true);
        }

        resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const state = managedElements.get(entry.target);
                if (state) updateOverlayDimensionsAndStyles(entry.target, state, entry.contentRect);
            }
        });

        intersectionObserver = new IntersectionObserver(entries => {
            for (let entry of entries) {
                const img = entry.target;
                if (entry.isIntersecting) {
                    visibleImages.add(img);

                    const state = managedElements.get(img);
                    if (state && state.overlay) {
                        state.overlay.style.visibility = '';
                        if (IS_MOBILE && settings.activationMode === 'alwaysShow') {
                            state.overlay.classList.add('is-focused');
                        }
                    }

                    if (!managedElements.has(img)) {
                        if (!ocrDataCache.has(img)) {
                            const src = img.src || "";
                            if (src.includes('/page/')) fetchOcr(img);
                        } else if (ocrDataCache.get(img) !== 'pending') {
                            displayOcrResults(img);
                        }
                    }

                    const allImages = Array.from(document.querySelectorAll('img[src*="/page/"]'));
                    const currentIndex = allImages.indexOf(img);
                    if (currentIndex !== -1) {
                        const preloadLimit = Math.min(currentIndex + 11, allImages.length);
                        for (let i = currentIndex + 1; i < preloadLimit; i++) {
                            const nextImg = allImages[i];
                            if (!managedElements.has(nextImg) && !ocrDataCache.has(nextImg)) {
                                const nextSrc = nextImg.src || "";
                                if (nextSrc.includes('/page/')) fetchOcr(nextImg);
                            }
                        }


                        if (currentIndex >= allImages.length - 5 && allImages.length > 0 && !nextChapterPreloading) {
                            nextChapterPreloading = true;
                            getNextChapterBaseUrl().then(baseUrl => {
                                if (baseUrl && !preloadedChapters.has(baseUrl)) {
                                    preloadedChapters.add(baseUrl);
                                    GM_fetch({
                                        method: 'POST', url: `${settings.ocrServerUrl}/preprocess-chapter`,
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ baseUrl, user: settings.imageServerUser, pass: settings.imageServerPassword })
                                    }).catch(() => { });
                                }
                            });
                        }
                    }

                    if (!animationFrameId) animationFrameId = requestAnimationFrame(updatePositions);
                } else {
                    visibleImages.delete(img);
                    const state = managedElements.get(img);
                    if (state && state.overlay) {
                        state.overlay.style.visibility = 'hidden';
                        if (IS_MOBILE && settings.activationMode === 'alwaysShow') {
                            state.overlay.classList.remove('is-focused');
                        }
                    }
                }
            }
        }, { threshold: 0, rootMargin: '1200px 0px' });

        const scanAllImages = () => {
            const currentChapterMatch = location.pathname.match(/\/chapter\/([^/]+)/);
            const currentChapterId = currentChapterMatch ? currentChapterMatch[1] : null;

            document.querySelectorAll('img[src*="/page/"]').forEach(img => {

                const imgChapterMatch = img.src.match(/\/chapter\/([^/]+)/);
                if (imgChapterMatch && currentChapterId && imgChapterMatch[1] !== currentChapterId) {
                    const baseUrl = img.src.split('/page/')[0] + '/page/';
                    if (!preloadedChapters.has(baseUrl)) {
                        preloadedChapters.add(baseUrl);
                        GM_fetch({
                            method: 'POST', url: `${settings.ocrServerUrl}/preprocess-chapter`,
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({ baseUrl, user: settings.imageServerUser, pass: settings.imageServerPassword })
                        }).catch(() => { });
                    }
                }

                if (!attachedAttributeObservers.has(img)) {
                    const attrObs = new MutationObserver(() => {
                        if (img.src.includes('/page/')) {
                            if (managedElements.has(img)) {
                                const st = managedElements.get(img);
                                if (st.overlay) st.overlay.remove();
                                managedElements.delete(img);
                            }
                            ocrDataCache.delete(img);
                            fetchOcr(img);
                        }
                    });
                    attrObs.observe(img, { attributes: true, attributeFilter: ['src'] });
                    attachedAttributeObservers.set(img, attrObs);
                }
                intersectionObserver.observe(img);
            });
        };

        const observer = new MutationObserver((mutations) => {
            scanAllImages();
            mutations.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) {
                    const links = n.matches('a[href*="/manga/"][href*="/chapter/"]') ? [n] : n.querySelectorAll('a[href*="/manga/"][href*="/chapter/"]');
                    links.forEach(addOcrButtonToChapter);
                }
            }));
        });

        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('popstate', () => setTimeout(scanAllImages, 500));
        scanAllImages();

        document.body.addEventListener('mousemove', (e) => {
            const img = document.elementFromPoint(e.clientX, e.clientY)?.closest('img');
            if (img && managedElements.has(img)) {
                activeImageForExport = img;
                const ankiBtn = document.getElementById('gemini-ocr-global-anki-export-btn');
                if (ankiBtn) ankiBtn.classList.remove('is-hidden');
            }
        });
    }

    init();
})();