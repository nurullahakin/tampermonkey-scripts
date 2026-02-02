// ==UserScript==
// @name         GitHub Scroll Boxes
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
        document.head.append(customStyleEl);
    }

    function getScrollContainerMarkerEls() {
        let issueBodyEl = document.querySelector("#issue-body-viewer, .timeline-comment-header + div");
        let scrollContainerMarkerEls = [];
        let scrollContainerMarkerElCandidates = issueBodyEl.querySelectorAll("p");
        for (let candEl of scrollContainerMarkerElCandidates) {
            if (isScrollContainerMarker(candEl)) {
                scrollContainerMarkerEls.push(candEl);
            }
        }
        return scrollContainerMarkerEls;
    }

    function handleAutoRender() {
        let issueBodyEl = document.querySelector("#issue-body-viewer, .timeline-comment-header + div");
        let checkboxes = issueBodyEl.querySelectorAll("input[type=checkbox]");
        for (let checkbox of checkboxes) {
            if (checkbox.isClickListenerAdded) {
                continue;
            }
            checkbox.addEventListener("click", () => {
                setTimeout(() => {
                    renderScrollContainers();
                    setTimeout(() => {
                        renderScrollContainers();
                    }, 1000);
                }, 1000);
            });
            checkbox.isClickListenerAdded = true;
        }
    }

    function renderScrollContainers() {
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

        handleAutoRender();
    }

    renderScrollContainers();
})();
