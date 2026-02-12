// ==UserScript==
// @name         PR Commits List
// @namespace    https://github.com/nurullahakin
// @version      2025-09-29
// @description  Visible commits list on PR commit diffs
// @author       Nurullah Akın
// @match        https://github.com/*/*/pull/*/commits/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    let loaded = false;
    window.addEventListener("load", function () {
        if (loaded) return;
        loaded = true;
        main();
    });
    setTimeout(() => {
        if (loaded) return;
        loaded = true;
        main();
    }, 5000);
})();

// #region ==================== MAIN

function main() {
    improveUI();
}

// #endregion

// #region ==================== IMPROVE UI

function improveUI() {}

// #endregion

// #region ==================== UTILS

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// #endregion
