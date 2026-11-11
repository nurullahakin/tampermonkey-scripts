// ==UserScript==
// @name         GitHub - Scroll Boxes
// @namespace    https://github.com/nurullahakin
// @version      2026-01-27
// @description  Create arbitrary scroll boxes in GitHub issues by placing special markers in the issue body.
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
            .scroll-container {
                max-height: 50vh;
                overflow: auto;
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
            .scroll-container pre {
                background-color: hsl(210deg 28% 96%);
            }
            @media (prefers-color-scheme: dark) {
                .scroll-container {
                    background-color: hsl(0, 0%, 100%, 0.05);
                }
                .scroll-container pre {
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

    function getScrollContainerMarkerEls() {
        let issueBodyEl = document.querySelector("#issue-body-viewer, .timeline-comment-header + div");
        let scrollContainerMarkerEls = [];
        if (!issueBodyEl) {
            return scrollContainerMarkerEls;
        }
        let scrollContainerMarkerElCandidates = issueBodyEl.querySelectorAll("p");
        for (let candEl of scrollContainerMarkerElCandidates) {
            if (isScrollContainerMarker(candEl)) {
                scrollContainerMarkerEls.push(candEl);
            }
        }
        return scrollContainerMarkerEls;
    }

    function renderScrollContainers() {
        // Re-add styles if they were removed after the containers were rendered.
        if (document.querySelector(".scroll-container")) {
            injectCustomStyles();
        }

        let scrollContainerMarkerEls = getScrollContainerMarkerEls();
        if (scrollContainerMarkerEls.length == 0) {
            return;
        }

        injectCustomStyles();

        let scrollContainerMarkers = chunk(scrollContainerMarkerEls, 2);

        for (let markerEls of scrollContainerMarkers) {
            let scrollContainerEl = document.createElement("div");
            scrollContainerEl.className = "scroll-container";

            markerEls[0].replaceWith(scrollContainerEl);

            while (!isScrollContainerMarker(scrollContainerEl.nextElementSibling)) {
                scrollContainerEl.append(scrollContainerEl.nextElementSibling);
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
