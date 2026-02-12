// ==UserScript==
// @name         PR Commits List
// @namespace    https://github.com/nurullahakin
// @version      2025-09-29
// @description  Visible commits list on PR commit diffs
// @author       Nurullah Akın
// @match        https://github.com/*/*/pull/*/changes/*
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

async function improveUI() {
    let commitsToolbar = document.querySelector("[class*='PullRequestFilesToolbar-module__toolbar__']");
    let filesContainer = document.querySelector("[class*='DiffComparisonViewer-module__Pane__']");
    let diffContainer = document.querySelector("[class*='DiffComparisonViewer-module__Content__']");

    let newContainer = document.createElement("div");
    newContainer.id = "new-container";

    commitsToolbar.after(newContainer);
    newContainer.appendChild(filesContainer);
    newContainer.appendChild(diffContainer);

    let style = document.createElement("style");
    style.textContent = `
        #new-container {
            flex-wrap: wrap;
            flex: 100%;
            max-width: 100%;
            display: flex;
        }
        #commits-list {
            box-shadow: none;
            margin-right: 1rem;
            border: 1px solid hsl(0deg 0% 0% / 15%);
            border-radius: 0;
            border-top: none;
            height: calc(100vh - 350px);
            position: sticky;
            top: 62px;
        }
    `;
    newContainer.append(style);

    let dialogXPath = "/html/body/div[1]/div[1]/div/div/div";
    let dialogEl = getElementByXpath(dialogXPath);
    if (!dialogEl) {
        let commitsDialogButton = getElementByXpath(
            "/html/body/div[1]/div[6]/div/main/turbo-frame/div/react-app/div/div/div/div/div/section/div[1]/div[3]/button",
        );
        if (commitsDialogButton) {
            commitsDialogButton.click();
            await sleep(500);
        }
        dialogEl = getElementByXpath(dialogXPath);
        getElementByXpath("/html/body/div[1]/div[1]/div/div/div/div[1]/div/button")?.click();
        document.body.removeAttribute("data-dialog-scroll-disabled");
    }
    let dialogCopyEl = dialogEl.cloneNode(true);
    dialogCopyEl.id = "commits-list";
    dialogCopyEl.querySelector("[class*='SimpleSelect-module__Footer__']")?.remove();
    newContainer.prepend(dialogCopyEl);
}

// #endregion

// #region ==================== UTILS

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

window.getElementByXpath = getElementByXpath;

// #endregion
