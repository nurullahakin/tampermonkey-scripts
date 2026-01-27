// ==UserScript==
// @name         GitHub Scroll Boxes
// @namespace    https://github.com/nurullahakin
// @version      2026-01-27
// @description  Create arbitrary scroll boxes in GitHub issues by placing special markers in the issue body.
// @author       Nurullah Akın
// @match        https://github.com/*/*/issues/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    function isScrollContainerMarker(el) {
        return ["--scroll-box--", "--scroll-container--"].includes(el.textContent.trim());
    }

    let issueBodyEl = document.querySelector("#issue-body-viewer");

    let scrollContainerMarkerEls = [];

    let scrollContainerMarkerElCandidates = issueBodyEl.querySelectorAll("p");
    for (let candEl of scrollContainerMarkerElCandidates) {
        if (isScrollContainerMarker(candEl)) {
            scrollContainerMarkerEls.push(candEl);
        }
    }

    if (scrollContainerMarkerEls.length == 0) {
        return;
    }

    let scrollContainerEl = document.createElement("div");
    scrollContainerEl.className = "scroll-container";

    let customStyleText = `
    .scroll-container {
        max-height: 60vh;
        overflow: auto;
        background-color: hsl(0, 0%, 0%, 0.025);
    }
    .scroll-container [class*="TaskListItems-module__task-list-item--"] > div.position-relative,
    .scroll-container [class*="TaskListItems-module__bullet-task-item--"] > div.position-relative {
        margin-right: 0 !important;
    }
`;
    let customStyleEl = document.createElement("style");
    customStyleEl.textContent = customStyleText;
    document.head.append(customStyleEl);

    scrollContainerMarkerEls[0].replaceWith(scrollContainerEl);

    while (!isScrollContainerMarker(scrollContainerEl.nextElementSibling)) {
        scrollContainerEl.append(scrollContainerEl.nextElementSibling);
    }

    if (isScrollContainerMarker(scrollContainerEl.nextElementSibling)) {
        scrollContainerEl.nextElementSibling.remove();
    }
})();
