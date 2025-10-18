// ==UserScript==
// @name         Mangatan
// @namespace    http://tampermonkey.net/
// @version      26
// @description  A universal OCR script that automatically adapts to your device. Features desktop-class auto-merging, hotkeys, and smooth rendering, combined with mobile-optimized touch controls and UI.
// @author       1Selxo, Kellen, Gemini
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

    // --- Universal Device Detection ---
    const IS_MOBILE = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // --- Default Settings (Used for initialization and reset) ---
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
    };


    // --- Global State ---
    let settings = { ...defaultSettings };
    let debugLog = [];
    const SETTINGS_KEY = 'mangatan_v26';
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

    const ACCENT_COLORS = {
        white: { main: 'rgba(236, 240, 241,', text: '#000000', highlightText: '#000000'},
        green: { main: 'rgba(46, 204, 113,', text: '#FFFFFF', highlightText: '#000000'},
        blue: { main: 'rgba(52, 152, 219,', text: '#FFFFFF', highlightText: '#000000'},
        purple: { main: 'rgba(155, 89, 182,', text: '#FFFFFF', highlightText: '#000000'},
        pink: { main: 'rgba(232, 67, 147,', text: '#FFFFFF', highlightText: '#000000'},
        red: { main: 'rgba(231, 76, 60,', text: '#FFFFFF', highlightText: '#000000'},
        deepblue: { main: 'rgba(0,191,255,', text: '#FFFFFF', highlightText: '#000000' },
        minimal: { main: 'rgba(127, 127, 127,', text: 'transparent', highlightText: 'transparent' },
    };

    const logDebug = (message) => {
        if (!settings.debugMode) return;
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(`[OCR Universal] ${logEntry}`);
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
        if (!IS_MOBILE) return;
        const contentRootSelector = activeSiteConfig?.contentRootSelector;
        if (!contentRootSelector) return;
        const targetNode = document.querySelector(contentRootSelector);
        if (!targetNode) return;
        navigationObserver = new MutationObserver(() => {
            fullCleanupAndReset();
            setTimeout(reinitializeScript, 250);
            navigationObserver.disconnect();
        });
        navigationObserver.observe(targetNode, {
            childList: true
        });
        logDebug(`Robust mobile navigation observer attached to ${targetNode.id || targetNode.className}.`);
    }

    function updateVisibleOverlaysPosition() {
        for (const img of visibleImages) {
            const state = managedElements.get(img);
            if (state) {
                const rect = img.getBoundingClientRect();
                Object.assign(state.overlay.style, {
                    top: `${rect.top}px`,
                    left: `${rect.left}px`
                });
            }
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
            if (entry.isIntersecting) {
                if (!visibleImages.has(img)) {
                    visibleImages.add(img);
                    const state = managedElements.get(img);
                    if (state) state.overlay.style.visibility = 'visible';
                    if (animationFrameId === null) animationFrameId = requestAnimationFrame(updateVisibleOverlaysPosition);
                }
            } else {
                if (visibleImages.has(img)) {
                    visibleImages.delete(img);
                    const state = managedElements.get(img);
                    if (state) state.overlay.style.visibility = 'hidden';
                    if (visibleImages.size === 0 && animationFrameId !== null) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            }
        }
    };

    function cleanupManagedElement(img) {
        const state = managedElements.get(img);
        if (state) {
            logDebug(`Garbage collecting disconnected overlay`);
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
            logDebug(`New container found: ${container.className}`);
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
        if (process(img.src) || attachedAttributeObservers.has(img)) return;
        const attrObserver = new MutationObserver((mutations) => {
            if (mutations.some(m => m.attributeName === 'src' && process(img.src))) {
                attrObserver.disconnect();
                attachedAttributeObservers.delete(img);
            }
        });
        attrObserver.observe(img, {
            attributes: true
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

    function processImage(img, sourceUrl) {
        if (ocrDataCache.has(img)) {
            displayOcrResults(img);
            return;
        }
        logDebug(`Requesting OCR for ...${sourceUrl.slice(-30)}`);
        ocrDataCache.set(img, 'pending');
        let ocrRequestUrl = `${settings.ocrServerUrl}/ocr?url=${encodeURIComponent(sourceUrl)}`;
        if (settings.imageServerUser) ocrRequestUrl += `&user=${encodeURIComponent(settings.imageServerUser)}&pass=${encodeURIComponent(settings.imageServerPassword)}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: ocrRequestUrl,
            timeout: 45000,
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data.error) throw new Error(data.error);
                    if (!Array.isArray(data)) throw new Error('Server response not valid.');
                    ocrDataCache.set(img, data);
                    displayOcrResults(img);
                } catch (e) {
                    logDebug(`OCR Error: ${e.message}`);
                    ocrDataCache.delete(img);
                }
            },
            onerror: () => {
                logDebug(`Connection error.`);
                ocrDataCache.delete(img);
            },
            ontimeout: () => {
                logDebug(`Request timed out.`);
                ocrDataCache.delete(img);
            }
        });
    }

    function calculateAndApplyStylesForSingleBox(box, imgRect) {
        if (!measurementSpan || !box || !imgRect || imgRect.width === 0 || imgRect.height === 0) return;
        const ocrData = box._ocrData;
        const text = box.textContent || '';
        const availableWidth = box.offsetWidth + settings.boundingBoxAdjustment;
        const availableHeight = box.offsetHeight + settings.boundingBoxAdjustment;
        if (!text || availableWidth <= 0 || availableHeight <= 0) return;
        const isMerged = ocrData?.isMerged;
        const isMergedVertical = ocrData?.forcedOrientation === 'vertical';
        const findBestFitSize = (isVerticalSearch) => {
            measurementSpan.style.writingMode = isVerticalSearch ? 'vertical-rl' : 'horizontal-tb';
            if (isMerged) {
                measurementSpan.innerHTML = box.innerHTML;
                measurementSpan.style.whiteSpace = 'normal';
            } else {
                measurementSpan.textContent = text;
                measurementSpan.style.whiteSpace = 'nowrap';
            }
            let low = 1,
                high = 200,
                bestSize = 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (mid <= 0) break;
                measurementSpan.style.fontSize = `${mid}px`;
                let textFits = isVerticalSearch ? measurementSpan.offsetHeight <= availableHeight : measurementSpan.offsetWidth <= availableWidth;
                if (textFits) {
                    bestSize = isMerged ? mid * 0.8 : mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            measurementSpan.style.whiteSpace = '';
            measurementSpan.style.writingMode = '';
            measurementSpan.innerHTML = '';
            return bestSize;
        };
        const horizontalFitSize = findBestFitSize(false);
        const verticalFitSize = findBestFitSize(true);
        let finalFontSize = 0,
            isVertical = false;
        if (isMergedVertical) {
            isVertical = true;
            finalFontSize = verticalFitSize;
        } else if (settings.textOrientation === 'forceVertical') {
            isVertical = true;
            finalFontSize = verticalFitSize;
        } else if (settings.textOrientation === 'forceHorizontal') {
            isVertical = false;
            finalFontSize = horizontalFitSize;
        } else {
            isVertical = verticalFitSize > horizontalFitSize;
            finalFontSize = isVertical ? verticalFitSize : horizontalFitSize;
        }
        const multiplier = isVertical ? settings.fontMultiplierVertical : settings.fontMultiplierHorizontal;
        box.style.fontSize = `${finalFontSize * multiplier}px`;
        box.classList.toggle('ocr-text-vertical', isVertical);
        if (!isMerged) {
            box.style.whiteSpace = 'nowrap';
        }
    }

    function calculateAndApplyOptimalStyles_Optimized(overlay, imgRect) {
        if (!measurementSpan || imgRect.width === 0 || imgRect.height === 0) return;
        const boxes = Array.from(overlay.querySelectorAll('.ocr-text-box'));
        if (boxes.length === 0) return;
        const baseStyle = getComputedStyle(boxes[0]);
        Object.assign(measurementSpan.style, {
            fontFamily: baseStyle.fontFamily,
            fontWeight: baseStyle.fontWeight,
            letterSpacing: baseStyle.letterSpacing,
            fontSize: '100px'
        });
        for (const box of boxes) {
            calculateAndApplyStylesForSingleBox(box, imgRect);
        }
        measurementSpan.style.writingMode = 'horizontal-tb';
    }

    class UnionFind {
        constructor(size) {
            this.parent = Array.from({
                length: size
            }, (_, i) => i);
            this.rank = Array(size).fill(0);
        }
        find(i) {
            if (this.parent[i] === i) return i;
            return this.parent[i] = this.find(this.parent[i]);
        }
        union(i, j) {
            const rootI = this.find(i);
            const rootJ = this.find(j);
            if (rootI !== rootJ) {
                if (this.rank[rootI] > this.rank[rootJ]) {
                    this.parent[rootJ] = rootI;
                } else if (this.rank[rootI] < this.rank[rootJ]) {
                    this.parent[rootI] = rootJ;
                } else {
                    this.parent[rootJ] = rootI;
                    this.rank[rootI]++;
                }
                return true;
            }
            return false;
        }
    }

    function autoMergeOcrData(lines, naturalWidth, naturalHeight) {
        if (!lines || lines.length < 2 || !naturalWidth || !naturalHeight) return lines.map(line => [line]);
        const CHUNK_MAX_HEIGHT = 3000;
        const processedLines = lines.map((line, index) => {
            const bbox = line.tightBoundingBox;
            const pixelTop = bbox.y * naturalHeight;
            const pixelBottom = (bbox.y + bbox.height) * naturalHeight;
            const normScale = 1000 / naturalWidth;
            const normalizedBbox = {
                x: (bbox.x * naturalWidth) * normScale,
                y: (bbox.y * naturalHeight) * normScale,
                width: (bbox.width * naturalWidth) * normScale,
                height: (bbox.height * naturalHeight) * normScale
            };
            normalizedBbox.right = normalizedBbox.x + normalizedBbox.width;
            normalizedBbox.bottom = normalizedBbox.y + normalizedBbox.height;
            const isVertical = normalizedBbox.width <= normalizedBbox.height;
            const fontSize = isVertical ? normalizedBbox.width : normalizedBbox.height;
            return {
                originalIndex: index,
                isVertical,
                fontSize,
                bbox: normalizedBbox,
                pixelTop,
                pixelBottom
            };
        });
        processedLines.sort((a, b) => a.pixelTop - b.pixelTop);
        const allMergedGroups = [];
        let currentLineIndex = 0;
        while (currentLineIndex < processedLines.length) {
            const chunkStartIndex = currentLineIndex;
            let chunkEndIndex = processedLines.length - 1;
            if (naturalHeight > CHUNK_MAX_HEIGHT) {
                const chunkTopY = processedLines[chunkStartIndex].pixelTop;
                for (let i = chunkStartIndex + 1; i < processedLines.length; i++) {
                    if ((processedLines[i].pixelBottom - chunkTopY) <= CHUNK_MAX_HEIGHT) {
                        chunkEndIndex = i;
                    } else break;
                }
            }
            const chunkLines = processedLines.slice(chunkStartIndex, chunkEndIndex + 1);
            const uf = new UnionFind(chunkLines.length);
            const horizontalLines = chunkLines.filter(l => !l.isVertical),
                verticalLines = chunkLines.filter(l => l.isVertical);
            const median = (arr) => {
                if (arr.length === 0) return 0;
                const sorted = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            };
            const initialMedianLineHeight = median(horizontalLines.map(l => l.bbox.height));
            const initialMedianLineWidth = median(verticalLines.map(l => l.bbox.width));
            const primaryHorizontalLines = horizontalLines.filter(l => l.bbox.height >= initialMedianLineHeight * settings.autoMergeMinLineRatio);
            const primaryVerticalLines = verticalLines.filter(l => l.bbox.width >= initialMedianLineWidth * settings.autoMergeMinLineRatio);
            const robustMedianLineHeight = median(primaryHorizontalLines.map(l => l.bbox.height)) || initialMedianLineHeight || 20;
            const robustMedianLineWidth = median(primaryVerticalLines.map(l => l.bbox.width)) || initialMedianLineWidth || 20;
            for (let i = 0; i < chunkLines.length; i++) {
                for (let j = i + 1; j < chunkLines.length; j++) {
                    const lineA = chunkLines[i],
                        lineB = chunkLines[j];
                    if (lineA.isVertical !== lineB.isVertical) continue;
                    const isLineAPrimary = lineA.fontSize >= (lineA.isVertical ? robustMedianLineWidth : robustMedianLineHeight) * settings.autoMergeMinLineRatio;
                    const isLineBPrimary = lineB.fontSize >= (lineB.isVertical ? robustMedianLineWidth : robustMedianLineHeight) * settings.autoMergeMinLineRatio;
                    let currentFontRatioThreshold = settings.autoMergeFontRatio;
                    if ((isLineAPrimary && !isLineBPrimary) || (!isLineAPrimary && isLineBPrimary)) currentFontRatioThreshold = settings.autoMergeFontRatioForMixed;
                    const fontRatio = Math.max(lineA.fontSize / lineB.fontSize, lineB.fontSize / lineA.fontSize);
                    if (fontRatio > currentFontRatioThreshold) continue;
                    const distThreshold = lineA.isVertical ? (settings.autoMergeDistK * robustMedianLineWidth) : (settings.autoMergeDistK * robustMedianLineHeight);
                    let readingGap, perpOverlap;
                    if (lineA.isVertical) {
                        readingGap = Math.max(0, Math.max(lineA.bbox.x, lineB.bbox.x) - Math.min(lineA.bbox.right, lineB.bbox.right));
                        perpOverlap = Math.max(0, Math.min(lineA.bbox.bottom, lineB.bbox.bottom) - Math.max(lineA.bbox.y, lineB.bbox.y));
                    } else {
                        readingGap = Math.max(0, Math.max(lineA.bbox.y, lineB.bbox.y) - Math.min(lineA.bbox.bottom, lineB.bbox.bottom));
                        perpOverlap = Math.max(0, Math.min(lineA.bbox.right, lineB.bbox.right) - Math.max(lineA.bbox.x, lineB.bbox.x));
                    }
                    const smallerPerpSize = Math.min(lineA.isVertical ? lineA.bbox.height : lineA.bbox.width, lineA.isVertical ? lineB.bbox.height : lineB.bbox.width);
                    if (readingGap > distThreshold) continue;
                    if (perpOverlap / smallerPerpSize < settings.autoMergeOverlapMin) continue;
                    if (((isLineAPrimary && !isLineBPrimary) || (!isLineAPrimary && isLineBPrimary)) && (perpOverlap / smallerPerpSize < settings.autoMergeMixedMinOverlapRatio)) continue;
                    uf.union(i, j);
                }
            }
            const tempGroups = {};
            for (let i = 0; i < chunkLines.length; i++) {
                const root = uf.find(i);
                if (!tempGroups[root]) tempGroups[root] = [];
                tempGroups[root].push(chunkLines[i]);
            }
            const sortedTempGroups = Object.values(tempGroups).map(group => {
                if (group.length < 2) return group;
                const groupBBox = group.reduce((acc, item) => {
                    const b = item.bbox;
                    if (b.x < acc.x1) acc.x1 = b.x;
                    if (b.y < acc.y1) acc.y1 = b.y;
                    if (b.right > acc.x2) acc.x2 = b.right;
                    if (b.bottom > acc.y2) acc.y2 = b.bottom;
                    return acc;
                }, {
                    x1: Infinity,
                    y1: Infinity,
                    x2: -Infinity,
                    y2: -Infinity
                });
                const isVerticalGroup = (groupBBox.y2 - groupBBox.y1) > (groupBBox.x2 - groupBBox.x1);
                group.sort((a, b) => {
                    const bA = a.bbox;
                    const bB = b.bbox;
                    if (isVerticalGroup) {
                        const xDiff = bB.x - bA.x;
                        return Math.abs(xDiff) > 0.1 ? xDiff : bA.y - bB.y;
                    } else {
                        const yDiff = bA.y - bB.y;
                        return Math.abs(yDiff) > 0.1 ? yDiff : bA.x - bB.x;
                    }
                });
                return group;
            });
            const finalGroupsInChunk = sortedTempGroups.map(group => group.map(processedLine => lines[processedLine.originalIndex]));
            allMergedGroups.push(...finalGroupsInChunk);
            currentLineIndex = chunkEndIndex + 1;
        }
        logDebug(`Auto-Merge finished. Initial: ${lines.length}, Final groups: ${allMergedGroups.length}`);
        return allMergedGroups;
    }

    function displayOcrResults(targetImg) {
        if (managedElements.has(targetImg)) return;
        let data = ocrDataCache.get(targetImg);
        if (!data || data === 'pending' || !Array.isArray(data)) return;
        let dataGroups = settings.autoMergeEnabled ? autoMergeOcrData(data, targetImg.naturalWidth, targetImg.naturalHeight) : data.map(item => [item]);
        const overlay = document.createElement('div');
        overlay.className = `ocr-decoupled-overlay interaction-mode-${settings.interactionMode}`;
        overlay.classList.toggle('solo-hover-mode', settings.soloHoverMode);
        dataGroups.forEach((groupData) => {
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'ocr-group';
            const groupBBox = groupData.reduce((acc, item) => {
                const b = item.tightBoundingBox;
                const right = b.x + b.width;
                const bottom = b.y + b.height;
                if (b.x < acc.x) acc.x = b.x;
                if (b.y < acc.y) acc.y = b.y;
                if (right > acc.right) acc.right = right;
                if (bottom > acc.bottom) acc.bottom = bottom;
                return acc;
            }, {
                x: 1,
                y: 1,
                right: 0,
                bottom: 0
            });
            groupBBox.width = groupBBox.right - groupBBox.x;
            groupBBox.height = groupBBox.bottom - groupBBox.y;
            Object.assign(groupWrapper.style, {
                left: `${groupBBox.x*100}%`,
                top: `${groupBBox.y*100}%`,
                width: `${groupBBox.width*100}%`,
                height: `${groupBBox.height*100}%`
            });
            groupData.forEach((item, index) => {
                const originalIndex = data.indexOf(item);
                const ocrBox = document.createElement('div');
                ocrBox.className = 'ocr-text-box';
                let newText = item.text.replace(/[!?]{2,}/g, (match) => match.includes('?') ? '?' : '!');
                if (index === 0) newText = '\u200A' + newText;
                ocrBox.textContent = newText;
                ocrBox._ocrData = item;
                ocrBox._ocrDataIndex = originalIndex;
                const relativeLeft = (item.tightBoundingBox.x - groupBBox.x) / groupBBox.width;
                const relativeTop = (item.tightBoundingBox.y - groupBBox.y) / groupBBox.height;
                const relativeWidth = item.tightBoundingBox.width / groupBBox.width;
                const relativeHeight = item.tightBoundingBox.height / groupBBox.height;
                Object.assign(ocrBox.style, {
                    left: `${relativeLeft*100}%`,
                    top: `${relativeTop*100}%`,
                    width: `${relativeWidth*100}%`,
                    height: `${relativeHeight*100}%`
                });
                groupWrapper.appendChild(ocrBox);
            });
            overlay.appendChild(groupWrapper);
        });
        if (IS_MOBILE) {
            const editActionBar = document.createElement('div');
            editActionBar.className = 'ocr-edit-action-bar';
            const mergeButton = document.createElement('button');
            mergeButton.className = 'edit-action-merge';
            mergeButton.textContent = 'Merge';
            const deleteButton = document.createElement('button');
            deleteButton.className = 'edit-action-delete';
            deleteButton.textContent = 'Delete';
            editActionBar.append(deleteButton, mergeButton);
            overlay.appendChild(editActionBar);
            mergeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                finalizeManualMerge(activeMergeSelections.get(overlay) || [], overlay);
            });
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const selection = activeMergeSelections.get(overlay) || [];
                selection.forEach(group => {
                    handleGroupDelete(group, targetImg);
                });
                activeMergeSelections.set(overlay, []);
                updateEditActionBar(overlay);
            });
        }
        document.body.appendChild(overlay);
        const state = {
            overlay,
            lastWidth: 0,
            lastHeight: 0
        };
        managedElements.set(targetImg, state);
        if (IS_MOBILE) {
            overlay.classList.add('is-inactive');
            overlay.addEventListener('click', handleMobileOverlayInteraction);
        } else {
            const show = () => {
                clearTimeout(hideButtonTimer);
                overlay.classList.add('is-focused');
                UI.globalAnkiButton?.classList.remove('is-hidden');
                activeImageForExport = targetImg;
            };
            const hide = () => {
                if (activeMergeSelections.has(overlay)) return;
                hideButtonTimer = setTimeout(() => {
                    overlay.classList.remove('is-focused');
                    UI.globalAnkiButton?.classList.add('is-hidden');
                    if (activeImageForExport === targetImg) activeImageForExport = null;
                }, 1500);
            };
            [targetImg, overlay].forEach(el => {
                el.addEventListener('mouseenter', show);
                el.addEventListener('mouseleave', hide);
            });
            overlay.addEventListener('click', handleDesktopOverlayInteraction);
        }
        updateOverlayDimensionsAndStyles(targetImg, state);
        resizeObserver.observe(targetImg);
        intersectionObserver.observe(targetImg);
    }

    function isModifierPressed(event, keyName) {
        if (!keyName) return false;
        const lowerKey = keyName.toLowerCase();
        switch (lowerKey) {
            case 'control':
            case 'ctrl':
                return event.ctrlKey;
            case 'alt':
                return event.altKey;
            case 'shift':
                return event.shiftKey;
            default:
                return false;
        }
    }

    function handleGroupDelete(groupElement, sourceImage) {
        const boxes = Array.from(groupElement.querySelectorAll('.ocr-text-box'));
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
        if (!currentSelection) {
            currentSelection = [];
            activeMergeSelections.set(overlay, currentSelection);
        }
        const indexInSelection = currentSelection.indexOf(groupElement);
        if (indexInSelection > -1) {
            currentSelection.splice(indexInSelection, 1);
            groupElement.classList.remove('selected-for-merge');
        } else {
            currentSelection.push(groupElement);
            groupElement.classList.add('selected-for-merge');
        }
        if (currentSelection.length === 0) activeMergeSelections.delete(overlay);
        if (IS_MOBILE) updateEditActionBar(overlay);
    }

    function handleDesktopOverlayInteraction(e) {
        const overlay = e.currentTarget;
        const clickedGroup = e.target.closest('.ocr-group');
        if (isModifierPressed(e, settings.mergeModifierKey)) {
            if (clickedGroup) {
                e.stopPropagation();
                handleMergeSelection(clickedGroup, overlay);
            }
            return;
        }
        if (!clickedGroup) {
            overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
            overlay.classList.remove('has-manual-highlight');
            return;
        }
        e.stopPropagation();
        if (isModifierPressed(e, settings.deleteModifierKey)) {
            const [sourceImage] = [...managedElements].find(([, state]) => state.overlay === overlay) || [];
            if (sourceImage) handleGroupDelete(clickedGroup, sourceImage);
        } else if (settings.interactionMode === 'click') {
            overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
            clickedGroup.querySelectorAll('.ocr-text-box').forEach(box => box.classList.add('manual-highlight'));
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
        activeOverlay = overlay;
        activeImageForExport = image;
        overlay.classList.remove('is-inactive');
        overlay.classList.add('is-focused');
        const rect = image.getBoundingClientRect();
        calculateAndApplyOptimalStyles_Optimized(overlay, rect);
        UI.globalAnkiButton?.classList.remove('is-hidden');
        UI.globalEditButton?.classList.remove('is-hidden');
    }

    function hideActiveOverlay() {
        if (!activeOverlay) return;
        activeOverlay.classList.remove('is-focused', 'has-manual-highlight', 'edit-mode-active');
        activeOverlay.classList.add('is-inactive');
        activeOverlay.querySelectorAll('.manual-highlight, .selected-for-merge').forEach(b => b.classList.remove('manual-highlight', 'selected-for-merge'));
        activeMergeSelections.delete(activeOverlay);
        UI.globalAnkiButton?.classList.add('is-hidden');
        UI.globalEditButton?.classList.add('is-hidden');
        UI.globalEditButton?.classList.remove('edit-active');
        activeOverlay = null;
        activeImageForExport = null;
    }

    function handleTouchStart(event) {
        if (event.touches.length > 1) {
            longPressState.valid = false;
            return;
        }
        const targetImg = event.target.closest('img');
        if (!targetImg || !managedElements.has(targetImg)) {
            longPressState.valid = false;
            return;
        }
        if (settings.activationMode === 'doubleTap') {
            const now = Date.now();
            const lastTap = tapTracker.get(targetImg);
            if (lastTap && (now - lastTap.time) < DOUBLE_TAP_THRESHOLD) {
                event.preventDefault();
                triggerOverlayToggle(targetImg);
                tapTracker.delete(targetImg);
                longPressState.valid = false;
            } else {
                tapTracker.set(targetImg, {
                    time: now
                });
            }
            return;
        }
        if (settings.activationMode === 'longPress') {
            longPressState = {
                valid: true,
                startX: event.touches[0].clientX,
                startY: event.touches[0].clientY,
                target: targetImg
            };
        }
    }

    function handleTouchMove(event) {
        if (!longPressState.valid) return;
        const SCROLL_TOLERANCE = 10;
        const deltaX = Math.abs(longPressState.startX - event.touches[0].clientX);
        const deltaY = Math.abs(longPressState.startY - event.touches[0].clientY);
        if (deltaX > SCROLL_TOLERANCE || deltaY > SCROLL_TOLERANCE) longPressState.valid = false;
    }

    function handleTouchEnd() {
        longPressState.valid = false;
    }

    function handleContextMenu(event) {
        if (settings.activationMode === 'longPress' && longPressState.valid && event.target === longPressState.target) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            triggerOverlayToggle(longPressState.target);
            longPressState.valid = false;
            return false;
        }
    }

    function handleGlobalTap(event) {
        if (!activeOverlay) return;
        const target = event.target;
        if (!target.closest('.ocr-group, .ocr-edit-action-bar') && !target.closest('#ocr-settings-button, #ocr-global-anki-export-btn, #ocr-global-edit-btn')) {
            hideActiveOverlay();
        }
    }

    function updateEditActionBar(overlay) {
        const selection = activeMergeSelections.get(overlay) || [];
        const mergeBtn = overlay.querySelector('.edit-action-merge');
        const deleteBtn = overlay.querySelector('.edit-action-delete');
        if (mergeBtn) mergeBtn.disabled = selection.length < 2;
        if (deleteBtn) deleteBtn.disabled = selection.length === 0;
    }

    function handleMobileOverlayInteraction(event) {
        const overlay = event.currentTarget;
        const clickedGroup = event.target.closest('.ocr-group');
        if (!clickedGroup) return;
        event.stopPropagation();
        if (overlay.classList.contains('edit-mode-active')) {
            handleMergeSelection(clickedGroup, overlay);
        } else {
            overlay.querySelectorAll('.manual-highlight').forEach(b => b.classList.remove('manual-highlight'));
            clickedGroup.querySelectorAll('.ocr-text-box').forEach(b => b.classList.add('manual-highlight'));
            overlay.classList.add('has-manual-highlight');
        }
    }

    function finalizeManualMerge(selectedGroups, overlay) {
        if (!selectedGroups || selectedGroups.length < 2) {
            selectedGroups.forEach(g => g.classList.remove('selected-for-merge'));
            return;
        }
        const [sourceImage] = [...managedElements].find(([, state]) => state.overlay === overlay) || [];
        if (!sourceImage || !sourceImage.naturalWidth) return;
        const {
            naturalWidth,
            naturalHeight
        } = sourceImage;
        const normScale = 1000 / naturalWidth;
        const allBoxElements = selectedGroups.flatMap(g => Array.from(g.querySelectorAll('.ocr-text-box')));
        const boxesWithPreciseCoords = allBoxElements.map(box => {
            const rawBbox = box._ocrData.tightBoundingBox;
            const preciseBbox = {
                x: (rawBbox.x * naturalWidth) * normScale,
                y: (rawBbox.y * naturalHeight) * normScale,
                width: (rawBbox.width * naturalWidth) * normScale,
                height: (rawBbox.height * naturalHeight) * normScale,
            };
            preciseBbox.right = preciseBbox.x + preciseBbox.width;
            preciseBbox.bottom = preciseBbox.y + preciseBbox.height;
            return {
                element: box,
                bbox: preciseBbox
            };
        });
        const groupPreciseBBox = boxesWithPreciseCoords.reduce((acc, item) => {
            const b = item.bbox;
            if (b.x < acc.x1) acc.x1 = b.x;
            if (b.y < acc.y1) acc.y1 = b.y;
            if (b.right > acc.x2) acc.x2 = b.right;
            if (b.bottom > acc.y2) acc.y2 = b.bottom;
            return acc;
        }, {
            x1: Infinity,
            y1: Infinity,
            x2: -Infinity,
            y2: -Infinity
        });
        const groupFinalBBox = {
            x: (groupPreciseBBox.x1 / normScale) / naturalWidth,
            y: (groupPreciseBBox.y1 / normScale) / naturalHeight,
            width: ((groupPreciseBBox.x2 - groupPreciseBBox.x1) / normScale) / naturalWidth,
            height: ((groupPreciseBBox.y2 - groupPreciseBBox.y1) / normScale) / naturalHeight,
        };
        if (groupFinalBBox.width <= 0 || groupFinalBBox.height <= 0) return;
        const isVerticalGroup = (groupPreciseBBox.y2 - groupPreciseBBox.y1) > (groupPreciseBBox.x2 - groupPreciseBBox.x1);
        boxesWithPreciseCoords.sort((a, b) => {
            const bA = a.bbox;
            const bB = b.bbox;
            if (isVerticalGroup) {
                const centerA_X = bA.x + bA.width / 2;
                const centerB_X = bB.x + bB.width / 2;
                const avgWidth = (bA.width + bB.width) / 2;
                if (Math.abs(centerA_X - centerB_X) < avgWidth * 0.8) {
                    return bA.y - bB.y;
                } else {
                    return bB.x - bA.x;
                }
            } else {
                const yDiff = bA.y - bB.y;
                return Math.abs(yDiff) > 0.1 ? yDiff : bA.x - bB.x;
            }
        });
        const newGroupWrapper = document.createElement('div');
        newGroupWrapper.className = 'ocr-group';
        Object.assign(newGroupWrapper.style, {
            left: `${groupFinalBBox.x*100}%`,
            top: `${groupFinalBBox.y*100}%`,
            width: `${groupFinalBBox.width*100}%`,
            height: `${groupFinalBBox.height*100}%`
        });
        boxesWithPreciseCoords.forEach((item, index) => {
            const box = item.element;
            if (index === 0) {
                if (!box.textContent.startsWith('\u200A')) box.textContent = '\u200A' + box.textContent;
            } else {
                if (box.textContent.startsWith('\u200A')) box.textContent = box.textContent.substring(1);
            }
            const itemBBox = box._ocrData.tightBoundingBox;
            const relativeLeft = (itemBBox.x - groupFinalBBox.x) / groupFinalBBox.width;
            const relativeTop = (itemBBox.y - groupFinalBBox.y) / groupFinalBBox.height;
            const relativeWidth = itemBBox.width / groupFinalBBox.width;
            const relativeHeight = itemBBox.height / groupFinalBBox.height;
            Object.assign(box.style, {
                left: `${relativeLeft*100}%`,
                top: `${relativeTop*100}%`,
                width: `${relativeWidth*100}%`,
                height: `${relativeHeight*100}%`
            });
            newGroupWrapper.appendChild(box);
        });
        overlay.appendChild(newGroupWrapper);
        selectedGroups.forEach(group => group.remove());
    }

    async function ankiConnectRequest(action, params = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: settings.ankiConnectUrl,
                data: JSON.stringify({
                    action,
                    version: 6,
                    params
                }),
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8'
                },
                timeout: 15000,
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data.error) reject(new Error(data.error));
                        else resolve(data.result);
                    } catch (e) {
                        reject(new Error('Failed to parse response.'));
                    }
                },
                onerror: () => reject(new Error('Connection failed.')),
                ontimeout: () => reject(new Error('Request timed out.'))
            });
        });
    }
    async function exportImageToAnki(targetImg) {
        if (!settings.ankiImageField) {
            alert('Anki Image Field is not set.');
            return false;
        }
        if (!targetImg?.complete || !targetImg.naturalHeight) {
            alert('Anki Export Failed: Image not valid.');
            return false;
        }
        try {
            const canvas = document.createElement('canvas');
            canvas.width = targetImg.naturalWidth;
            canvas.height = targetImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(targetImg, 0, 0);
            const base64data = canvas.toDataURL('image/png').split(',')[1];
            if (!base64data) throw new Error("Canvas toDataURL failed.");
            const filename = `screenshot_${Date.now()}.png`;
            await ankiConnectRequest('storeMediaFile', {
                filename,
                data: base64data
            });
            const notes = await ankiConnectRequest('findNotes', {
                query: 'added:1'
            });
            if (!notes?.length) throw new Error('No recently added cards found.');
            const lastNoteId = notes.sort((a, b) => b - a)[0];
            await ankiConnectRequest('updateNoteFields', {
                note: {
                    id: lastNoteId,
                    fields: {
                        [settings.ankiImageField]: `<img src="${filename}">`
                    }
                }
            });
            return true;
        } catch (error) {
            logDebug(`Anki Export Error: ${error.message}`);
            alert(`Anki Export Failed: ${error.message}`);
            return false;
        }
    }
    async function runProbingProcess(baseUrl, btn) {
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Starting...';
        const postData = {
            baseUrl: baseUrl,
            user: settings.imageServerUser,
            pass: settings.imageServerPassword
        };
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${settings.ocrServerUrl}/preprocess-chapter`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(postData),
            timeout: 10000,
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (res.status === 202 && data.status === 'accepted') {
                        btn.textContent = 'Accepted';
                        checkServerStatus();
                    } else {
                        throw new Error(data.error || `Server responded with status ${res.status}`);
                    }
                } catch (e) {
                    btn.textContent = 'Error!';
                    alert(`Failed to start job: ${e.message}`);
                }
            },
            onerror: () => {
                btn.textContent = 'Conn. Error!';
            },
            ontimeout: () => {
                btn.textContent = 'Timeout!';
            },
            onloadend: () => {
                setTimeout(() => {
                    if (btn.isConnected) {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }
                }, 3500);
            }
        });
    }
    async function batchProcessCurrentChapterFromURL() {
        const btn = UI.batchChapterBtn;
        const urlMatch = window.location.pathname.match(/\/manga\/\d+\/chapter\/\d+/);
        if (!urlMatch) {
            alert(`Error: URL does not match pattern.`);
            return;
        }
        const baseUrl = `${window.location.origin}/api/v1${urlMatch[0]}/page/`;
        await runProbingProcess(baseUrl, btn);
    }
    async function handleChapterBatchClick(event) {
        event.preventDefault();
        event.stopPropagation();
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
        if (!actionContainer || actionContainer.querySelector('.ocr-chapter-batch-btn')) return;
        const ocrButton = document.createElement('button');
        ocrButton.textContent = 'OCR';
        ocrButton.className = 'ocr-chapter-batch-btn';
        ocrButton.title = 'Queue this chapter for background pre-processing';
        ocrButton.addEventListener('click', handleChapterBatchClick);
        actionContainer.insertBefore(ocrButton, moreButton);
    }

    function applyStyles() {
        const theme = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.deepblue;
        const cssVars = `:root { --ocr-bg-color: rgba(10,25,40,0.85); --ocr-border-color: ${theme.main}0.6); --ocr-border-color-dim: ${theme.main}0.3); --ocr-border-color-hover: ${theme.main}0.8); --ocr-text-color: ${theme.text}; --ocr-highlight-bg-color: ${theme.main}0.9); --ocr-highlight-border-color: rgba(255,255,255,0.9); --ocr-highlight-text-color: ${theme.highlightText}; --ocr-highlight-shadow: 0 0 10px ${theme.main}0.5); --ocr-highlight-inset-shadow: inset 0 0 0 2px white; --modal-header-color: ${theme.main}1); --ocr-dimmed-opacity: ${settings.dimmedOpacity}; --ocr-focus-scale: ${settings.focusScaleMultiplier}; }`;
        let styleTag = document.getElementById('ocr-dynamic-styles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'ocr-dynamic-styles';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = cssVars;
        document.body.className = document.body.className.replace(/\bocr-theme-\S+/g, '');
        document.body.classList.add(`ocr-theme-${settings.accentColor}`);
        if (IS_MOBILE) document.body.classList.toggle('ocr-brightness-dark', settings.brightnessMode === 'dark');
    }

    function createUI() {
        GM_addStyle(`
            /* --- OCR Overlay Styles --- */
            .ocr-decoupled-overlay { position: fixed; z-index: 9998; pointer-events: none; transition: opacity 0.2s; }
            .ocr-decoupled-overlay:not(.is-focused) { opacity: 0; visibility: hidden; }
            .ocr-group { pointer-events: auto; position: absolute; box-sizing: border-box; transition: opacity 0.2s; }
            .ocr-text-box { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; user-select: text; cursor: pointer; transition: all 0.2s ease-in-out; overflow: hidden; color: var(--ocr-text-color); background: var(--ocr-bg-color); border: 2px solid var(--ocr-border-color); text-shadow: 0 1px 3px rgba(0,0,0,0.9); backdrop-filter: blur(3px); padding: 4px; border-radius: 4px; }
            .ocr-text-vertical { writing-mode: vertical-rl; text-orientation: upright; }
            body:not(.ocr-edit-mode-active) .interaction-mode-hover.is-focused .ocr-group:hover .ocr-text-box,
            body:not(.ocr-edit-mode-active) .interaction-mode-click.is-focused .ocr-text-box.manual-highlight,
            .is-focused .ocr-text-box.manual-highlight { transform: scale(var(--ocr-focus-scale)); background: var(--ocr-highlight-bg-color); border-color: var(--ocr-highlight-border-color); color: var(--ocr-highlight-text-color); text-shadow: none; box-shadow: var(--ocr-highlight-shadow), var(--ocr-highlight-inset-shadow); z-index: 1; overflow: visible; }
            .interaction-mode-hover.is-focused:not(.solo-hover-mode):has(.ocr-group:hover) .ocr-group:not(:hover),
            .interaction-mode-click.is-focused.has-manual-highlight .ocr-group:not(:has(.manual-highlight)),
            .solo-hover-mode.is-focused.has-manual-highlight .ocr-group:not(:has(.manual-highlight)) { opacity: var(--ocr-dimmed-opacity); }
            .solo-hover-mode.is-focused .ocr-group { opacity: 0; }
            .solo-hover-mode.is-focused .ocr-group:hover, .solo-hover-mode.is-focused .ocr-group.selected-for-merge, .solo-hover-mode.is-focused .ocr-group.has-manual-highlight { opacity: 1; }
            .ocr-group.selected-for-merge { outline: 3px solid #f1c40f !important; outline-offset: 2px; box-shadow: 0 0 12px #f1c40f; opacity: 1 !important; }
            .ocr-decoupled-overlay.is-inactive { display: none; pointer-events: none; }
            body.ocr-brightness-dark .ocr-text-box { background: rgba(29, 34, 39, 0.9); border-color: ${ACCENT_COLORS.white.main}0.5); }

            /* --- ИЗМЕНЕНИЯ ЗДЕСЬ --- */
            body.ocr-theme-minimal .ocr-decoupled-overlay.is-focused .ocr-group { border: 1px solid var(--ocr-border-color-dim); border-radius: 4px; }
            body.ocr-theme-minimal .ocr-text-box { background: transparent !important; color: transparent !important; border: none !important; backdrop-filter: none !important; text-shadow: none !important; box-shadow: none !important; transform: none !important; }
            body.ocr-theme-minimal ::selection { background-color: rgba(0, 123, 255, 0.2); }
            /* ------------------------- */

            .ocr-edit-action-bar { position: absolute; bottom: 0; left: 0; right: 0; display: none; justify-content: center; align-items: center; gap: 15px; padding: 10px; background: rgba(26,29,33,0.8); backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.1); }
            .edit-mode-active .ocr-edit-action-bar { display: flex; }
            .ocr-edit-action-bar button { padding: 10px 20px; font-size: 1rem; font-weight: bold; border-radius: 20px; border: none; cursor: pointer; color: white; }
            .ocr-edit-action-bar .edit-action-merge { background-color: #3498db; } .ocr-edit-action-bar .edit-action-delete { background-color: #e74c3c; } .ocr-edit-action-bar button:disabled { background-color: #7f8c8d; opacity: 0.6; }
            .ocr-chapter-batch-btn { font-family: sans-serif; font-weight: 500; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(240,153,136,0.5); color: #f09988; background: transparent; cursor: pointer; margin-right: 4px; }
            #ocr-settings-button, #ocr-global-anki-export-btn, #ocr-global-edit-btn { position: fixed; z-index: 2147483647; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: clamp(48px, 12vw, 50px); height: clamp(48px, 12vw, 50px); font-size: clamp(26px, 6vw, 26px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); user-select: none; transition: all 0.2s; backdrop-filter: blur(5px); }
            #ocr-settings-button { bottom: clamp(15px, 4vw, 15px); right: clamp(15px, 4vw, 15px); background: rgba(26, 29, 33, 0.8); color: #EAEAEA; }
            #ocr-global-anki-export-btn { bottom: clamp(75px, 18vw, 75px); right: clamp(15px, 4vw, 15px); background-color: rgba(46, 204, 113, 0.9); color: white; }
            #ocr-global-edit-btn { bottom: clamp(15px, 4vw, 15px); right: clamp(75px, 18vw, 75px); background: rgba(52, 152, 219, 0.8); color: white; }
            #ocr-global-edit-btn.edit-active { background-color: #f1c40f; color: black; transform: scale(1.1); }
            #ocr-global-anki-export-btn.is-hidden, #ocr-global-edit-btn.is-hidden { opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.5); }
            .ocr-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(20, 20, 25, 0.6); backdrop-filter: blur(8px); z-index: 2147483646; color: #EAEAEA; display: flex; align-items: center; justify-content: center; }
            .ocr-modal.is-hidden { display: none; }
            .ocr-modal-container { width: clamp(320px, 95vw, 600px); max-height: 90vh; background-color: #1A1D21; border-top: 4px solid var(--modal-header-color); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; }
            .ocr-modal-header { position: relative; padding: 16px 24px; border-bottom: 1px solid #333842; }
            .ocr-modal-header h2 { margin: 0; color: #EAEAEA; font-size: 1.25rem; }
            #ocr-close-btn { position: absolute; top: 50%; right: 16px; transform: translateY(-50%); background: none; border: none; font-size: 2rem; color: #7f8c8d; cursor: pointer; line-height: 1; padding: 0 8px; } #ocr-close-btn:hover { color: #bdc3c7; }
            .ocr-modal-content { padding: 16px 24px; overflow-y: auto; flex-grow: 1; }
            .ocr-modal-footer { padding: 16px 24px; border-top: 1px solid #333842; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; background-color: #15171a; }
            .ocr-modal-footer .footer-actions-left { display: flex; gap: 10px; }
            .ocr-settings-section h3 { font-size: 1rem; font-weight: 600; color: var(--modal-header-color); margin: 24px 0 12px 0; border-bottom: 1px solid #333842; padding-bottom: 8px; }
            .ocr-settings-section:first-child h3 { margin-top: 0; }
            .settings-item, .settings-checkbox { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
            .settings-item label, .settings-checkbox label { color: #bdc3c7; flex-shrink: 0; margin-right: 15px; }
            .settings-checkbox { justify-content: flex-start; }
            .settings-checkbox label { margin: 0; }
            .settings-item input, .settings-item select { width: 50%; padding: 8px 12px; box-sizing: border-box; background-color: #2c313a; border: 1px solid #444a55; border-radius: 6px; color: #EAEAEA; }
            .settings-item input:focus, .settings-item select:focus { border-color: var(--modal-header-color); outline: none; }
            .settings-item input[type="text"] { width: 60%; } .settings-item input[type="number"] { width: 80px; text-align: right; }
            .advanced-options-container { display: none; margin-top: 16px; padding-left: 20px; border-left: 2px solid #333842; }
            .settings-action-buttons { display: flex; gap: 10px; margin-top: 20px; } .settings-action-buttons button { flex: 1; }
            .ocr-modal button { padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
            #ocr-save-btn { background-color: #27ae60; color: white; } #ocr-save-btn:hover { background-color: #2ecc71; }
            #ocr-restore-btn { background-color: transparent; border: 1px solid #7f8c8d; color: #7f8c8d; } #ocr-restore-btn:hover { background-color: #7f8c8d; color: #1A1D21; }
            #ocr-purge-cache-btn { background-color: transparent; border: 1px solid #c0392b; color: #c0392b; } #ocr-purge-cache-btn:hover { background-color: #c0392b; color: white; }
            #ocr-debug-btn { background-color: #777; color: white; }
            #ocr-batch-chapter-btn { background-color: #3498db; color: white; }
        `);

        const colorOptions = Object.keys(ACCENT_COLORS).map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');

        const desktopInteractionSettings = `<div class="settings-item"><label for="ocr-interaction-mode">Highlight Mode</label><select id="ocr-interaction-mode"><option value="hover">On Hover</option><option value="click">On Click</option></select></div>`;
        const mobileInteractionSettings = `
            <div class="settings-item"><label for="ocr-activation-mode">Activation Gesture</label><select id="ocr-activation-mode"><option value="longPress">Long Press</option><option value="doubleTap">Double Tap</option></select></div>
            <div class="settings-item"><label for="ocr-brightness-mode">Theme Mode</label><select id="ocr-brightness-mode"><option value="light">Light</option><option value="dark">Dark</option></select></div>`;
        const desktopAdvancedInteraction = `
            <div class="settings-item"><label for="ocr-merge-key">Merge Modifier Key</label><input type="text" id="ocr-merge-key" placeholder="Control, Alt..."></div>
            <div class="settings-item"><label for="ocr-delete-key">Delete Modifier Key</label><input type="text" id="ocr-delete-key" placeholder="Control, Alt..."></div>`;

        document.body.insertAdjacentHTML('beforeend', `
            <button id="ocr-global-anki-export-btn" class="is-hidden" title="Export Screenshot to Anki">✚</button>
            ${IS_MOBILE ? '<button id="ocr-global-edit-btn" class="is-hidden" title="Toggle Edit Mode">✏️</button>' : ''}
            <button id="ocr-settings-button">⚙️</button>

            <div id="ocr-settings-modal" class="ocr-modal is-hidden">
                <div class="ocr-modal-container">
                    <div class="ocr-modal-header"><h2>Mangatan Settings</h2><button id="ocr-close-btn">&times;</button></div>
                    <div class="ocr-modal-content">
                        <div class="ocr-settings-section">
                            <h3>Display</h3>
                            <div class="settings-item"><label for="ocr-accent-color">Accent Color</label><select id="ocr-accent-color">${colorOptions}</select></div>
                            <div class="settings-item"><label for="ocr-text-orientation">Text Orientation</label><select id="ocr-text-orientation"><option value="smart">Smart</option><option value="forceHorizontal">Horizontal</option><option value="forceVertical">Vertical</option></select></div>
                            ${IS_MOBILE ? mobileInteractionSettings : desktopInteractionSettings}
                            <div class="settings-checkbox"><input type="checkbox" id="ocr-solo-hover-mode" style="margin-right: 8px;"><label for="ocr-solo-hover-mode">Dim other text boxes on hover</label></div>
                        </div>
                        <div class="ocr-settings-section">
                            <h3>Auto-Merging</h3>
                            <div class="settings-checkbox"><input type="checkbox" id="ocr-auto-merge-enabled" style="margin-right: 8px;"><label for="ocr-auto-merge-enabled">Enable Automatic Bubble Merging</label></div>
                        </div>
                        <div class="ocr-settings-section">
                            <h3>Integrations</h3>
                            <div class="settings-item"><label for="ocr-server-url">OCR Server URL</label><input type="text" id="ocr-server-url"></div>
                            <div id="ocr-server-status" style="text-align: right; font-size: 0.8em; color: #95a5a6; cursor: pointer; margin-top: -8px; margin-bottom: 14px;">Click to check server status</div>
                            <div class="settings-item"><label for="ocr-anki-url">Anki-Connect URL</label><input type="text" id="ocr-anki-url"></div>
                            <div class="settings-item"><label for="ocr-anki-field">Anki Image Field</label><input type="text" id="ocr-anki-field"></div>
                        </div>
                        <div class="settings-checkbox"><input type="checkbox" id="show-advanced-settings" style="margin-right: 8px;"><label for="show-advanced-settings">Show Advanced Settings</label></div>
                        <div id="advanced-settings-container" class="advanced-options-container">
                            <div class="ocr-settings-section">
                                <h3>Advanced Display & Interaction</h3>
                                ${!IS_MOBILE ? desktopAdvancedInteraction : ''}
                                <div class="settings-item"><label for="ocr-dimmed-opacity">Dimmed Box Opacity (%)</label><input type="number" id="ocr-dimmed-opacity" min="0" max="100" step="5"></div>
                                <div class="settings-item"><label for="ocr-focus-scale-multiplier">Focus Scale Multiplier</label><input type="number" id="ocr-focus-scale-multiplier" min="1" max="3" step="0.05"></div>
                                <div class="settings-item"><label for="ocr-font-multiplier-horizontal">Horizontal Font Multiplier</label><input type="number" id="ocr-font-multiplier-horizontal" min="0.1" max="5" step="0.1"></div>
                                <div class="settings-item"><label for="ocr-font-multiplier-vertical">Vertical Font Multiplier</label><input type="number" id="ocr-font-multiplier-vertical" min="0.1" max="5" step="0.1"></div>
                            </div>
                             <div class="ocr-settings-section">
                                <h3>Advanced Merging</h3>
                                <div class="settings-item"><label>Distance K:</label><input type="number" id="ocr-auto-merge-dist-k" min="0.1" max="5" step="0.1"></div>
                                <div class="settings-item"><label>Font Ratio:</label><input type="number" id="ocr-auto-merge-font-ratio" min="1" max="3" step="0.05"></div>
                                <div class="settings-item"><label>Min Overlap:</label><input type="number" id="ocr-auto-merge-overlap-min" min="0" max="1" step="0.05"></div>
                                <div class="settings-item"><label>Min Primary Ratio:</label><input type="number" id="ocr-auto-merge-min-line-ratio" min="0.1" max="1" step="0.05"></div>
                                <div class="settings-item"><label>Mixed Font Ratio:</label><input type="number" id="ocr-auto-merge-font-ratio-mixed" min="1" max="2" step="0.05"></div>
                                <div class="settings-item"><label>Mixed Min Overlap:</label><input type="number" id="ocr-auto-merge-mixed-min-overlap-ratio" min="0" max="1" step="0.05"></div>
                             </div>
                             <div class="ocr-settings-section">
                                <h3>System & Debugging</h3>
                                <div class="settings-item"><label for="image-server-user">Image Source Username</label><input type="text" id="image-server-user"></div>
                                <div class="settings-item"><label for="image-server-password">Image Source Password</label><input type="password" id="image-server-password"></div>
                                <label for="ocr-sites-config">Site Configurations (URL; Containers...)</label>
                                <textarea id="ocr-sites-config" rows="3" style="width: 100%; margin-top: 8px; background-color: #2c313a; border: 1px solid #444a55; border-radius: 6px; color: #EAEAEA;"></textarea>
                                <div class="settings-checkbox" style="margin-top: 14px;"><input type="checkbox" id="ocr-debug-mode" style="margin-right: 8px;"><label for="ocr-debug-mode">Debug Mode (requires reload)</label></div>
                                <div class="settings-action-buttons"><button id="ocr-restore-btn">Restore default</button><button id="ocr-purge-cache-btn">Purge Cache</button></div>
                             </div>
                        </div>
                    </div>
                    <div class="ocr-modal-footer">
                        <div class="footer-actions-left"><button id="ocr-batch-chapter-btn">Pre-process Chapter</button><button id="ocr-debug-btn">Debug</button></div>
                        <div><button id="ocr-save-btn">Save and Reload</button></div>
                    </div>
                </div>
            </div>
            <div id="ocr-debug-modal" class="ocr-modal is-hidden"><div class="ocr-modal-container"><div class="ocr-modal-header"><h2>Debug Log</h2></div><div class="ocr-modal-content"><textarea id="ocr-debug-log" readonly style="width:100%; height: 100%; resize:none; background-color: #15171a; color: #e0e0e0; border: none;"></textarea></div><div class="ocr-modal-footer" style="justify-content: flex-end;"><button id="ocr-close-debug-btn">Close</button></div></div></div>
        `);
    }
    function bindUIEvents() {
        Object.assign(UI, {
            settingsButton: document.getElementById('ocr-settings-button'),
            settingsModal: document.getElementById('ocr-settings-modal'),
            debugModal: document.getElementById('ocr-debug-modal'),
            globalAnkiButton: document.getElementById('ocr-global-anki-export-btn'),
            globalEditButton: document.getElementById('ocr-global-edit-btn'),
            showAdvancedCheckbox: document.getElementById('show-advanced-settings'),
            advancedContainer: document.getElementById('advanced-settings-container'),
            accentColorSelect: document.getElementById('ocr-accent-color'),
            restoreBtn: document.getElementById('ocr-restore-btn'),
            closeBtn: document.getElementById('ocr-close-btn'),
            purgeCacheBtn: document.getElementById('ocr-purge-cache-btn'),
            batchChapterBtn: document.getElementById('ocr-batch-chapter-btn'),
            serverUrlInput: document.getElementById('ocr-server-url'),
            imageServerUserInput: document.getElementById('image-server-user'),
            imageServerPasswordInput: document.getElementById('image-server-password'),
            ankiUrlInput: document.getElementById('ocr-anki-url'),
            ankiFieldInput: document.getElementById('ocr-anki-field'),
            soloHoverCheckbox: document.getElementById('ocr-solo-hover-mode'),
            textOrientationSelect: document.getElementById('ocr-text-orientation'),
            dimmedOpacityInput: document.getElementById('ocr-dimmed-opacity'),
            fontMultiplierHorizontalInput: document.getElementById('ocr-font-multiplier-horizontal'),
            fontMultiplierVerticalInput: document.getElementById('ocr-font-multiplier-vertical'),
            focusScaleMultiplierInput: document.getElementById('ocr-focus-scale-multiplier'),
            statusDiv: document.getElementById('ocr-server-status'),
            saveBtn: document.getElementById('ocr-save-btn'),
            autoMergeEnabledCheckbox: document.getElementById('ocr-auto-merge-enabled'),
            autoMergeDistKInput: document.getElementById('ocr-auto-merge-dist-k'),
            autoMergeFontRatioInput: document.getElementById('ocr-auto-merge-font-ratio'),
            autoMergeOverlapMinInput: document.getElementById('ocr-auto-merge-overlap-min'),
            autoMergeMinLineRatioInput: document.getElementById('ocr-auto-merge-min-line-ratio'),
            autoMergeFontRatioForMixedInput: document.getElementById('ocr-auto-merge-font-ratio-mixed'),
            autoMergeMixedMinOverlapRatioInput: document.getElementById('ocr-auto-merge-mixed-min-overlap-ratio'),
            debugModeCheckbox: document.getElementById('ocr-debug-mode'),
            sitesConfigTextarea: document.getElementById('ocr-sites-config'),
            debugBtn: document.getElementById('ocr-debug-btn'),
            closeDebugBtn: document.getElementById('ocr-close-debug-btn'),
            debugLogTextarea: document.getElementById('ocr-debug-log'),
        });
        if (IS_MOBILE) {
            Object.assign(UI, {
                activationModeSelect: document.getElementById('ocr-activation-mode'),
                brightnessModeSelect: document.getElementById('ocr-brightness-mode')
            });
        } else {
            Object.assign(UI, {
                interactionModeSelect: document.getElementById('ocr-interaction-mode'),
                mergeKeyInput: document.getElementById('ocr-merge-key'),
                deleteKeyInput: document.getElementById('ocr-delete-key')
            });
        }

        const openSettings = () => {
            const advancedIsModified =
                settings.fontMultiplierHorizontal !== defaultSettings.fontMultiplierHorizontal ||
                settings.debugMode !== defaultSettings.debugMode;

            UI.showAdvancedCheckbox.checked = advancedIsModified;
            UI.advancedContainer.style.display = advancedIsModified ? 'block' : 'none';
            UI.settingsModal.classList.remove('is-hidden');
        };

        UI.settingsButton.addEventListener('click', openSettings);
        UI.closeBtn.addEventListener('click', () => UI.settingsModal.classList.add('is-hidden'));
        UI.settingsModal.addEventListener('click', (e) => {
             if (e.target === UI.settingsModal) UI.settingsModal.classList.add('is-hidden');
        });

        UI.showAdvancedCheckbox.addEventListener('change', (e) => {
            UI.advancedContainer.style.display = e.target.checked ? 'block' : 'none';
        });

        UI.globalAnkiButton.addEventListener('click', async () => {
            if (!activeImageForExport) return;
            const btn = UI.globalAnkiButton;
            btn.textContent = '…';
            btn.disabled = true;
            const success = await exportImageToAnki(activeImageForExport);
            if (success) { btn.textContent = '✓'; btn.style.backgroundColor = '#27ae60'; }
            else { btn.textContent = '✖'; btn.style.backgroundColor = '#c0392b'; }
            setTimeout(() => { btn.textContent = '✚'; btn.style.backgroundColor = ''; btn.disabled = false; }, 2000);
        });

        UI.statusDiv.addEventListener('click', checkServerStatus);
        UI.purgeCacheBtn.addEventListener('click', purgeServerCache);
        UI.batchChapterBtn.addEventListener('click', batchProcessCurrentChapterFromURL);
        UI.debugBtn.addEventListener('click', () => {
            UI.debugLogTextarea.value = debugLog.join('\n');
            UI.debugModal.classList.remove('is-hidden');
            UI.debugLogTextarea.scrollTop = UI.debugLogTextarea.scrollHeight;
        });
        UI.closeDebugBtn.addEventListener('click', () => UI.debugModal.classList.add('is-hidden'));

        UI.restoreBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to restore all settings to their default values? This will reload the page.')) {
                await GM_setValue(SETTINGS_KEY, JSON.stringify(defaultSettings));
                window.location.reload();
            }
        });

        UI.saveBtn.addEventListener('click', async () => {
            let newSettings = { ...settings };
            Object.assign(newSettings, {
                ocrServerUrl: UI.serverUrlInput.value.trim(),
                imageServerUser: UI.imageServerUserInput.value.trim(),
                imageServerPassword: UI.imageServerPasswordInput.value,
                ankiConnectUrl: UI.ankiUrlInput.value.trim(),
                ankiImageField: UI.ankiFieldInput.value.trim(),
                soloHoverMode: UI.soloHoverCheckbox.checked,
                textOrientation: UI.textOrientationSelect.value,
                accentColor: UI.accentColorSelect.value,
                dimmedOpacity: (parseInt(UI.dimmedOpacityInput.value, 10) || 30) / 100,
                fontMultiplierHorizontal: parseFloat(UI.fontMultiplierHorizontalInput.value) || 1.0,
                fontMultiplierVertical: parseFloat(UI.fontMultiplierVerticalInput.value) || 1.0,
                focusScaleMultiplier: parseFloat(UI.focusScaleMultiplierInput.value) || 1.1,
                autoMergeEnabled: UI.autoMergeEnabledCheckbox.checked,
                autoMergeDistK: parseFloat(UI.autoMergeDistKInput.value) || 1.3,
                autoMergeFontRatio: parseFloat(UI.autoMergeFontRatioInput.value) || 1.3,
                autoMergeOverlapMin: parseFloat(UI.autoMergeOverlapMinInput.value) || 0.1,
                autoMergeMinLineRatio: parseFloat(UI.autoMergeMinLineRatioInput.value) || 0.5,
                autoMergeFontRatioForMixed: parseFloat(UI.autoMergeFontRatioForMixedInput.value) || 1.1,
                autoMergeMixedMinOverlapRatio: parseFloat(UI.autoMergeMixedMinOverlapRatioInput.value) || 0.5,
                debugMode: UI.debugModeCheckbox.checked,
                sites: UI.sitesConfigTextarea.value.split('\n').filter(line => line.trim()).map(line => {
                    const parts = line.split(';').map(s => s.trim());
                    return {
                        urlPattern: parts[0] || '',
                        overflowFixSelector: '',
                        contentRootSelector: IS_MOBILE ? (parts.length > 1 ? parts[parts.length -1] : '#root') : '',
                        imageContainerSelectors: parts.slice(1, IS_MOBILE ? -1 : undefined).filter(s => s)
                    };
                }),
            });
            if (IS_MOBILE) {
                newSettings.activationMode = UI.activationModeSelect.value;
                newSettings.brightnessMode = UI.brightnessModeSelect.value;
            } else {
                newSettings.interactionMode = UI.interactionModeSelect.value;
                newSettings.mergeModifierKey = UI.mergeKeyInput.value.trim();
                newSettings.deleteModifierKey = UI.deleteKeyInput.value.trim();
            }
            try {
                await GM_setValue(SETTINGS_KEY, JSON.stringify(newSettings));
                alert('Settings Saved. Reloading.');
                window.location.reload();
            } catch (e) { alert(`Error saving settings: ${e.message}`); }
        });

        document.addEventListener('ocr-log-update', () => {
            if (UI.debugModal && !UI.debugModal.classList.contains('is-hidden')) {
                UI.debugLogTextarea.value = debugLog.join('\n');
                UI.debugLogTextarea.scrollTop = UI.debugLogTextarea.scrollHeight;
            }
        });
    }

    function checkServerStatus() {
        const serverUrl = UI.serverUrlInput.value.trim();
        if (!serverUrl) return;
        UI.statusDiv.textContent = 'Checking...';
        GM_xmlhttpRequest({
            method: 'GET',
            url: serverUrl,
            timeout: 5000,
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data.status === 'running') {
                        const jobs = data.active_preprocess_jobs ?? 'N/A';
                        UI.statusDiv.textContent = `Connected (Cache: ${data.items_in_cache} | Jobs: ${jobs})`;
                    } else {
                        UI.statusDiv.textContent = 'Server Unresponsive';
                    }
                } catch (e) {
                    UI.statusDiv.textContent = 'Invalid Response';
                }
            },
            onerror: () => {
                UI.statusDiv.textContent = 'Connection Failed';
            },
            ontimeout: () => {
                UI.statusDiv.textContent = 'Timed Out';
            }
        });
    }

    function purgeServerCache() {
        if (!confirm("Permanently delete all items from the server's OCR cache?")) return;
        const btn = UI.purgeCacheBtn;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Purging...';
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${settings.ocrServerUrl}/purge-cache`,
            timeout: 10000,
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    alert(data.message || data.error);
                    checkServerStatus();
                } catch (e) {
                    alert('Failed to parse response.');
                }
            },
            onerror: () => alert('Failed to connect.'),
            ontimeout: () => alert('Request timed out.'),
            onloadend: () => {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    function createMeasurementSpan() {
        if (measurementSpan) return;
        measurementSpan = document.createElement('span');
        measurementSpan.style.cssText = `position:fixed!important;visibility:hidden!important;height:auto!important;width:auto!important;white-space:nowrap!important;z-index:-1!important;top:-9999px;left:-9999px;`;
        document.body.appendChild(measurementSpan);
    }

    function handleModifierKeyDown(e) {
        const mergeKey = settings.mergeModifierKey.toLowerCase();
        const deleteKey = settings.deleteModifierKey.toLowerCase();
        const key = e.key.toLowerCase();
        if (key === mergeKey || key === deleteKey) document.body.classList.add('ocr-edit-mode-active');
    }

    function handleModifierKeyUp(e) {
        const mergeKey = settings.mergeModifierKey.toLowerCase();
        const deleteKey = settings.deleteModifierKey.toLowerCase();
        const key = e.key.toLowerCase();
        if (key === mergeKey) {
            for (const [overlay, selection] of activeMergeSelections.entries()) {
                if (selection.length > 1) {
                    finalizeManualMerge(selection, overlay);
                } else {
                    selection.forEach(g => g.classList.remove('selected-for-merge'));
                }
            }
            activeMergeSelections.clear();
        }
        if (key === mergeKey || key === deleteKey) document.body.classList.remove('ocr-edit-mode-active');
    }

    async function init() {
        const loadedSettings = await GM_getValue(SETTINGS_KEY);
        if (loadedSettings) {
            try {
                settings = { ...defaultSettings, ...JSON.parse(loadedSettings) };
            } catch (e) {
                logDebug("Could not parse saved settings, using defaults.");
                settings = { ...defaultSettings };
            }
        }
        createUI();
        bindUIEvents();
        applyStyles();
        createMeasurementSpan();
        logDebug(`Initializing Universal Engine. Detected Mobile: ${IS_MOBILE}`);
        resizeObserver = new ResizeObserver(handleResize);
        intersectionObserver = new IntersectionObserver(handleIntersection, { rootMargin: '100px 0px' });

        if (IS_MOBILE) {
            document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
            document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.body.addEventListener('touchend', handleTouchEnd);
            document.body.addEventListener('touchcancel', handleTouchEnd);
            window.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false });
            document.body.addEventListener('click', handleGlobalTap, true);
            UI.globalEditButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeOverlay) {
                    activeOverlay.classList.toggle('edit-mode-active');
                    UI.globalEditButton.classList.toggle('edit-active');
                    if (!activeOverlay.classList.contains('edit-mode-active')) {
                        activeMergeSelections.delete(activeOverlay);
                        activeOverlay.querySelectorAll('.selected-for-merge').forEach(el => el.classList.remove('selected-for-merge'));
                    } else {
                        updateEditActionBar(activeOverlay);
                    }
                }
            });
        } else {
            setInterval(periodicCleanup, 5000);
            window.addEventListener('keydown', handleModifierKeyDown);
            window.addEventListener('keyup', handleModifierKeyUp);
            window.addEventListener('blur', () => document.body.classList.remove('ocr-edit-mode-active'));
        }

        UI.serverUrlInput.value = settings.ocrServerUrl;
        UI.ankiUrlInput.value = settings.ankiConnectUrl;
        UI.ankiFieldInput.value = settings.ankiImageField;
        UI.accentColorSelect.value = settings.accentColor;
        UI.textOrientationSelect.value = settings.textOrientation;
        UI.soloHoverCheckbox.checked = settings.soloHoverMode;
        UI.autoMergeEnabledCheckbox.checked = settings.autoMergeEnabled;

        if (IS_MOBILE) {
            UI.activationModeSelect.value = settings.activationMode;
            UI.brightnessModeSelect.value = settings.brightnessMode;
        } else {
            UI.interactionModeSelect.value = settings.interactionMode;
            UI.mergeKeyInput.value = settings.mergeModifierKey;
            UI.deleteKeyInput.value = settings.deleteModifierKey;
        }

        UI.dimmedOpacityInput.value = settings.dimmedOpacity * 100;
        UI.focusScaleMultiplierInput.value = settings.focusScaleMultiplier;
        UI.fontMultiplierHorizontalInput.value = settings.fontMultiplierHorizontal;
        UI.fontMultiplierVerticalInput.value = settings.fontMultiplierVertical;
        UI.autoMergeDistKInput.value = settings.autoMergeDistK;
        UI.autoMergeFontRatioInput.value = settings.autoMergeFontRatio;
        UI.autoMergeOverlapMinInput.value = settings.autoMergeOverlapMin;
        UI.autoMergeMinLineRatioInput.value = settings.autoMergeMinLineRatio;
        UI.autoMergeFontRatioForMixedInput.value = settings.autoMergeFontRatioForMixed;
        UI.autoMergeMixedMinOverlapRatioInput.value = settings.autoMergeMixedMinOverlapRatio;
        UI.imageServerUserInput.value = settings.imageServerUser || '';
        UI.imageServerPasswordInput.value = settings.imageServerPassword || '';
        UI.debugModeCheckbox.checked = settings.debugMode;
        UI.sitesConfigTextarea.value = settings.sites.map(s => [s.urlPattern, ...(s.imageContainerSelectors || []), s.contentRootSelector].filter(Boolean).join('; ')).join('\n');

        reinitializeScript();
    }

    init().catch(e => console.error(`[OCR Universal] Fatal Error: ${e.message}`));

})();
