// ==UserScript==
// @name         GitHub - Scroll Boxes
// @namespace    https://github.com/nurullahakin
// @version      2026-11-16
// @description  Create arbitrary scroll boxes in GitHub issues/PRs by placing special markers in the body or comments.
// @author       Nurullah Akın
// @match        https://github.com/*/*/issues/*
// @match        https://github.com/*/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    if (location.href.match(/\/pull\/\d+\/.+/)) {
        return;
    }

    function chunk(arr, size) {
        const result = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    }

    function isScrollContainerMarker(el) {
        return /^-+ *scroll-(?:box|container) *-+$/.test(el.textContent.trim());
    }

    function injectCustomStyles() {
        if (document.querySelector("#scroll-box-styles")) {
            return;
        }
        let customStyleText = `
            .scroll-box-wrapper {
                position: relative;
            }
            .scroll-box-copy-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 1;
                display: none;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                padding: 0;
                border: 1px solid var(--borderColor-default, #d1d9e0);
                border-radius: 6px;
                background-color: var(--bgColor-default, #fff);
                color: var(--fgColor-muted, #59636e);
                cursor: pointer;
            }
            .scroll-box-wrapper.has-overflow .scroll-box-copy-btn {
                display: flex;
            }
            .scroll-box-copy-btn:hover {
                background-color: var(--bgColor-muted, #f6f8fa);
            }
            .scroll-box-copy-btn .octicon-check {
                display: none;
                color: var(--fgColor-success, #1a7f37);
            }
            .scroll-box-copy-btn.copied .octicon-copy {
                display: none;
            }
            .scroll-box-copy-btn.copied .octicon-check {
                display: inline-block;
            }
            /* Box visuals only apply while the content actually overflows (.has-overflow). */
            .scroll-container {
                max-height: 50vh;
                overflow: auto;
            }
            .has-overflow > .scroll-container {
                background-color: hsl(0, 0%, 0%, 0.025);
            }
            .scroll-container [class*="TaskListItems-module__task-list-item--"] > div.position-relative,
            .scroll-container [class*="TaskListItems-module__bullet-task-item--"] > div.position-relative,
            .scroll-container [class*="TaskListItems-module__task-list-item__"] > div.position-relative,
            .scroll-container [class*="TaskListItems-module__bullet-task-item__"] > div.position-relative,
            .scroll-container .task-list-item
            {
                margin-right: 0 !important;
            }
            .has-overflow > .scroll-container pre {
                background-color: hsl(210deg 28% 96%);
            }
            @media (prefers-color-scheme: dark) {
                .has-overflow > .scroll-container {
                    background-color: hsl(0, 0%, 100%, 0.05);
                }
                .has-overflow > .scroll-container pre {
                    background-color: hsl(215deg 25% 15%);
                }
            }
        `;
        let customStyleEl = document.createElement("style");
        customStyleEl.id = "scroll-box-styles";
        customStyleEl.textContent = customStyleText;
        // Appended to <html> rather than <head>: GitHub's head merging removes unknown <style> elements.
        document.documentElement.append(customStyleEl);
    }

    // Returns marker pairs found in the issue/PR body and all comments. Markers are paired
    // per parent element, so an unpaired marker in one comment never swallows another's content.
    function getScrollContainerMarkerPairs() {
        let bodyEls = document.querySelectorAll(
            "#issue-body-viewer, .timeline-comment-header + div, .comment-body, .markdown-body"
        );
        let markerElsByParent = new Map();
        let seenEls = new Set();
        for (let bodyEl of bodyEls) {
            for (let candEl of bodyEl.querySelectorAll("p")) {
                if (seenEls.has(candEl) || !isScrollContainerMarker(candEl)) {
                    continue;
                }
                seenEls.add(candEl);
                let parentEl = candEl.parentElement;
                if (!markerElsByParent.has(parentEl)) {
                    markerElsByParent.set(parentEl, []);
                }
                markerElsByParent.get(parentEl).push(candEl);
            }
        }
        let pairs = [];
        for (let markerEls of markerElsByParent.values()) {
            for (let pair of chunk(markerEls, 2)) {
                if (pair.length == 2) {
                    pairs.push(pair);
                }
            }
        }
        return pairs;
    }

    const COPY_ICON =
        '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor" class="octicon octicon-copy"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';
    const CHECK_ICON =
        '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor" class="octicon octicon-check"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>';

    function createCopyButton(scrollContainerEl) {
        let buttonEl = document.createElement("button");
        buttonEl.type = "button";
        buttonEl.className = "scroll-box-copy-btn";
        buttonEl.setAttribute("aria-label", "Copy");
        buttonEl.title = "Copy";
        buttonEl.innerHTML = COPY_ICON + CHECK_ICON;
        let resetTimer;
        buttonEl.addEventListener("click", async () => {
            await navigator.clipboard.writeText(scrollContainerEl.innerText.trim());
            buttonEl.classList.add("copied");
            buttonEl.setAttribute("aria-label", "Copied!");
            buttonEl.title = "Copied!";
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                buttonEl.classList.remove("copied");
                buttonEl.setAttribute("aria-label", "Copy");
                buttonEl.title = "Copy";
            }, 2000);
        });
        return buttonEl;
    }

    function renderScrollContainers() {
        // Re-add styles if they were removed after the containers were rendered.
        if (document.querySelector(".scroll-container")) {
            injectCustomStyles();
        }

        let scrollContainerMarkers = getScrollContainerMarkerPairs();
        if (scrollContainerMarkers.length == 0) {
            return;
        }

        injectCustomStyles();

        for (let markerEls of scrollContainerMarkers) {
            let wrapperEl = document.createElement("div");
            wrapperEl.className = "scroll-box-wrapper";
            let scrollContainerEl = document.createElement("div");
            scrollContainerEl.className = "scroll-container";
            let copyButtonEl = createCopyButton(scrollContainerEl);
            wrapperEl.append(scrollContainerEl, copyButtonEl);
            // Show the box only while its content overflows, and keep the button clear of the
            // vertical scrollbar. The content box shrinks when a scrollbar appears, so the
            // observer also fires on scrollbar changes.
            new ResizeObserver(() => {
                let hasOverflow =
                    scrollContainerEl.scrollHeight > scrollContainerEl.clientHeight ||
                    scrollContainerEl.scrollWidth > scrollContainerEl.clientWidth;
                wrapperEl.classList.toggle("has-overflow", hasOverflow);
                let scrollbarWidth = scrollContainerEl.offsetWidth - scrollContainerEl.clientWidth;
                copyButtonEl.style.right = `${8 + scrollbarWidth}px`;
            }).observe(scrollContainerEl);

            markerEls[0].replaceWith(wrapperEl);

            while (wrapperEl.nextElementSibling && wrapperEl.nextElementSibling !== markerEls[1]) {
                scrollContainerEl.append(wrapperEl.nextElementSibling);
            }

            markerEls[1].remove();
        }
    }

    // GitHub re-renders the issue/PR body (hydration, checkbox toggles, edits), which reverts
    // the containers. Re-render on every DOM change, and re-check a few times after load.
    let isRenderScheduled = false;
    function scheduleRender() {
        if (isRenderScheduled) {
            return;
        }
        isRenderScheduled = true;
        requestAnimationFrame(() => {
            isRenderScheduled = false;
            renderScrollContainers();
        });
    }

    new MutationObserver(scheduleRender).observe(document.documentElement, {
        childList: true,
        subtree: true,
    });

    renderScrollContainers();
    for (let delay of [500, 1000, 2000, 4000]) {
        setTimeout(renderScrollContainers, delay);
    }
})();
