// ==UserScript==
// @name         Mangatan (Hybrid v29.2)
// @namespace    http://tampermonkey.net/
// @version      29.2
// @description  Suwayomi manga ocr
// @author       1Selxo, Kellen, Gemini (Hybrid by AI)
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

(function() {
    'use strict';

    // Constants and Icons from v29
    const ICONS = {
        settings: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
        anki: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        cross: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };
    const IS_MOBILE = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Network function GM_fetch from v29
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

    // Furigana Filter Logic (Client Side) from v29
    const KANJI_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
    class BBox {
        constructor(bbox, naturalWidth, naturalHeight) {
            this.x = bbox.x * naturalWidth;
            this.y = bbox.y * naturalHeight;
            this.width = bbox.width * naturalWidth;
            this.height = bbox.height * naturalHeight;
            this.right = this.x + this.width;
            this.bottom = this.y + this.height;
            this.center_x = this.x + this.width / 2;
            this.center_y = this.y + this.height / 2;
        }
    }
    function checkHorizontalOverlap(bbox1, bbox2) {
        const left1 = bbox1.x, right1 = bbox1.right, left2 = bbox2.x, right2 = bbox2.right;
        const overlap_left = Math.max(left1, left2), overlap_right = Math.min(right1, right2);
        if (overlap_right <= overlap_left) return 0.0;
        const overlap_width = overlap_right - overlap_left, smaller_width = Math.min(bbox1.width, bbox2.width);
        return smaller_width > 0 ? overlap_width / smaller_width : 0.0;
    }
    function checkVerticalOverlap(bbox1, bbox2) {
        const top1 = bbox1.y, bottom1 = bbox1.bottom, top2 = bbox2.y, bottom2 = bbox2.bottom;
        const overlap_top = Math.max(top1, top2), overlap_bottom = Math.min(bottom1, bottom2);
        if (overlap_bottom <= overlap_top) return 0.0;
        const overlap_height = overlap_bottom - overlap_top, smaller_height = Math.min(bbox1.height, bbox2.height);
        return smaller_height > 0 ? overlap_height / smaller_height : 0.0;
    }
    function isFurigana(currentIndex, lines, bboxes) {
        const currentLine = lines[currentIndex].text, currentBBox = bboxes[currentIndex];
        if (KANJI_REGEX.test(currentLine) || currentBBox.width <= 0 || currentBBox.height <= 0) return false;
        const isVertical = currentBBox.height > currentBBox.width;
        const SIZE_THRESHOLD = 0.60, OVERLAP_THRESHOLD = 0.6, DISTANCE_FACTOR = 1.5;
        for (let j = 0; j < lines.length; j++) {
            if (currentIndex === j) continue;
            const otherLine = lines[j].text, otherBBox = bboxes[j];
            if (!otherLine || !KANJI_REGEX.test(otherLine)) continue;
            let isSmaller = isVertical ? currentBBox.width < (otherBBox.width * SIZE_THRESHOLD) : currentBBox.height < (otherBBox.height * SIZE_THRESHOLD);
            if (!isSmaller) continue;
            let isFuriganaCandidate = false;
            if (isVertical) {
                const horizontal_distance = Math.abs(currentBBox.center_x - otherBBox.center_x), combined_width = currentBBox.width + otherBBox.width, vertical_overlap_ratio = checkVerticalOverlap(currentBBox, otherBBox);
                if (horizontal_distance < combined_width * DISTANCE_FACTOR && vertical_overlap_ratio > OVERLAP_THRESHOLD) isFuriganaCandidate = true;
            } else {
                const vertical_distance = Math.abs(currentBBox.center_y - otherBBox.center_y), combined_height = currentBBox.height + otherBBox.height, horizontal_overlap_ratio = checkHorizontalOverlap(currentBBox, otherBBox);
                if (vertical_distance < combined_height * DISTANCE_FACTOR && horizontal_overlap_ratio > OVERLAP_THRESHOLD) isFuriganaCandidate = true;
            }
            if (isFuriganaCandidate) return true;
        }
        return false;
    }
    function applyFuriganaFilter(linesData, naturalWidth, naturalHeight) {
        if (!linesData || !linesData.length || !naturalWidth || !naturalHeight) return linesData;
        const bboxes = linesData.map(d => new BBox(d.tightBoundingBox, naturalWidth, naturalHeight));
        const filteredData = [];
        for (let i = 0; i < linesData.length; i++) {
            if (!isFurigana(i, linesData, bboxes)) filteredData.push(linesData[i]);
        }
        return filteredData;
    }

    // Colors and default settings from v29
    const ACCENT_COLORS = {
        white: { main: 'rgba(236, 240, 241,', text: '#ffffff', highlightText: '#000000'},
        green: { main: 'rgba(46, 204, 113,', text: '#FFFFFF', highlightText: '#000000'},
        blue: { main: 'rgba(52, 152, 219,', text: '#FFFFFF', highlightText: '#000000'},
        purple: { main: 'rgba(155, 89, 182,', text: '#FFFFFF', highlightText: '#000000'},
        pink: { main: 'rgba(232, 67, 147,', text: '#FFFFFF', highlightText: '#000000'},
        red: { main: 'rgba(231, 76, 60,', text: '#FFFFFF', highlightText: '#000000'},
        deepblue: { main: 'rgba(0,191,255,', text: '#FFFFFF', highlightText: '#000000' },
        minimal: { main: 'rgba(127, 127, 127,', text: 'transparent', highlightText: 'transparent' },
    };

    const defaultSettings = {
        ocrServerUrl: 'http://127.0.0.1:3000',
        imageServerUser: '',
        imageServerPassword: '',
        ankiConnectUrl: 'http://127.0.0.1:8765',
        ankiImageField: 'Image',
        sites: [{
            urlPattern: '127.0.0.1',
            imageContainerSelectors: [
                'div.muiltr-masn8', 'div.muiltr-79elbk', 'div.muiltr-u43rde',
                'div.muiltr-1r1or1s', 'div.muiltr-18sieki', 'div.muiltr-cns6dc',
                '.MuiBox-root.muiltr-1noqzsz', '.MuiBox-root.muiltr-1tapw32'
            ],
            overflowFixSelector: '.MuiBox-root.muiltr-13djdhf',
            contentRootSelector: '#root'
        }],
        debugMode: false,
        textOrientation: 'smart',
        dimmedOpacity: 0.3,
        fontMultiplierHorizontal: 1.0,
        fontMultiplierVertical: 1.0,
        boundingBoxAdjustment: 5,
        focusScaleMultiplier: 1.1,
        soloHoverMode: false,
        styleGroupMode: false,
        furiganaFilterEnabled: true,
        accentColor: 'minimal',
        autoMergeEnabled: true,
        autoMergeDistK: 1.3,
        autoMergeFontRatio: 1.3,
        autoMergePerpTol: 0.5,
        autoMergeOverlapMin: 0.1,
        autoMergeMinLineRatio: 0.5,
        autoMergeFontRatioForMixed: 1.1,
        autoMergeMixedMinOverlapRatio: 0.5,
        interactionMode: 'hover',
        mergeModifierKey: 'Control',
        deleteModifierKey: 'Alt',
        activationMode: 'longPress',
        brightnessMode: 'light',
        autoMergeMinDensity: 0.2,
    };

    // Global State
    let settings = { ...defaultSettings };
    let debugLog = [];
    const SETTINGS_KEY = 'mangatan_v29_hybrid';
    const ocrDataCache = new WeakMap();
    const managedElements = new Map();
    const managedContainers = new Map();
    const attachedAttributeObservers = new WeakMap();
    let activeSiteConfig = null;
    let measurementSpan = null;
    const UI = {};
    let activeImageForExport = null;
    let hideButtonTimer = null;
    const activeMergeSelections = new Map();
    let activeOverlay = null;

    let longPressState = { valid: false };
    let tapTracker = new WeakMap();
    const DOUBLE_TAP_THRESHOLD = 300;
    let resizeObserver, intersectionObserver, navigationObserver;
    const visibleImages = new Set();
    let animationFrameId = null;

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
             requestAnimationFrame(() => {
                 toast.classList.add('show');
             });
        });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
        }, duration);
    };

    const logDebug = (message) => {
        if (!settings.debugMode) return;
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(`[OCR Hybrid] ${logEntry}`);
        debugLog.push(logEntry);
        document.dispatchEvent(new CustomEvent('ocr-log-update'));
    };

    function fullCleanupAndReset() {
        logDebug("NAVIGATION OR CLEANUP: Starting full reset.");
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (containerObserver) containerObserver.disconnect();
        if (imageObserver) imageObserver.disconnect();
        for (const [img, state] of managedElements.entries()) {
            if (state.overlay?.isConnected) state.overlay.remove();
            resizeObserver.unobserve(img);
            intersectionObserver.unobserve(img);
        }
        managedElements.clear();
        managedContainers.clear();
        visibleImages.clear();
        activeMergeSelections.clear();
        activeOverlay = null;
        logDebug("All state maps cleared. Cleanup complete.");
    }

    function reinitializeScript() {
        logDebug("Re-initializing scanners.");
        activateScanner();
        observeChapters();
    }

    function setupNavigationObserver() {
    if (navigationObserver) {
        navigationObserver.disconnect();
    }

    const contentRootSelector = activeSiteConfig?.contentRootSelector;
    let targetNode = null;

    if (contentRootSelector) {
        targetNode = document.querySelector(contentRootSelector);
    }

    if (!targetNode) {
        targetNode = document.getElementById('root') || document.body;
    }

    if (!targetNode) {
        logDebug('Navigation observer: target not found. Skipping.');
        return;
    }

    const observerCallback = (mutations) => {
        let hasRemovals = false;
        for (const m of mutations) {
            if (m.removedNodes && m.removedNodes.length > 0) {
                hasRemovals = true;
                break;
            }
        }

        if (hasRemovals) {
            for (const [, state] of managedElements) {
                if (state?.overlay) {
                    state.overlay.style.visibility = 'hidden';
                    state.overlay.classList.remove('is-focused');
                    state.overlay.classList.add('is-inactive');
                }
            }
            if (activeOverlay) {
                hideActiveOverlay();
            }
        }

        for (const container of managedContainers.keys()) {
            if (!container.isConnected) {
                logDebug('Detected disconnected container via navigation observer. Firing FULL RESET.');
                navigationObserver.disconnect();
                fullCleanupAndReset();
                setTimeout(reinitializeScript, 250);
                return;
            }
        }

        for (const [img] of managedElements) {
            if (!img.isConnected) {
                logDebug('Detected disconnected image via navigation observer. Firing FULL RESET.');
                navigationObserver.disconnect();
                fullCleanupAndReset();
                setTimeout(reinitializeScript, 250);
                return;
            }
        }
    };

    navigationObserver = new MutationObserver(observerCallback);
    navigationObserver.observe(targetNode, {
        childList: true,
        subtree: true
    });

    logDebug(`Navigation observer attached to ${targetNode.id || targetNode.className || targetNode.nodeName}.`);
}

    function updateVisibleOverlaysPosition() {
    if (visibleImages.size === 0) {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    for (const img of Array.from(visibleImages)) {
        if (!img.isConnected) {
            visibleImages.delete(img);
            const state = managedElements.get(img);
            if (state) {
                state.overlay.style.visibility = 'hidden';
                cleanupManagedElement(img);
            }
            continue;
        }

        const state = managedElements.get(img);
        if (!state) { visibleImages.delete(img); continue; }

        const rect = img.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            state.overlay.style.visibility = 'hidden';
            continue;
        }

        Object.assign(state.overlay.style, {
            top: `${rect.top}px`,
            left: `${rect.left}px`
        });
    }

    animationFrameId = requestAnimationFrame(updateVisibleOverlaysPosition);
}

    function updateOverlayDimensionsAndStyles(img, state, rect = null) {
        if (!rect) rect = img.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            Object.assign(state.overlay.style, {
                width: `${rect.width}px`,
                height: `${rect.height}px`
            });
            if (state.lastWidth !== rect.width || state.lastHeight !== rect.height) {
                calculateAndApplyOptimalStyles_Optimized(state.overlay, rect);
                state.lastWidth = rect.width;
                state.lastHeight = rect.height;
            }
        }
    }
    const handleResize = (entries) => {
        for (const entry of entries) {
            const state = managedElements.get(entry.target);
            if (state) updateOverlayDimensionsAndStyles(entry.target, state, entry.contentRect);
        }
    };
    const handleIntersection = (entries) => {
    for (const entry of entries) {
        const img = entry.target;
        const state = managedElements.get(img);
        if (!state) continue;

        if (entry.isIntersecting) {
            visibleImages.add(img);

            state.overlay.classList.remove('is-inactive');
            state.overlay.style.visibility = '';

            if (animationFrameId === null) {
                animationFrameId = requestAnimationFrame(updateVisibleOverlaysPosition);
            }
        } else {
            visibleImages.delete(img);
            state.overlay.classList.remove('is-focused');
            if (activeOverlay === state.overlay) hideActiveOverlay();
        }
    }
};
    function cleanupManagedElement(img) {
        const state = managedElements.get(img);
        if (state) {
            resizeObserver.unobserve(img);
            intersectionObserver.unobserve(img);
            visibleImages.delete(img);
            activeMergeSelections.delete(state.overlay);
            state.overlay.remove();
            managedElements.delete(img);
            ocrDataCache.delete(img);
        }
    }
    const periodicCleanup = () => {
        if (activeSiteConfig?.overflowFixSelector) {
            const el = document.querySelector(activeSiteConfig.overflowFixSelector);
            if (el && el.style.overflow !== 'visible') el.style.overflow = 'visible';
        }
        for (const [img] of managedElements.entries()) {
            if (!img.isConnected) cleanupManagedElement(img);
        }
    };
    const imageObserver = new MutationObserver((mutations) => {
        for (const m of mutations)
            for (const n of m.addedNodes)
                if (n.nodeType === 1) {
                    if (n.tagName === 'IMG') observeImageForSrcChange(n);
                    else n.querySelectorAll('img').forEach(observeImageForSrcChange);
                }
    });
    function manageContainer(container) {
        if (!managedContainers.has(container)) {
            container.querySelectorAll('img').forEach(observeImageForSrcChange);
            imageObserver.observe(container, {
                childList: true,
                subtree: true
            });
            managedContainers.set(container, true);
        }
    }
    const containerObserver = new MutationObserver((mutations) => {
        if (!activeSiteConfig) return;
        const sel = activeSiteConfig.imageContainerSelectors.join(', ');
        for (const m of mutations)
            for (const n of m.addedNodes)
                if (n.nodeType === 1) {
                    if (n.matches(sel)) manageContainer(n);
                    else n.querySelectorAll(sel).forEach(manageContainer);
                }
    });
    function activateScanner() {
        activeSiteConfig = settings.sites.find(site => window.location.href.includes(site.urlPattern));
        if (!activeSiteConfig?.imageContainerSelectors?.length) return;
        const sel = activeSiteConfig.imageContainerSelectors.join(', ');
        document.querySelectorAll(sel).forEach(manageContainer);
        containerObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    const chapterObserver = new MutationObserver((mutations) => {
        for (const m of mutations)
            for (const n of m.addedNodes)
                if (n.nodeType === 1) {
                    const links = n.matches('a[href*="/manga/"][href*="/chapter/"]') ? [n] : n.querySelectorAll('a[href*="/manga/"][href*="/chapter/"]');
                    links.forEach(addOcrButtonToChapter);
                }
    });
    function observeChapters() {
        const targetNode = document.getElementById('root');
        if (targetNode) {
            targetNode.querySelectorAll('a[href*="/manga/"][href*="/chapter/"]').forEach(addOcrButtonToChapter);
            chapterObserver.observe(targetNode, {
                childList: true,
                subtree: true
            });
        }
    }
    function observeImageForSrcChange(img) {
        const process = (src) => {
            if (src?.includes('/api/v1/manga/')) {
                primeImageForOcr(img);
                return true;
            }
            return false;
        };

        process(img.src);

        if (attachedAttributeObservers.has(img)) return;

        const attrObserver = new MutationObserver((mutations) => {
            let srcChanged = false;
            for (const m of mutations) {
                if (m.attributeName === 'src') {
                    srcChanged = true;
                    break;
                }
            }

            if (srcChanged) {
                logDebug(`Image src changed: ${img.src}`);
                if (managedElements.has(img)) {
                    cleanupManagedElement(img);
                }

                process(img.src);
            }
        });

        attrObserver.observe(img, {
            attributes: true,
            attributeFilter: ['src']
        });

        attachedAttributeObservers.set(img, attrObserver);
    }
    function primeImageForOcr(img) {
        if (managedElements.has(img)) return;
        const doProcess = () => {
            if (managedElements.has(img) || ocrDataCache.get(img) === 'pending') return;
            img.crossOrigin = "anonymous";
            processImage(img, img.src);
        };
        if (img.complete && img.naturalHeight > 0) doProcess();
        else img.addEventListener('load', doProcess, {
            once: true
        });
    }

    async function processImage(img, sourceUrl) {
        if (ocrDataCache.has(img)) {
            if (ocrDataCache.get(img) !== 'pending') {
                 displayOcrResults(img);
            }
            return;
        }
        ocrDataCache.set(img, 'pending');
        let ocrRequestUrl = `${settings.ocrServerUrl}/ocr?url=${encodeURIComponent(sourceUrl)}`;
        if (settings.imageServerUser) {
            ocrRequestUrl += `&user=${encodeURIComponent(settings.imageServerUser)}&pass=${encodeURIComponent(settings.imageServerPassword)}`;
        }
        // Force server not to apply furigana filter, we use the client-side one
        ocrRequestUrl += '&furigana_filter=false';

        try {
            const data = await GM_fetch({ method: 'GET', url: ocrRequestUrl, timeout: 45000 });
            if (!Array.isArray(data)) {
                throw new Error('Server response format not valid (expected array).');
            }
            ocrDataCache.set(img, data);
            displayOcrResults(img);
        } catch (e) {
            logDebug(`OCR Error: ${e.message}`);
            ocrDataCache.delete(img);
        }
    }

    // Style calculation function from v29
    function calculateAndApplyStylesForSingleBox(box, imgRect) {
        if (!measurementSpan || !box || !imgRect || imgRect.width === 0 || imgRect.height === 0) return;
        const ocrData = box._ocrData, text = box.textContent || '';
        const availableWidth = box.offsetWidth + settings.boundingBoxAdjustment, availableHeight = box.offsetHeight + settings.boundingBoxAdjustment;
        if (!text || availableWidth <= 0 || availableHeight <= 0) return;
        const isMerged = ocrData?.isMerged, isMergedVertical = ocrData?.forcedOrientation === 'vertical';
        const PUNCTUATION_REGEX = /[、。！？\?\!\u2026\u3001\u3002\uff0c\uff0e\uff1f\uff01\u002c\u002e\uff1a\uff1b･]/;
        const hasPunctuation = PUNCTUATION_REGEX.test(text);
        const measurementText = text.replace(PUNCTUATION_REGEX, 'ア!');
        const findBestFitSize = (isVerticalSearch) => {
            measurementSpan.style.writingMode = isVerticalSearch ? 'vertical-rl' : 'horizontal-tb';
            measurementSpan.style.whiteSpace = isMerged ? 'normal' : 'nowrap';
            if (isMerged) {
                measurementSpan.innerHTML = box.innerHTML;
            } else {
                measurementSpan.textContent = isVerticalSearch && hasPunctuation ? measurementText : text;
            }
            let low = 1, high = 150, bestFit = 1;
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
            measurementSpan.style.whiteSpace = ''; measurementSpan.style.writingMode = ''; measurementSpan.innerHTML = '';
            return isMerged ? bestFit * 0.8 : bestFit;
        };
        const horizontalFitSize = findBestFitSize(false), verticalFitSize = findBestFitSize(true);
        let finalFontSize = 0, isVertical = false;
        if (isMergedVertical) {
            isVertical = true; finalFontSize = verticalFitSize;
        } else if (settings.textOrientation === 'forceVertical') {
            isVertical = true; finalFontSize = verticalFitSize;
        } else if (settings.textOrientation === 'forceHorizontal') {
            isVertical = false; finalFontSize = horizontalFitSize;
        } else {
            isVertical = verticalFitSize > horizontalFitSize; finalFontSize = isVertical ? verticalFitSize : horizontalFitSize;
        }
        const multiplier = isVertical ? settings.fontMultiplierVertical : settings.fontMultiplierHorizontal;
        box.style.fontSize = `${finalFontSize * multiplier}px`;
        box.classList.toggle('gemini-ocr-text-vertical', isVertical);
        box.style.justifyContent = 'center';
        if (!isMerged) box.style.whiteSpace = 'nowrap';
    }

    function calculateAndApplyOptimalStyles_Optimized(overlay, imgRect) {
        if (!measurementSpan || imgRect.width === 0 || imgRect.height === 0) return;
        const boxes = Array.from(overlay.querySelectorAll('.gemini-ocr-text-box'));
        if (boxes.length === 0) return;
        const baseStyle = getComputedStyle(boxes[0]);
        Object.assign(measurementSpan.style, { fontFamily: baseStyle.fontFamily, fontWeight: baseStyle.fontWeight, letterSpacing: baseStyle.letterSpacing, fontSize: '100px' });
        for (const box of boxes) {
            calculateAndApplyStylesForSingleBox(box, imgRect);
        }
        const groups = overlay.querySelectorAll('.gemini-ocr-group');
        groups.forEach(group => {
            const groupTextBoxes = Array.from(group.querySelectorAll('.gemini-ocr-text-box'));
            if (groupTextBoxes.length <= 1) return;
            const isFullyVerticalGroup = groupTextBoxes.every(box => box.classList.contains('gemini-ocr-text-vertical'));
            if (isFullyVerticalGroup) {
                const targetTopStyle = groupTextBoxes[0].style.top;
                if (targetTopStyle) {
                    for (let i = 1; i < groupTextBoxes.length; i++) groupTextBoxes[i].style.top = targetTopStyle;
                }
            }
        });
        measurementSpan.style.writingMode = 'horizontal-tb';
    }

    // Improved merge algorithm from v29
    class UnionFind {
        constructor(size) { this.parent = Array.from({ length: size }, (_, i) => i); this.rank = Array(size).fill(0); }
        find(i) { if (this.parent[i] === i) return i; return this.parent[i] = this.find(this.parent[i]); }
        union(i, j) {
            const rootI = this.find(i), rootJ = this.find(j);
            if (rootI !== rootJ) {
                if (this.rank[rootI] > this.rank[rootJ]) this.parent[rootJ] = rootI;
                else if (this.rank[rootI] < this.rank[rootJ]) this.parent[rootI] = rootJ;
                else { this.parent[rootJ] = rootI; this.rank[rootI]++; }
                return true;
            }
            return false;
        }
    }
    function autoMergeOcrData(lines, naturalWidth, naturalHeight) {
        if (!lines || lines.length < 2 || !naturalWidth || !naturalHeight) return lines.map(line => [line]);
        const CHUNK_MAX_HEIGHT = 4000, TARGET_CHUNK_HEIGHT = 2500;
        const processedLines = lines.map((line, index) => {
            const bbox = line.tightBoundingBox;
            const normScale = 1000 / naturalWidth;
            const normalizedBbox = { x: (bbox.x * naturalWidth) * normScale, y: (bbox.y * naturalHeight) * normScale, width: (bbox.width * naturalWidth) * normScale, height: (bbox.height * naturalHeight) * normScale };
            normalizedBbox.right = normalizedBbox.x + normalizedBbox.width; normalizedBbox.bottom = normalizedBbox.y + normalizedBbox.height; normalizedBbox.area = normalizedBbox.width * normalizedBbox.height;
            const isVertical = normalizedBbox.width <= normalizedBbox.height;
            const fontSize = isVertical ? normalizedBbox.width : normalizedBbox.height;
            return { originalIndex: index, isVertical, fontSize, bbox: normalizedBbox, pixelTop: bbox.y * naturalHeight, pixelBottom: (bbox.y + bbox.height) * naturalHeight };
        });
        processedLines.sort((a, b) => a.pixelTop - b.pixelTop);
        const allMergedGroups = [];
        let currentLineIndex = 0;
        while (currentLineIndex < processedLines.length) {
            let chunkStartIndex = currentLineIndex, chunkEndIndex = processedLines.length - 1;
            if (naturalHeight > TARGET_CHUNK_HEIGHT) {
                let currentChunkTop = processedLines[chunkStartIndex].pixelTop, maxBottomSeen = 0, bestSplitIndex = -1;
                for (let i = chunkStartIndex; i < processedLines.length; i++) {
                    const line = processedLines[i], currentChunkHeight = line.pixelBottom - currentChunkTop;
                    if (i > chunkStartIndex && line.pixelTop > maxBottomSeen) bestSplitIndex = i - 1;
                    maxBottomSeen = Math.max(maxBottomSeen, line.pixelBottom);
                    if (currentChunkHeight > TARGET_CHUNK_HEIGHT && bestSplitIndex !== -1) { chunkEndIndex = bestSplitIndex; break; }
                    if (currentChunkHeight > CHUNK_MAX_HEIGHT) { chunkEndIndex = Math.max(chunkStartIndex, i - 1); break; }
                }
            }
            const chunkLines = processedLines.slice(chunkStartIndex, chunkEndIndex + 1), uf = new UnionFind(chunkLines.length);
            const verticalLines = chunkLines.filter(l => l.isVertical), horizontalLines = chunkLines.filter(l => !l.isVertical);
            const median = (arr) => { if (arr.length === 0) return 0; const sorted = [...arr].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2); return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
            const robustMedianLineWidth = median(verticalLines.map(l => l.bbox.width)) || 20, robustMedianLineHeight = median(horizontalLines.map(l => l.bbox.height)) || 20;
            for (let i = 0; i < chunkLines.length; i++) {
                for (let j = i + 1; j < chunkLines.length; j++) {
                    const lineA = chunkLines[i], lineB = chunkLines[j];
                    if (lineA.isVertical !== lineB.isVertical) continue;
                    const fontRatio = Math.max(lineA.fontSize / lineB.fontSize, lineB.fontSize / lineA.fontSize);
                    const isLineAPrimary = lineA.fontSize >= (lineA.isVertical ? robustMedianLineWidth : robustMedianLineHeight) * settings.autoMergeMinLineRatio;
                    const isLineBPrimary = lineB.fontSize >= (lineB.isVertical ? robustMedianLineWidth : robustMedianLineHeight) * settings.autoMergeMinLineRatio;
                    const currentFontRatioThreshold = ((isLineAPrimary && !isLineBPrimary) || (!isLineAPrimary && isLineBPrimary)) ? settings.autoMergeFontRatioForMixed : settings.autoMergeFontRatio;
                    if (fontRatio > currentFontRatioThreshold) continue;
                    const averageSize = (lineA.fontSize + lineB.fontSize) / 2, distThreshold = settings.autoMergeDistK * averageSize;
                    let readingGap, perpOverlap, smallerPerpSize;
                    if (lineA.isVertical) {
                        readingGap = Math.max(0, Math.max(lineA.bbox.x, lineB.bbox.x) - Math.min(lineA.bbox.right, lineB.bbox.right));
                        perpOverlap = Math.max(0, Math.min(lineA.bbox.bottom, lineB.bbox.bottom) - Math.max(lineA.bbox.y, lineB.bbox.y));
                        smallerPerpSize = Math.min(lineA.bbox.height, lineB.bbox.height);
                    } else {
                        readingGap = Math.max(0, Math.max(lineA.bbox.y, lineB.bbox.y) - Math.min(lineA.bbox.bottom, lineB.bbox.bottom));
                        perpOverlap = Math.max(0, Math.min(lineA.bbox.right, lineB.bbox.right) - Math.max(lineA.bbox.x, lineB.bbox.x));
                        smallerPerpSize = Math.min(lineA.bbox.width, lineB.bbox.width);
                    }
                    if (readingGap > distThreshold) continue;
                    let overlapRatio = perpOverlap / smallerPerpSize, minOverlapNeeded = settings.autoMergeOverlapMin;
                    if (((isLineAPrimary && !isLineBPrimary) || (!isLineAPrimary && isLineBPrimary))) minOverlapNeeded = settings.autoMergeMixedMinOverlapRatio;
                    if (overlapRatio < minOverlapNeeded) continue;
                    if (lineA.isVertical) {
                        const verticalShift = Math.abs(lineA.bbox.y - lineB.bbox.y);
                        if (verticalShift > ((lineA.bbox.height + lineB.bbox.height) / 2) * 0.5) continue;
                    } else {
                        const horizontalShift = Math.abs(lineA.bbox.x - lineB.bbox.x);
                        if (horizontalShift > ((lineA.bbox.width + lineB.bbox.width) / 2) * 0.5) continue;
                    }
                    uf.union(i, j);
                }
            }
            const tempGroups = {};
            for (let i = 0; i < chunkLines.length; i++) { const root = uf.find(i); if (!tempGroups[root]) tempGroups[root] = []; tempGroups[root].push(chunkLines[i]); }
            const finalGroupsInChunk = Object.values(tempGroups).map(group => {
                if (group.length > 1) {
                    const groupBBox = group.reduce((acc, item) => { if (item.bbox.x < acc.x1) acc.x1 = item.bbox.x; if (item.bbox.y < acc.y1) acc.y1 = item.bbox.y; if (item.bbox.right > acc.x2) acc.x2 = item.bbox.right; if (item.bbox.bottom > acc.y2) acc.y2 = item.bbox.bottom; return acc; }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
                    const isVerticalGroup = (groupBBox.y2 - groupBBox.y1) > (groupBBox.x2 - groupBBox.x1);
                    group.sort((a, b) => {
                         const bA = a.bbox, bB = b.bbox;
                         if (isVerticalGroup) {
                            const centerA_X = bA.x + bA.width / 2, centerB_X = bB.x + bB.width / 2;
                            if (Math.abs(centerA_X - centerB_X) < (bA.width + bB.width) / 2 * 0.5) return bA.y - bB.y;
                            return bB.x - bA.x;
                         } else {
                             return bA.y - bB.y;
                         }
                    });
                }
                return group.map(processedLine => lines[processedLine.originalIndex]);
            });
            allMergedGroups.push(...finalGroupsInChunk);
            currentLineIndex = chunkEndIndex + 1;
        }
        return allMergedGroups;
    }

    // Display function from v29
    function displayOcrResults(targetImg) {
        if (managedElements.has(targetImg)) return;
        let data = ocrDataCache.get(targetImg);
        if (!data || data === 'pending' || !Array.isArray(data)) return;

        let processedData = data;
        if (settings.furiganaFilterEnabled && targetImg.naturalWidth && targetImg.naturalHeight) {
            processedData = applyFuriganaFilter(data, targetImg.naturalWidth, targetImg.naturalHeight);
        }

        let dataGroups = settings.autoMergeEnabled
            ? autoMergeOcrData(processedData, targetImg.naturalWidth, targetImg.naturalHeight)
            : processedData.map(item => [item]);

        const overlay = document.createElement('div');
        overlay.className = `gemini-ocr-decoupled-overlay interaction-mode-${settings.interactionMode}`;
        overlay.classList.toggle('solo-hover-mode', settings.soloHoverMode);
        overlay.classList.toggle('style-group-mode', settings.styleGroupMode);

        const fragment = document.createDocumentFragment();
        dataGroups.forEach((groupData) => {
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'gemini-ocr-group';
            const groupBBox = groupData.reduce((acc, item) => {
                const b = item.tightBoundingBox;
                const right = b.x + b.width, bottom = b.y + b.height;
                if (b.x < acc.x) acc.x = b.x; if (b.y < acc.y) acc.y = b.y;
                if (right > acc.right) acc.right = right; if (bottom > acc.bottom) acc.bottom = bottom;
                return acc;
            }, { x: 1, y: 1, right: 0, bottom: 0 });
            groupBBox.width = groupBBox.right - groupBBox.x; groupBBox.height = groupBBox.bottom - groupBBox.y;
            Object.assign(groupWrapper.style, { left: `${groupBBox.x*100}%`, top: `${groupBBox.y*100}%`, width: `${groupBBox.width*100}%`, height: `${groupBBox.height*100}%` });
            groupData.forEach((item, index) => {
                const originalIndex = data.indexOf(item);
                const ocrBox = document.createElement('div');
                ocrBox.className = 'gemini-ocr-text-box';
                const complexPunctuationRegex = /[!?\.\u2026\u22EE\uff0e\uff65]{2,}/g;
                let newText = item.text.replace(complexPunctuationRegex, (match) => {
                    const isEllipsisIntent = match.includes('.') || match.includes('\u2026') || match.includes('\u22EE') || match.includes('\uff0e');
                    if (isEllipsisIntent) return '…';
                    if (match.includes('?')) return '?';
                    return '!';
                });
                if (index === 0) newText = '\u200A' + newText;
                ocrBox.textContent = newText;
                ocrBox._ocrData = item; ocrBox._ocrDataIndex = originalIndex;
                const relativeLeft = (item.tightBoundingBox.x - groupBBox.x) / groupBBox.width, relativeTop = (item.tightBoundingBox.y - groupBBox.y) / groupBBox.height;
                const relativeWidth = item.tightBoundingBox.width / groupBBox.width, relativeHeight = item.tightBoundingBox.height / groupBBox.height;
                Object.assign(ocrBox.style, { left: `${relativeLeft*100}%`, top: `${relativeTop*100}%`, width: `${relativeWidth*100}%`, height: `${relativeHeight*100}%` });
                groupWrapper.appendChild(ocrBox);
            });
            fragment.appendChild(groupWrapper);
        });
        overlay.appendChild(fragment);

        if (IS_MOBILE) {
            const editActionBar = document.createElement('div');
            editActionBar.className = 'gemini-ocr-edit-action-bar';
            const mergeButton = document.createElement('button');
            mergeButton.className = 'edit-action-merge'; mergeButton.textContent = 'Merge';
            const deleteButton = document.createElement('button');
            deleteButton.className = 'edit-action-delete'; deleteButton.textContent = 'Delete';
            editActionBar.append(deleteButton, mergeButton);
            overlay.appendChild(editActionBar);
            mergeButton.addEventListener('click', (e) => { e.stopPropagation(); finalizeManualMerge(activeMergeSelections.get(overlay) || [], overlay); });
            deleteButton.addEventListener('click', (e) => { e.stopPropagation(); const selection = activeMergeSelections.get(overlay) || []; selection.forEach(group => handleGroupDelete(group, targetImg)); activeMergeSelections.set(overlay, []); updateEditActionBar(overlay); });
        }
        document.body.appendChild(overlay);
        const state = { overlay, lastWidth: 0, lastHeight: 0 };
        managedElements.set(targetImg, state);

        if (IS_MOBILE) {
            overlay.classList.add('is-inactive');
            overlay.addEventListener('click', handleMobileOverlayInteraction);
        } else {
            const show = () => { clearTimeout(hideButtonTimer); overlay.classList.add('is-focused'); UI.globalAnkiButton?.classList.remove('is-hidden'); activeImageForExport = targetImg; };
            const hide = () => { if (activeMergeSelections.has(overlay)) return; hideButtonTimer = setTimeout(() => { overlay.classList.remove('is-focused'); if (settings.styleGroupMode) overlay.classList.remove('has-manual-highlight'); if (activeImageForExport === targetImg) activeImageForExport = null; }, 1500); };
            [targetImg, overlay].forEach(el => { el.addEventListener('mouseenter', show); el.addEventListener('mouseleave', hide); });
            overlay.addEventListener('click', handleDesktopOverlayInteraction);
        }
        updateOverlayDimensionsAndStyles(targetImg, state);
        resizeObserver.observe(targetImg);
        intersectionObserver.observe(targetImg);
    }

    // Event Handlers and UI Logic (mostly from v29)
    function isModifierPressed(event, keyName) {
        if (!keyName) return false;
        const lowerKey = keyName.toLowerCase();
        switch (lowerKey) {
            case 'control': case 'ctrl': return event.ctrlKey;
            case 'alt': return event.altKey;
            case 'shift': return event.shiftKey;
            default: return false;
        }
    }
    function handleGroupDelete(groupElement, sourceImage) {
        const boxes = Array.from(groupElement.querySelectorAll('.gemini-ocr-text-box'));
        const dataIndicesToDelete = boxes.map(box => box._ocrDataIndex);
        const data = ocrDataCache.get(sourceImage);
        if (data && Array.isArray(data)) {
            const updatedData = data.filter((item, index) => !dataIndicesToDelete.includes(index));
            ocrDataCache.set(sourceImage, updatedData);
        }
        groupElement.remove();
    }
    function handleMergeSelection(groupElement, overlay) {
        let currentSelection = activeMergeSelections.get(overlay);
        if (!currentSelection) { currentSelection = []; activeMergeSelections.set(overlay, currentSelection); }
        const indexInSelection = currentSelection.indexOf(groupElement);
        if (indexInSelection > -1) { currentSelection.splice(indexInSelection, 1); groupElement.classList.remove('selected-for-merge'); }
        else { currentSelection.push(groupElement); groupElement.classList.add('selected-for-merge'); }
        if (currentSelection.length === 0) activeMergeSelections.delete(overlay);
        if (IS_MOBILE) updateEditActionBar(overlay);
    }
    function handleDesktopOverlayInteraction(e) {
        const overlay = e.currentTarget;
        const clickedGroup = e.target.closest('.gemini-ocr-group');
        if (isModifierPressed(e, settings.mergeModifierKey)) {
            if (clickedGroup) { e.stopPropagation(); handleMergeSelection(clickedGroup, overlay); }
            return;
        }
        if (!clickedGroup) {
            overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
            overlay.querySelectorAll('.gemini-ocr-group').forEach(g => g.classList.remove('has-manual-highlight'));
            overlay.classList.remove('has-manual-highlight');
            return;
        }
        e.stopPropagation();
        if (isModifierPressed(e, settings.deleteModifierKey)) {
            const [sourceImage] = [...managedElements].find(([, state]) => state.overlay === overlay) || [];
            if (sourceImage) handleGroupDelete(clickedGroup, sourceImage);
        } else if (settings.interactionMode === 'click') {
            overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
            overlay.querySelectorAll('.gemini-ocr-group').forEach(g => g.classList.remove('has-manual-highlight'));
            if (settings.styleGroupMode) clickedGroup.classList.add('has-manual-highlight');
            else clickedGroup.querySelectorAll('.gemini-ocr-text-box').forEach(box => box.classList.add('manual-highlight'));
            overlay.classList.add('has-manual-highlight');
        }
    }
    function triggerOverlayToggle(targetImg) {
        const overlayState = managedElements.get(targetImg);
        if (overlayState?.overlay) {
            if (overlayState.overlay === activeOverlay) hideActiveOverlay();
            else showMobileOverlay(overlayState.overlay, targetImg);
        }
    }
    function showMobileOverlay(overlay, image) {
        if (activeOverlay && activeOverlay !== overlay) hideActiveOverlay();
        activeOverlay = overlay; activeImageForExport = image;
        overlay.classList.remove('is-inactive'); overlay.classList.add('is-focused');
        const rect = image.getBoundingClientRect();
        calculateAndApplyOptimalStyles_Optimized(overlay, rect);
        UI.globalAnkiButton?.classList.remove('is-hidden');
        UI.globalEditButton?.classList.remove('is-hidden');
    }
    function hideActiveOverlay() {
    if (!activeOverlay) return;

    activeOverlay.classList.remove('is-focused', 'has-manual-highlight', 'edit-mode-active');

    if (IS_MOBILE) {
        activeOverlay.classList.add('is-inactive');
    }

    activeOverlay.querySelectorAll('.manual-highlight, .selected-for-merge')
        .forEach(b => b.classList.remove('manual-highlight', 'selected-for-merge'));
    activeOverlay.querySelectorAll('.gemini-ocr-group')
        .forEach(g => g.classList.remove('has-manual-highlight'));

    activeMergeSelections.delete(activeOverlay);

    UI.globalAnkiButton?.classList.add('is-hidden');
    UI.globalEditButton?.classList.add('is-hidden');
    UI.globalEditButton?.classList.remove('edit-active');

    activeOverlay = null;
    activeImageForExport = null;
}
    function handleTouchStart(event) {
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
        if (!activeOverlay) return;
        const target = event.target;
        if (!activeOverlay.contains(target) && !target.closest('#gemini-ocr-settings-button, #gemini-ocr-global-anki-export-btn, #gemini-ocr-global-edit-btn')) {
            hideActiveOverlay();
        }
    }
    function updateEditActionBar(overlay) {
        const selection = activeMergeSelections.get(overlay) || [], mergeBtn = overlay.querySelector('.edit-action-merge'), deleteBtn = overlay.querySelector('.edit-action-delete');
        if (mergeBtn) mergeBtn.disabled = selection.length < 2;
        if (deleteBtn) deleteBtn.disabled = selection.length === 0;
    }
    function handleMobileOverlayInteraction(event) {
        const overlay = event.currentTarget, clickedGroup = event.target.closest('.gemini-ocr-group');
        if (!clickedGroup) return;
        event.stopPropagation();
        if (overlay.classList.contains('edit-mode-active')) { handleMergeSelection(clickedGroup, overlay); }
        else {
            overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
            overlay.querySelectorAll('.gemini-ocr-group').forEach(g => g.classList.remove('has-manual-highlight'));
            if (settings.styleGroupMode) clickedGroup.classList.add('has-manual-highlight');
            else clickedGroup.querySelectorAll('.gemini-ocr-text-box').forEach(b => b.classList.add('manual-highlight'));
            overlay.classList.add('has-manual-highlight');
        }
    }
    function finalizeManualMerge(selectedGroups, overlay) {
        if (!selectedGroups || selectedGroups.length < 2) { selectedGroups.forEach(g => g.classList.remove('selected-for-merge')); return; }
        const [sourceImage] = [...managedElements].find(([, state]) => state.overlay === overlay) || [];
        if (!sourceImage || !sourceImage.naturalWidth) return;
        const { naturalWidth, naturalHeight } = sourceImage;
        const normScale = 1000 / naturalWidth;
        const allBoxElements = selectedGroups.flatMap(g => Array.from(g.querySelectorAll('.gemini-ocr-text-box')));
        const boxesWithPreciseCoords = allBoxElements.map(box => {
            const rawBbox = box._ocrData.tightBoundingBox;
            const preciseBbox = { x: (rawBbox.x * naturalWidth) * normScale, y: (rawBbox.y * naturalHeight) * normScale, width: (rawBbox.width * naturalWidth) * normScale, height: (rawBbox.height * naturalHeight) * normScale, };
            preciseBbox.right = preciseBbox.x + preciseBbox.width; preciseBbox.bottom = preciseBbox.y + preciseBbox.height;
            return { element: box, bbox: preciseBbox };
        });
        const groupPreciseBBox = boxesWithPreciseCoords.reduce((acc, item) => {
            const b = item.bbox; if (b.x < acc.x1) acc.x1 = b.x; if (b.y < acc.y1) acc.y1 = b.y; if (b.right > acc.x2) acc.x2 = b.right; if (b.bottom > acc.y2) acc.y2 = b.bottom; return acc;
        }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
        const groupFinalBBox = { x: (groupPreciseBBox.x1 / normScale) / naturalWidth, y: (groupPreciseBBox.y1 / normScale) / naturalHeight, width: ((groupPreciseBBox.x2 - groupPreciseBBox.x1) / normScale) / naturalWidth, height: ((groupPreciseBBox.y2 - groupPreciseBBox.y1) / normScale) / naturalHeight, };
        if (groupFinalBBox.width <= 0 || groupFinalBBox.height <= 0) return;
        const isVerticalGroup = (groupPreciseBBox.y2 - groupPreciseBBox.y1) > (groupPreciseBBox.x2 - groupPreciseBBox.x1);
        boxesWithPreciseCoords.sort((a, b) => {
            const bA = a.bbox, bB = b.bbox, SORT_TOLERANCE_RATIO = 0.15;
            if (isVerticalGroup) {
                const centerA_X = bA.x + bA.width / 2, centerB_X = bB.x + bB.width / 2, avgWidth = (bA.width + bB.width) / 2;
                if (Math.abs(centerA_X - centerB_X) < avgWidth * 0.8) return bA.y - bB.y; else return bB.x - bA.x;
            } else {
                const tolerance = ((bA.height + bB.height) / 2) * SORT_TOLERANCE_RATIO, yDiff = bA.y - bB.y;
                return Math.abs(yDiff) > tolerance ? yDiff : bA.x - bB.x;
            }
        });
        const newGroupWrapper = document.createElement('div');
        newGroupWrapper.className = 'gemini-ocr-group';
        Object.assign(newGroupWrapper.style, { left: `${groupFinalBBox.x*100}%`, top: `${groupFinalBBox.y*100}%`, width: `${groupFinalBBox.width*100}%`, height: `${groupFinalBBox.height*100}%` });
        boxesWithPreciseCoords.forEach((item, index) => {
            const box = item.element;
            if (index === 0) { if (!box.textContent.startsWith('\u200A')) box.textContent = '\u200A' + box.textContent; }
            else { if (box.textContent.startsWith('\u200A')) box.textContent = box.textContent.substring(1); }
            const itemBBox = box._ocrData.tightBoundingBox;
            const relativeLeft = (itemBBox.x - groupFinalBBox.x) / groupFinalBBox.width, relativeTop = (itemBBox.y - groupFinalBBox.y) / groupFinalBBox.height;
            const relativeWidth = itemBBox.width / groupFinalBBox.width, relativeHeight = itemBBox.height / groupFinalBBox.height;
            Object.assign(box.style, { left: `${relativeLeft*100}%`, top: `${relativeTop*100}%`, width: `${relativeWidth*100}%`, height: `${relativeHeight*100}%` });
            newGroupWrapper.appendChild(box);
        });
        overlay.appendChild(newGroupWrapper);
        selectedGroups.forEach(group => group.remove());
    }
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
            logDebug(`Anki Export Error: ${error.message}`); showToast(`Anki Export Failed: ${error.message}`, 'error'); return false;
        }
    }
    async function runProbingProcess(baseUrl, btn) {
        const originalText = btn.textContent;
        btn.disabled = true; btn.textContent = 'Starting...';
        const postData = { baseUrl: baseUrl, user: settings.imageServerUser, pass: settings.imageServerPassword };
        try {
            const data = await GM_fetch({ method: 'POST', url: `${settings.ocrServerUrl}/preprocess-chapter`, headers: { 'Content-Type': 'application/json' }, data: JSON.stringify(postData), timeout: 15000 });
            if (data.status === 'accepted') { btn.textContent = 'Accepted'; checkServerStatus(); }
            else { throw new Error(data.error || 'Job not accepted by server.'); }
        } catch (e) {
            if (e.message.includes('Connection failed')) { btn.textContent = 'Conn. Error!'; }
            else if (e.message.includes('timed out')) { btn.textContent = 'Timeout!'; }
            else { btn.textContent = 'Error!'; showToast(`Failed to start job: ${e.message}`, 'error'); }
        } finally {
            setTimeout(() => { if (btn.isConnected) { btn.textContent = originalText; btn.disabled = false; } }, 3500);
        }
    }
    async function batchProcessCurrentChapterFromURL() {
        const btn = UI.batchChapterBtn;
        const urlMatch = window.location.pathname.match(/\/manga\/\d+\/chapter\/\d+/);
        if (!urlMatch) { showToast('Error: URL does not match pattern.', 'error'); return; }
        const baseUrl = `${window.location.origin}/api/v1${urlMatch[0]}/page/`;
        await runProbingProcess(baseUrl, btn);
    }
    async function handleChapterBatchClick(event) {
        event.preventDefault(); event.stopPropagation();
        const btn = event.currentTarget;
        const chapterLink = btn.closest('a[href*="/manga/"][href*="/chapter/"]');
        if (!chapterLink?.href) return;
        const urlPath = new URL(chapterLink.href).pathname;
        const baseUrl = `${window.location.origin}/api/v1${urlPath}/page/`;
        await runProbingProcess(baseUrl, btn);
    }
    function addOcrButtonToChapter(chapterLinkElement) {
        const moreButton = chapterLinkElement.querySelector('button[aria-label="more"]');
        if (!moreButton) return;
        const actionContainer = moreButton.parentElement;
        if (!actionContainer || actionContainer.querySelector('.gemini-ocr-chapter-batch-btn')) return;
        const ocrButton = document.createElement('button');
        ocrButton.textContent = 'OCR'; ocrButton.className = 'gemini-ocr-chapter-batch-btn'; ocrButton.title = 'Queue this chapter for background pre-processing';
        ocrButton.addEventListener('click', handleChapterBatchClick);
        actionContainer.insertBefore(ocrButton, moreButton);
    }

    // UI Styles and Initialization (from v29)
    function applyStyles() {
        const theme = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.deepblue;
        const cssVars = `:root { --ocr-bg-color: rgba(10,25,40,0.85); --ocr-border-color: ${theme.main}0.6); --ocr-border-color-dim: ${theme.main}0.3); --ocr-border-color-hover: ${theme.main}0.8); --ocr-text-color: ${theme.text}; --ocr-highlight-bg-color: ${theme.main}0.9); --ocr-highlight-border-color: rgba(255,255,255,0.9); --ocr-highlight-text-color: ${theme.highlightText}; --ocr-highlight-shadow: 0 0 10px ${theme.main}0.5); --ocr-highlight-inset-shadow: inset 0 0 0 2px white; --modal-header-color: ${theme.main}1); --ocr-dimmed-opacity: ${settings.dimmedOpacity}; --ocr-focus-scale: ${settings.focusScaleMultiplier}; --ocr-input-bg: #262a33; --ocr-input-border: #3a404d; }`;
        let styleTag = document.getElementById('gemini-ocr-dynamic-styles');
        if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'gemini-ocr-dynamic-styles'; document.head.appendChild(styleTag); }
        styleTag.textContent = cssVars;
        document.body.className = document.body.className.replace(/\bocr-theme-\S+/g, '');
        document.body.classList.add(`ocr-theme-${settings.accentColor}`);
        if (IS_MOBILE) document.body.classList.toggle('ocr-brightness-dark', settings.brightnessMode === 'dark');
    }

    function createUI() {
        GM_addStyle(`
            /* --- OCR Overlay Styles (v29) --- old minimal: 1px solid var(--ocr-border-color-dim)*/
            .gemini-ocr-decoupled-overlay { position: fixed; top: 0; left: 0; z-index: 0; pointer-events: none; transition: opacity 0.2s; /* Removed will-change */ }
            .gemini-ocr-decoupled-overlay:not(.is-focused) { opacity: 0; visibility: hidden; }
            .gemini-ocr-group { pointer-events: auto; position: absolute; box-sizing: border-box;  }
            .gemini-ocr-text-box { font-weight: 500; position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; user-select: text; cursor: pointer;  overflow: hidden; color: var(--ocr-text-color); text-shadow: 0 1px 3px rgba(0,0,0,0.9); padding: 4px; }
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
        const mobileInteractionSettings = `<div class="settings-item"><label for="ocr-activation-mode">Activation Gesture</label><select id="ocr-activation-mode"><option value="longPress">Long Press</option><option value="doubleTap">Double Tap</option></select></div><div class="settings-item"><label for="ocr-brightness-mode">Theme Mode</label><select id="ocr-brightness-mode"><option value="light">Light</option><option value="dark">Dark</option></select></div>`;
        const desktopAdvancedInteraction = `<div class="settings-item"><label for="ocr-merge-key">Merge Modifier Key</label><input type="text" id="ocr-merge-key" placeholder="e.g. Control"></div><div class="settings-item"><label for="ocr-delete-key">Delete Modifier Key</label><input type="text" id="ocr-delete-key" placeholder="e.g. Alt"></div>`;

        document.body.insertAdjacentHTML('beforeend', `
            <button id="gemini-ocr-global-anki-export-btn" class="is-hidden" title="Export Screenshot to Anki">${ICONS.anki}</button>
            ${IS_MOBILE ? `<button id="gemini-ocr-global-edit-btn" class="is-hidden" title="Toggle Edit Mode">${ICONS.edit}</button>` : ''}
            <button id="gemini-ocr-settings-button" title="Open Settings">${ICONS.settings}</button>
            <div id="gemini-ocr-settings-modal" class="gemini-ocr-modal is-hidden">
                <div class="gemini-ocr-modal-container">
                    <div class="gemini-ocr-modal-header"><h2>Mangatan Settings (v29.1-h)</h2><button id="gemini-ocr-close-btn">${ICONS.close}</button></div>
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

    /**
     * Checks if critical settings that require a page reload have been changed.
     * @param {object} newSettings - The new settings from the form.
     * @param {object} oldSettings - The current (old) settings.
     * @returns {boolean} - true if reload is required.
     */
    function checkForCriticalChanges(newSettings, oldSettings) {
        // Keys that affect core functionality and require a full script restart/reload
        const criticalKeys = [
            'ocrServerUrl', 'imageServerUser', 'imageServerPassword',
            'ankiConnectUrl', 'ankiImageField', 'furiganaFilterEnabled',
            'autoMergeEnabled', 'autoMergeDistK', 'autoMergeFontRatio',
            'autoMergeOverlapMin', 'autoMergeMinLineRatio',
            'autoMergeFontRatioForMixed', 'autoMergeMixedMinOverlapRatio'
        ];

        for (const key of criticalKeys) {
            // Using '!=' for less strict comparison (e.g., 1.0 vs "1.0")
            if (newSettings[key] != oldSettings[key]) {
                 return true;
            }
        }

        // Check site configuration changes
        const oldSitesText = oldSettings.sites.map(s => [s.urlPattern, ...(s.imageContainerSelectors || []), s.contentRootSelector].filter(Boolean).join('; ')).join('\n');
        if (UI.sitesConfigTextarea.value !== oldSitesText) {
            return true;
        }

        return false;
    }
    /**
     * Applies settings that can be changed without a page reload.
     */
    function applyLiveSettings() {
        // 1. Apply CSS variable changes (color, opacity)
        applyStyles();

        // 2. Update classes on all existing overlays
        document.querySelectorAll('.gemini-ocr-decoupled-overlay').forEach(overlay => {
            overlay.classList.toggle('solo-hover-mode', settings.soloHoverMode);
            overlay.classList.toggle('style-group-mode', settings.styleGroupMode);
            // Update interaction mode class
            overlay.className = overlay.className.replace(/interaction-mode-\w+/, '');
            overlay.classList.add(`interaction-mode-${settings.interactionMode}`);
        });

        // 3. Update theme for mobile
        if (IS_MOBILE) {
             document.body.classList.toggle('ocr-brightness-dark', settings.brightnessMode === 'dark');
        }

        // 4. Recalculate styles for visible text boxes if font scale or orientation changed
        for (const img of visibleImages) {
            const state = managedElements.get(img);
            if (state && state.overlay) {
                const rect = img.getBoundingClientRect();
                calculateAndApplyOptimalStyles_Optimized(state.overlay, rect);
            }
        }
    }

    function bindUIEvents() {
        Object.assign(UI, { settingsButton: document.getElementById('gemini-ocr-settings-button'), settingsModal: document.getElementById('gemini-ocr-settings-modal'), debugModal: document.getElementById('gemini-ocr-debug-modal'), globalAnkiButton: document.getElementById('gemini-ocr-global-anki-export-btn'), globalEditButton: document.getElementById('gemini-ocr-global-edit-btn'), showAdvancedCheckbox: document.getElementById('show-advanced-settings'), advancedContainer: document.getElementById('advanced-settings-container'), accentColorSelect: document.getElementById('ocr-accent-color'), restoreBtn: document.getElementById('gemini-ocr-restore-btn'), closeBtn: document.getElementById('gemini-ocr-close-btn'), purgeCacheBtn: document.getElementById('gemini-ocr-purge-cache-btn'), batchChapterBtn: document.getElementById('gemini-ocr-batch-chapter-btn'), serverUrlInput: document.getElementById('gemini-ocr-server-url'), imageServerUserInput: document.getElementById('gemini-image-server-user'), imageServerPasswordInput: document.getElementById('gemini-image-server-password'), ankiUrlInput: document.getElementById('gemini-ocr-anki-url'), ankiFieldInput: document.getElementById('gemini-ocr-anki-field'), soloHoverCheckbox: document.getElementById('gemini-ocr-solo-hover-mode'), styleGroupModeCheckbox: document.getElementById('gemini-ocr-style-group-mode'), furiganaFilterCheckbox: document.getElementById('gemini-ocr-furigana-filter'), textOrientationSelect: document.getElementById('ocr-text-orientation'), dimmedOpacityInput: document.getElementById('ocr-dimmed-opacity'), fontMultiplierHorizontalInput: document.getElementById('ocr-font-multiplier-horizontal'), fontMultiplierVerticalInput: document.getElementById('ocr-font-multiplier-vertical'), focusScaleMultiplierInput: document.getElementById('ocr-focus-scale-multiplier'), statusDiv: document.getElementById('gemini-ocr-server-status'), saveBtn: document.getElementById('gemini-ocr-save-btn'), autoMergeEnabledCheckbox: document.getElementById('gemini-ocr-auto-merge-enabled'), autoMergeDistKInput: document.getElementById('ocr-auto-merge-dist-k'), autoMergeFontRatioInput: document.getElementById('ocr-auto-merge-font-ratio'), autoMergeOverlapMinInput: document.getElementById('ocr-auto-merge-overlap-min'), autoMergeMinLineRatioInput: document.getElementById('ocr-auto-merge-min-line-ratio'), autoMergeFontRatioForMixedInput: document.getElementById('ocr-auto-merge-font-ratio-mixed'), autoMergeMixedMinOverlapRatioInput: document.getElementById('ocr-auto-merge-mixed-min-overlap-ratio'), debugModeCheckbox: document.getElementById('gemini-ocr-debug-mode'), sitesConfigTextarea: document.getElementById('gemini-ocr-sites-config'), debugBtn: document.getElementById('gemini-ocr-debug-btn'), closeDebugBtn: document.getElementById('gemini-ocr-close-debug-btn'), debugLogTextarea: document.getElementById('gemini-ocr-debug-log'), });
        if (IS_MOBILE) { Object.assign(UI, { activationModeSelect: document.getElementById('ocr-activation-mode'), brightnessModeSelect: document.getElementById('ocr-brightness-mode') }); }
        else { Object.assign(UI, { interactionModeSelect: document.getElementById('ocr-interaction-mode'), mergeKeyInput: document.getElementById('ocr-merge-key'), deleteKeyInput: document.getElementById('ocr-delete-key') }); }

        const getSettingsFromForm = () => {
            let formSettings = {};
            Object.assign(formSettings, { ocrServerUrl: UI.serverUrlInput.value.trim(), imageServerUser: UI.imageServerUserInput.value.trim(), imageServerPassword: UI.imageServerPasswordInput.value, ankiConnectUrl: UI.ankiUrlInput.value.trim(), ankiImageField: UI.ankiFieldInput.value.trim(), soloHoverMode: UI.soloHoverCheckbox.checked, styleGroupMode: UI.styleGroupModeCheckbox.checked, furiganaFilterEnabled: UI.furiganaFilterCheckbox.checked, textOrientation: UI.textOrientationSelect.value, accentColor: UI.accentColorSelect.value, dimmedOpacity: (parseInt(UI.dimmedOpacityInput.value, 10) || 30) / 100, fontMultiplierHorizontal: parseFloat(UI.fontMultiplierHorizontalInput.value) || 1.0, fontMultiplierVertical: parseFloat(UI.fontMultiplierVerticalInput.value) || 1.0, focusScaleMultiplier: parseFloat(UI.focusScaleMultiplierInput.value) || 1.1, autoMergeEnabled: UI.autoMergeEnabledCheckbox.checked, autoMergeDistK: parseFloat(UI.autoMergeDistKInput.value) || 1.3, autoMergeFontRatio: parseFloat(UI.autoMergeFontRatioInput.value) || 1.3, autoMergeOverlapMin: parseFloat(UI.autoMergeOverlapMinInput.value) || 0.1, autoMergeMinLineRatio: parseFloat(UI.autoMergeMinLineRatioInput.value) || 0.5, autoMergeFontRatioForMixed: parseFloat(UI.autoMergeFontRatioForMixedInput.value) || 1.1, autoMergeMixedMinOverlapRatio: parseFloat(UI.autoMergeMixedMinOverlapRatioInput.value) || 0.5, debugMode: UI.debugModeCheckbox.checked });
            try {
                // Parse site configurations
                formSettings.sites = UI.sitesConfigTextarea.value.split('\n').filter(line => line.trim()).map(line => { const parts = line.split(';').map(s => s.trim()); return { urlPattern: parts[0] || '', overflowFixSelector: '', contentRootSelector: IS_MOBILE ? (parts.length > 1 ? parts[parts.length -1] : '#root') : '', imageContainerSelectors: parts.slice(1, IS_MOBILE ? -1 : undefined).filter(s => s) }; });
            } catch {
                formSettings.sites = settings.sites; // Fallback
            }
            if (IS_MOBILE) { Object.assign(formSettings, { activationMode: UI.activationModeSelect.value, brightnessMode: UI.brightnessModeSelect.value }); }
            else { Object.assign(formSettings, { interactionMode: UI.interactionModeSelect.value, mergeModifierKey: UI.mergeKeyInput.value.trim(), deleteModifierKey: UI.deleteKeyInput.value.trim() }); }
            return formSettings;
        };

        const updateSaveButtonState = () => {
            const formSettings = getSettingsFromForm();
            if (checkForCriticalChanges(formSettings, settings)) {
                UI.saveBtn.textContent = 'Save & Reload';
            } else {
                UI.saveBtn.textContent = 'Save Changes';
            }
        };

        const openSettings = () => {
            const advancedIsModified = settings.fontMultiplierHorizontal !== defaultSettings.fontMultiplierHorizontal || settings.debugMode !== defaultSettings.debugMode || settings.styleGroupMode !== defaultSettings.styleGroupMode || settings.furiganaFilterEnabled !== defaultSettings.furiganaFilterEnabled;
            UI.showAdvancedCheckbox.checked = advancedIsModified; UI.advancedContainer.style.display = advancedIsModified ? 'block' : 'none';
            populateUIFields();
            updateSaveButtonState();
            UI.settingsModal.classList.remove('is-hidden');
        };

        // Listeners for dynamic button update
        const allFormElements = UI.settingsModal.querySelectorAll('input, select, textarea');
        allFormElements.forEach(el => {
            el.addEventListener('input', updateSaveButtonState);
            el.addEventListener('change', updateSaveButtonState);
        });

        UI.settingsButton.addEventListener('click', openSettings);
        UI.closeBtn.addEventListener('click', () => UI.settingsModal.classList.add('is-hidden'));
        UI.settingsModal.addEventListener('click', (e) => { if (e.target === UI.settingsModal) UI.settingsModal.classList.add('is-hidden'); });
        UI.showAdvancedCheckbox.addEventListener('change', (e) => { UI.advancedContainer.style.display = e.target.checked ? 'block' : 'none'; });
        UI.globalAnkiButton.addEventListener('click', async () => {
            if (!activeImageForExport) return;
            const btn = UI.globalAnkiButton; const originalColor = btn.style.backgroundColor;
            btn.innerHTML = ICONS.cross; btn.disabled = true;
            const success = await exportImageToAnki(activeImageForExport);
            btn.innerHTML = success ? ICONS.check : ICONS.cross; btn.style.backgroundColor = success ? ACCENT_COLORS.green.main + '0.9)' : ACCENT_COLORS.red.main + '0.9)';
            setTimeout(() => { btn.innerHTML = ICONS.anki; btn.style.backgroundColor = originalColor; btn.disabled = false; }, 2000);
        });
        UI.statusDiv.addEventListener('click', checkServerStatus); UI.purgeCacheBtn.addEventListener('click', purgeServerCache); UI.batchChapterBtn.addEventListener('click', batchProcessCurrentChapterFromURL);
        UI.debugBtn.addEventListener('click', () => { UI.debugLogTextarea.value = debugLog.join('\n'); UI.debugModal.classList.remove('is-hidden'); UI.debugLogTextarea.scrollTop = UI.debugLogTextarea.scrollHeight; });
        UI.closeDebugBtn.addEventListener('click', () => UI.debugModal.classList.add('is-hidden'));
        UI.restoreBtn.addEventListener('click', async () => { if (confirm('Are you sure you want to restore all settings to their default values? This will reload the page.')) { await GM_setValue(SETTINGS_KEY, JSON.stringify(defaultSettings)); window.location.reload(); } });

        // Save logic
        UI.saveBtn.addEventListener('click', async () => {
            const newSettings = getSettingsFromForm();
            const needsReload = checkForCriticalChanges(newSettings, settings);

            try {
                await GM_setValue(SETTINGS_KEY, JSON.stringify(newSettings));
                settings = { ...settings, ...newSettings }; // Update global settings object

                if (needsReload) {
                    window.location.reload();
                } else {
                    applyLiveSettings(); // Apply non-critical changes immediately
                    UI.settingsModal.classList.add('is-hidden'); // Close modal
                }
            }
            catch (e) {
                showToast(`Error saving settings: ${e.message}`, 'error');
            }
        });

        document.addEventListener('ocr-log-update', () => { if (UI.debugModal && !UI.debugModal.classList.contains('is-hidden')) { UI.debugLogTextarea.value = debugLog.join('\n'); UI.debugLogTextarea.scrollTop = UI.debugLogTextarea.scrollHeight; } });
    }

    function populateUIFields() {
        UI.serverUrlInput.value = settings.ocrServerUrl; UI.ankiUrlInput.value = settings.ankiConnectUrl; UI.ankiFieldInput.value = settings.ankiImageField; UI.accentColorSelect.value = settings.accentColor; UI.textOrientationSelect.value = settings.textOrientation; UI.soloHoverCheckbox.checked = settings.soloHoverMode; UI.styleGroupModeCheckbox.checked = settings.styleGroupMode; UI.furiganaFilterCheckbox.checked = settings.furiganaFilterEnabled; UI.autoMergeEnabledCheckbox.checked = settings.autoMergeEnabled;
        if (IS_MOBILE) { UI.activationModeSelect.value = settings.activationMode; UI.brightnessModeSelect.value = settings.brightnessMode; }
        else { UI.interactionModeSelect.value = settings.interactionMode; UI.mergeKeyInput.value = settings.mergeModifierKey; UI.deleteKeyInput.value = settings.deleteModifierKey; }
        UI.dimmedOpacityInput.value = Math.round(settings.dimmedOpacity * 100); UI.focusScaleMultiplierInput.value = settings.focusScaleMultiplier; UI.fontMultiplierHorizontalInput.value = settings.fontMultiplierHorizontal; UI.fontMultiplierVerticalInput.value = settings.fontMultiplierVertical; UI.autoMergeDistKInput.value = settings.autoMergeDistK; UI.autoMergeFontRatioInput.value = settings.autoMergeFontRatio; UI.autoMergeOverlapMinInput.value = settings.autoMergeOverlapMin; UI.autoMergeMinLineRatioInput.value = settings.autoMergeMinLineRatio; UI.autoMergeFontRatioForMixedInput.value = settings.autoMergeFontRatioForMixed; UI.autoMergeMixedMinOverlapRatioInput.value = settings.autoMergeMixedMinOverlapRatio; UI.imageServerUserInput.value = settings.imageServerUser || ''; UI.imageServerPasswordInput.value = settings.imageServerPassword || ''; UI.debugModeCheckbox.checked = settings.debugMode;
        UI.sitesConfigTextarea.value = settings.sites.map(s => [s.urlPattern, ...(s.imageContainerSelectors || []), s.contentRootSelector].filter(Boolean).join('; ')).join('\n');
    }
    async function checkServerStatus() {
        const serverUrl = UI.serverUrlInput.value.trim() || settings.ocrServerUrl;
        if (!serverUrl) return;
        UI.statusDiv.textContent = '• Connecting...'; UI.statusDiv.style.color = '#e67e22';
        try { const data = await GM_fetch({ method: 'GET', url: serverUrl, timeout: 5000 }); if (data.status === 'running') { const jobs = data.active_preprocess_jobs ?? '0'; UI.statusDiv.innerHTML = `<span style="color:#2ecc71">● Online</span> (Cache: ${data.items_in_cache} | Active Jobs: ${jobs})`; } else { UI.statusDiv.innerHTML = `<span style="color:#e74c3c">● Unresponsive</span>`; } }
        catch (e) { if (e.message.includes('Timed Out')) { UI.statusDiv.innerHTML = `<span style="color:#e74c3c">● Timed Out</span>`; } else if (e.message.includes('Connection failed')) { UI.statusDiv.innerHTML = `<span style="color:#e74c3c">● Connection Failed</span>`; } else { UI.statusDiv.innerHTML = `<span style="color:#e74c3c">● Error</span>`; } }
    }
    async function purgeServerCache() {
        if (!confirm("Permanently delete all items from the server's OCR cache?")) return;
        const btn = UI.purgeCacheBtn; const originalText = btn.textContent;
        btn.disabled = true; btn.textContent = 'Purging...';
        try { await GM_fetch({ method: 'POST', url: `${settings.ocrServerUrl}/purge-cache`, timeout: 10000 }); showToast('Cache purged successfully.', 'success'); checkServerStatus(); }
        catch (e) { showToast(`Failed to purge cache: ${e.message}`, 'error'); }
        finally { btn.disabled = false; btn.textContent = originalText; }
    }
    function createMeasurementSpan() {
        if (measurementSpan) return;
        measurementSpan = document.createElement('span'); measurementSpan.style.cssText = `position:fixed!important;visibility:hidden!important;height:auto!important;width:auto!important;white-space:nowrap!important;z-index:-1!important;top:-9999px;left:-9999px;`; document.body.appendChild(measurementSpan);
    }
    function handleModifierKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        const mergeKey = settings.mergeModifierKey.toLowerCase(), deleteKey = settings.deleteModifierKey.toLowerCase(), key = e.key.toLowerCase();
        if (key === mergeKey || key === deleteKey) document.body.classList.add('ocr-edit-mode-active');
    }
    function handleModifierKeyUp(e) {
        const mergeKey = settings.mergeModifierKey.toLowerCase(), deleteKey = settings.deleteModifierKey.toLowerCase(), key = e.key.toLowerCase();
        if (key === mergeKey) { for (const [overlay, selection] of activeMergeSelections.entries()) { if (selection.length > 1) { finalizeManualMerge(selection, overlay); } else { selection.forEach(g => g.classList.remove('selected-for-merge')); } } activeMergeSelections.clear(); }
        if (key === mergeKey || key === deleteKey) document.body.classList.remove('ocr-edit-mode-active');
    }
function setupSPARouterObserver() {
        let lastUrl = location.href;

        const onUrlChange = () => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                logDebug(`URL change detected: ${lastUrl} -> ${currentUrl}. Firing FULL RESET.`);
                lastUrl = currentUrl;
                fullCleanupAndReset();
                setTimeout(reinitializeScript, 300);
            }
        };

        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            onUrlChange();
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            onUrlChange();
        };

        window.addEventListener('popstate', onUrlChange);
    }
    async function init() {
        const loadedSettings = await GM_getValue(SETTINGS_KEY);
        if (loadedSettings) {
            try { const parsedSettings = JSON.parse(loadedSettings); settings = { ...defaultSettings, ...parsedSettings }; if (!parsedSettings.sites) settings.sites = defaultSettings.sites; } catch (e) { settings = { ...defaultSettings }; }
        }
        createUI();
        bindUIEvents();
        applyStyles();
        createMeasurementSpan();
        resizeObserver = new ResizeObserver(handleResize);
        intersectionObserver = new IntersectionObserver(handleIntersection, { rootMargin: '100px 0px' });
        if (IS_MOBILE) {
            document.body.addEventListener('touchstart', handleTouchStart, { passive: false }); document.body.addEventListener('touchmove', handleTouchMove, { passive: false }); document.body.addEventListener('touchend', handleTouchEnd); document.body.addEventListener('touchcancel', handleTouchEnd); window.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false }); document.body.addEventListener('click', handleGlobalTap, true);
            UI.globalEditButton.addEventListener('click', (e) => {
                e.stopPropagation(); if (activeOverlay) { activeOverlay.classList.toggle('edit-mode-active'); UI.globalEditButton.classList.toggle('edit-active'); if (!activeOverlay.classList.contains('edit-mode-active')) { activeMergeSelections.delete(activeOverlay); activeOverlay.querySelectorAll('.selected-for-merge').forEach(el => el.classList.remove('selected-for-merge')); } else { updateEditActionBar(activeOverlay); } }
            });
        } else {
            setInterval(periodicCleanup, 5000);
            window.addEventListener('keydown', handleModifierKeyDown);
            window.addEventListener('keyup', handleModifierKeyUp);
            window.addEventListener('blur', () => document.body.classList.remove('ocr-edit-mode-active'));
        }
        populateUIFields();
      setupSPARouterObserver();
        reinitializeScript();
        if (IS_MOBILE) setupNavigationObserver();
    }
    init().catch(e => console.error(`[OCR Universal] Fatal Initialization Error: ${e.message}`, e));
})();